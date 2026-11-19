import {AppConfig} from "./config"
import {OpenAIClient, type IChatMessage} from "./openai"
import {ScrapeError, Scraper, type IFetchedPage} from "./scraper"
import type {IAnalysis} from "~/types/analyze"

/**
 * The CRO agent: scrape a landing page, roast it, return 10 fixes.
 *
 * The system prompt is the original workflow's agent prompt (a
 * professional CRO expert who roasts the page, then gives EXACTLY 10
 * specific, personalized, creative, non-trivial, impactful,
 * easy-to-implement ideas). It is model-facing, not user-facing, so it
 * lives here in code — the same documented exception as the LLM prompts
 * in the sister bots (strict rule, Damar 2026-11-19 ~14:43 WIB).
 */
export const CRO_SYSTEM_PROMPT = `You are a professional expert in Conversion Rate Optimization who helps business founders & CMOs improve their landing pages. You are a world-class expert in analysing landing pages, roasting them, and providing valuable Conversion Rate Optimization Ideas to help businesses increase conversions.

GOAL
I want you to roast my landing page and deliver recommendations to improve the Conversion Rate. I will use this roast to understand what's wrong with my landing page and make improvements based on your recommendations.

ROAST STRUCTURE
This framework consists of 2 blocks of insights:
Roast: a detailed roast of my landing page.
Recommendations: 10 conversion rate optimization ideas based on your roast and analysis.

ROAST & RECOMMENDATIONS CRITERIA
For the Roast: Be friendly & casual. Talk like a human to another human.
For the Roast: Be unconventional & fun. I don't want to be bored. A roast must agitate the reader's feelings.
For the Roast: You will make a full landing page analysis, and explain what's wrong. You will use this analysis to make recommendations for The Recommendations.
For the Recommendations: Be specific. Write exactly what I need to do. Your detailed description for each Conversion Rate Optimization Idea should be self-explanatory. For example, instead of saying "Rewrite your headline", give me improved ideas for the headline. Your job is to return advanced insights personalised only for my specific landing page. This is a critical law for you.
For the Recommendations: Be creative. Don't return trivial and outdated Conversion Rate Optimization ideas that the average marketer would recommend. Prioritise unconventional CRO tactics so I get real value from you here. Think like the top 0.1% conversion rate optimization expert.
For the Recommendations: Prioritise Conversion Rate Optimization Ideas that are relevant in the 2024 digital marketing space.
For the Recommendations: Your Conversion Rate Optimization ideas must be impactful. Prioritise Conversion Rate Optimization Ideas that adds a wow effect.
For the Recommendations: Your Conversion Rate Optimization ideas must be easy to implement.
For the Recommendations: Personalise your ideas with references to the Roast you made. I don't want to read 10 generic ideas that can work for anyone (for example, "add a live chat" or "offer a free trial"). I need a 100% personalised response.`

export type AnalyzeKind = `ok` | `invalid` | `fetch-error` | `ai-error`

export interface IAnalyzeResult {
  kind: AnalyzeKind
  /** Machine-readable error code (invalid/blocked/fetch/not-html/ai). */
  code?: string
  url: string
  host: string
  title: string
  roast: string
  recommendations: string[]
  /** `openai` = live model, `mock` = ANALYZE_MOCK_AI / no key. */
  via: `openai` | `mock`
}

export class Analyzer {
  /** Telegram's message limit is 4096 chars; chunks stay safely under it. */
  static readonly CHUNK_MAX = 4000

  /** Split long text into chunks on paragraph boundaries (never mid-word). */
  static splitText(text: string, max: number = Analyzer.CHUNK_MAX): string[] {
    if (text.length <= max) return [text]
    const chunks: string[] = []
    let rest = text
    while (rest.length > max) {
      let cut = rest.lastIndexOf(`\n\n`, max)
      if (cut < max / 2) cut = rest.lastIndexOf(`\n`, max)
      if (cut < max / 2) cut = rest.lastIndexOf(` `, max)
      if (cut <= 0) cut = max
      chunks.push(rest.slice(0, cut).trim())
      rest = rest.slice(cut).trim()
    }
    if (rest !== ``) chunks.push(rest)
    return chunks
  }

