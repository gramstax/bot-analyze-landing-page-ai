import {PageBase} from "~/base/page"
import {Analyzer, type IAnalyzeResult} from "~/lib/analyzer"

/**
 * AnalyzePage — /analyze <url> + free-text URL: scrape the landing
 * page, roast it with the CRO agent, return the roast + 10 tips.
 *
 * - handleCommandText: /analyze without an argument -> prompt state.
 * - handleCommandArgsText: /analyze <url> -> full analysis.
 * - handleFreeText: a bare URL in chat -> full analysis; anything else
 *   -> prompt state (this bot only understands URLs).
 * - handleCallbackQueryData: the Analyze button on /start -> prompt.
 *
 * All words live in `static template` (EN default + `lang="id"`
 * variant): one flat `<g-switch value="state">` for the non-ok states,
 * plus the `roast` and `recs` bases that send the result in chunks
 * (Telegram caps a message at 4096 chars). The page only computes data
 * (state, code, chunks, item groups). Strict rule (Damar 2026-11-19
 * ~14:43 WIB): no string dictionary.
 */
class Base {
  static roast = `roast`
  static recs = `recs`
}

export class AnalyzePage extends PageBase {
  static data = this.buildData()

  async handleCommandText() {
    await this.ganalyze.showPrompt()
  }

  async handleCommandArgsText() {
    await this.ganalyze.process(this.msgTextCommandArgs.join(` `))
  }

  async handleFreeText() {
    const text = this.msg?.text ?? ``
    if (!text || text.startsWith(`/`)) return
    if (/^https?:\/\//i.test(text.trim())) {
      await this.ganalyze.process(text)
      return
    }
    await this.ganalyze.showPrompt()
  }

  async handleCallbackQueryData() {
    await this.ganalyze.showPrompt()
  }

  helper = {
    typing: async () => {
      try {
        const chatId = this.chat?.id ?? this.from?.id
        if (chatId !== undefined) await this.api.sendChatAction(chatId, `typing`)
      } catch {
        // The typing indicator is cosmetic — the answer still goes through without it.
      }
    },

    /** Send one finished analysis: roast chunks, then recommendation groups. */
    sendResult: async (result: IAnalyzeResult) => {
      const userId = this.from?.id
      if (userId !== undefined && result.kind === `ok`) {
        await this.db.analyses.add(userId, Analyzer.toAnalysis(result))
      }
      const roastChunks = Analyzer.splitText(result.roast)
      for (let i = 0; i < roastChunks.length; i++) {
        await this.renderText({
          AGBaseId: Base.roast,
          data: {
            heading: i === 0 ? result.host : ``,
            roast: roastChunks[i] ?? ``,
            url: result.url,
          },
        })
      }
      const groups = Analyzer.groupItems(result.recommendations)
      for (const items of groups) {
        await this.renderText({AGBaseId: Base.recs, data: {items}})
      }
    },

    /** Render a non-ok state (prompt / invalid / fetch-error / ai-error). */
    sendState: async (state: string, url: string, code: string) => {
      await this.renderText({data: {state, url, code}})
    },
  }

  ganalyze = {
    showPrompt: async () => {
      await this.helper.sendState(`prompt`, ``, ``)
    },

    process: async (rawUrl: string) => {
      const userId = this.from?.id
      if (userId === undefined) return
      await this.helper.typing()
      const result = await Analyzer.analyze(rawUrl)
      if (result.kind !== `ok`) {
        await this.helper.sendState(result.kind, result.url, result.code ?? ``)
        return
      }
      await this.helper.sendResult(result)
    },
  }

  static template = `
    <g-base>
      <g-description>Analyze a landing page URL</g-description>
      <g-description lang="id">Analisis URL landing page</g-description>
      <g-message>
        <g-switch value="state">
          <g-case is="prompt"><b>🔍 Analyze a landing page</b>

Send me a landing page URL and I will roast it — then give you 10 concrete ways to fix it.

Example: /analyze https://yuzuu.co
Or just paste the URL here.</g-case>
          <g-case is="invalid">That does not look like a public web address. Send a full URL starting with https:// — for example /analyze https://yuzuu.co</g-case>
          <g-case is="fetch-error">I could not open that page ({{code}}). Check the URL and that the site is public, then try again.</g-case>
          <g-case is="ai-error">The AI could not finish the analysis right now. Please try again in a moment.</g-case>
          <g-default>Sorry, something went wrong while I was processing your message. Please try again in a moment.</g-default>
        </g-switch>
      </g-message>
      <g-message lang="id">
        <g-switch value="state">
          <g-case is="prompt"><b>🔍 Analisis landing page</b>

Kirim URL landing page dan aku akan me-roast-nya — lalu memberi 10 cara konkret untuk memperbaikinya.

Contoh: /analyze https://yuzuu.co
Atau tempel saja URL-nya di sini.</g-case>
          <g-case is="invalid">Itu bukan alamat web publik. Kirim URL lengkap yang diawali https:// — contoh: /analyze https://yuzuu.co</g-case>
          <g-case is="fetch-error">Aku tidak bisa membuka halaman itu ({{code}}). Periksa URL-nya dan pastikan situsnya publik, lalu coba lagi.</g-case>
          <g-case is="ai-error">AI tidak bisa menyelesaikan analisis sekarang. Silakan coba lagi sebentar lagi.</g-case>
          <g-default>Maaf, ada yang salah saat aku memproses pesanmu. Coba lagi sebentar lagi ya.</g-default>
        </g-switch>
      </g-message>
    </g-base>

    <g-base id="${Base.roast}">
      <g-message><g-ifelse>heading ? '🔥 Roast — ' + heading + '\\n\\n' : ''</g-ifelse>{{roast}}</g-message>
      <g-message lang="id"><g-ifelse>heading ? '🔥 Roast — ' + heading + '\\n\\n' : ''</g-ifelse>{{roast}}</g-message>
    </g-base>

    <g-base id="${Base.recs}">
      <g-message><b>💡 10 ways to fix it</b>

<g-map src="items" join="\n\n">{{e}}</g-map></g-message>
      <g-message lang="id"><b>💡 10 cara memperbaikinya</b>

<g-map src="items" join="\n\n">{{e}}</g-map></g-message>
    </g-base>
  `
}