  /**
   * Clean model markdown for plain-text chat: strip bold/italic markers
   * and heading hashes (Telegram shows them literally — the template
   * escapes `{{...}}` variables, so no HTML is produced here).
   */
  static cleanModelText(text: string): string {
    return text
      .replace(/^#{1,4}\s+/gm, ``)
      .replace(/\*\*([^*]+)\*\*/g, `$1`)
      .replace(/(^|[\s(])\*([^*\n]+)\*/g, `$1$2`)
      .replace(/`([^`\n]+)`/g, `$1`)
      .replace(/\n\s*[-*]\s+/g, ` - `)
      .replace(/[ \t]+/g, ` `)
      .replace(/\n{3,}/g, `\n\n`)
      .trim()
  }

  /**
   * Split a model reply into its Roast block and its numbered
   * Recommendations (1–10).
   *
   * Models do not all use the same shape: some write a plain
   * `Recommendations:` section with `1. ...` items, others a markdown
   * header like `## 10 Personalised CRO Ideas` followed by a checklist
   * (`1. **Hero**` + sub-bullets), and the roast itself may carry
   * numbered `### 1. ...` headings. So the parser finds the
   * recommendations SECTION first (a header/line mentioning
   * recommendations or CRO ideas), parses numbered items only inside
   * it, and treats everything before it as the roast.
   *
   * A reply without a recognizable list keeps the whole text as the
   * roast and zero recommendations — the caller decides how to present
   * that, never invents items.
   */
  static parseRoast(text: string): {roast: string; recommendations: string[]} {
    const cleaned = text.trim()
    const lines = cleaned.split(`\n`)
    let recStart = -1
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!
      const isHeader = /^\s*#{1,4}\s/.test(line)
      const mentionsRecs = /recommendations?/i.test(line)
      const mentionsIdeas = /cro\b[^\n]*\b(ideas?|tips?)\b/i.test(line) || /\b10\b[^\n]*\b(ideas?|tips?|fixes|improvements)\b/i.test(line)
      const plainLabel = /^\s*\*{0,2}recommendations?\s*:?\s*\*{0,2}\s*$/i.test(line)
      if (plainLabel || (isHeader && (mentionsRecs || mentionsIdeas))) {
        recStart = i
        break
      }
    }
    let roastText = cleaned
    let listPart = ``
    if (recStart >= 0) {
      roastText = lines.slice(0, recStart).join(`\n`)
      listPart = lines.slice(recStart + 1).join(`\n`)
    }
    const roast = Analyzer.cleanModelText(
      roastText
        .replace(/^\s*#{1,4}\s+[^\n]*\n/, ``)
        .replace(/^\s*roast\s*:?\s*/i, ``)
        .trim(),
    )
    if (listPart === ``) return {roast, recommendations: []}
    const items: string[] = []
    const re = /(?:^|\n)\s*(?:#{1,4}\s+)?(\d{1,2})[.)]\s+([\s\S]*?)(?=(?:\n\s*(?:#{1,4}\s+)?\d{1,2}[.)]\s)|$)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(listPart)) !== null) {
      // One tip = one line: flatten the model's internal line breaks.
      const body = Analyzer.cleanModelText(m[2] ?? ``)
        .replace(/\n+/g, ` `)
        .replace(/ +/g, ` `)
        .trim()
      if (body !== ``) items.push(body)
    }
    // Fallback: a bulleted recommendations list.
    if (items.length === 0) {
      for (const line of listPart.split(`\n`)) {
        const bullet = line.match(/^\s*[-*]\s+(.+)$/)
        if (bullet) {
          const body = Analyzer.cleanModelText(bullet[1]!)
          if (body !== ``) items.push(body)
        }
      }
    }
    return {roast, recommendations: items.slice(0, 10)}
  }

  /**
   * Group numbered recommendations into message-sized batches: each
   * group joins with a blank line and stays under `max` chars, so a
   * long list is sent as several Telegram messages, never truncated.
   */
  static groupItems(items: string[], max: number = Analyzer.CHUNK_MAX): string[][] {
    const numbered = items.map((item, i) => `${i + 1}. ${item}`)
    const groups: string[][] = []
    let current: string[] = []
    let currentLen = 0
    for (const item of numbered) {
      const add = (current.length > 0 ? 2 : 0) + item.length
      if (current.length > 0 && currentLen + add > max) {
        groups.push(current)
        current = []
        currentLen = 0
      }
      current.push(item)
      currentLen += add
    }
    if (current.length > 0) groups.push(current)
    return groups
  }

  /** Full pipeline: validate → scrape → ask the model → parse. */
  static async analyze(rawUrl: string, env: NodeJS.ProcessEnv = process.env): Promise<IAnalyzeResult> {
    const validated = Scraper.validateUrl(rawUrl)
    if (!validated.ok) {
      return {kind: `invalid`, code: validated.code, url: rawUrl.trim(), host: ``, title: ``, roast: ``, recommendations: [], via: `mock`}
    }
    const url = validated.url.toString()
    const host = validated.url.hostname
    if (AppConfig.isMock(env)) return Analyzer.mockResult(url, host)
    let page: IFetchedPage
    try {
      page = await Scraper.fetchPageText(rawUrl)
    } catch (err) {
      const code = err instanceof ScrapeError ? err.code : `fetch-error`
      return {kind: `fetch-error`, code, url, host, title: ``, roast: ``, recommendations: [], via: `mock`}
    }
    const config = AppConfig.load(env)
    const messages: IChatMessage[] = [
      {role: `system`, content: CRO_SYSTEM_PROMPT},
      {
        role: `user`,
        content:
          `Here is the content of my landing page:\n\n${page.title !== `` ? `Title: ${page.title}\n\n` : ``}${page.text}\n\n` +
          `Reply in two sections: start with "Roast:" and your roast, then a section headed "Recommendations:" with a numbered list of exactly 10 items (1. to 10.), one idea per item. ` +
          `Keep the whole reply under 1000 words: a concise roast, then the 10 recommendations, each one or two sentences.`,
      },
    ]
    let reply: string
    try {
      const {message} = await OpenAIClient.chat(config.openaiApiKey, config.openaiModel, messages, [], config.openaiBaseUrl, {
        reasoningEffort: config.openaiReasoningEffort,
      })
      reply = message.content ?? ``
    } catch {
      return {kind: `ai-error`, code: `ai-error`, url, host, title: page.title, roast: ``, recommendations: [], via: `mock`}
    }
    if (reply.trim() === ``) {
      return {kind: `ai-error`, code: `ai-error`, url, host, title: page.title, roast: ``, recommendations: [], via: `mock`}
    }
    const {roast, recommendations} = Analyzer.parseRoast(reply)
    return {kind: `ok`, url, host, title: page.title, roast, recommendations, via: `openai`}
  }

  /** Deterministic mock: a roast + exactly 10 recommendations for the host. */
  static mockResult(url: string, host: string): IAnalyzeResult {
    const roast = `Honest first impression of ${host}: the page opens without a clear promise — a visitor lands, scans, and still has to guess what they get and why they should care right now. The headline talks about the product, not about the visitor's problem, and the first screen asks for attention without earning it. Below the fold the page repeats itself instead of removing doubt: the same claims in different words, no proof close to the call to action, and nothing that makes acting now feel better than leaving and thinking about it.`
    const recommendations = [
      `Rewrite the hero headline of ${host} around the visitor's outcome — for example "Stop losing sales to a slow, confusing page — get a fix list in minutes" — and put the single most valuable promise in the first seven words.`,
      `Add one concrete proof line directly under the hero of ${host}: a real number, a real customer quote, or a before/after result, so the claim above it is believed before the visitor scrolls.`,
      `Give ${host} one primary call to action and repeat that exact button everywhere — same words, same color — instead of three different asks competing on one screen.`,
      `Cut the first screen of ${host} to one job: headline, one supporting line, one button. Move everything else below the fold.`,
      `Add a "what you get in the first minute" strip to ${host}: three short bullets that name the exact deliverable, so a skimmer understands the offer without reading.`,
      `Replace the generic feature list on ${host} with outcome bullets that each end in a result the visitor can picture — what changes for them, not what the product does.`,
      `Put a short risk-reversal next to the main button on ${host}: what happens if it does not work for them, in one plain sentence.`,
      `Add a sticky header to ${host} with the same primary button, so a visitor who scrolls down never has to hunt for how to start.`,
      `Show one real screenshot or short clip of the result on ${host} instead of a stock photo — the page currently asks for trust without showing the work.`,
      `End the page on ${host} with the same promise the hero made, plus the button one last time — close the loop instead of letting the page fade out.`,
    ]
    return {kind: `ok`, url, host, title: host, roast, recommendations, via: `mock`}
  }

  /** Convert a finished analysis to the stored history shape. */
  static toAnalysis(result: IAnalyzeResult): IAnalysis {
    return {
      url: result.url,
      host: result.host,
      title: result.title,
      roast: result.roast,
      recommendations: result.recommendations,
      createdAt: new Date().toISOString(),
    }
  }
}
