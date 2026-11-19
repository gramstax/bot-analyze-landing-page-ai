import {afterEach, describe, expect, it} from "bun:test"
import {Analyzer} from "../src/lib/analyzer"
import {OpenAIClient} from "../src/lib/openai"
import {Scraper} from "../src/lib/scraper"

const MOCK_ENV: NodeJS.ProcessEnv = {...process.env, ANALYZE_MOCK_AI: `1`, OPENAI_API_KEY: ``}

describe(`Analyzer.parseRoast`, () => {
  it(`splits a Roast + numbered Recommendations reply`, () => {
    const text = `Roast: Your headline is asleep.\n\nRecommendations:\n1. Rewrite the headline to name the outcome.\n2. Add proof under the hero.\n3. One call to action, repeated.`
    const {roast, recommendations} = Analyzer.parseRoast(text)
    expect(roast).toContain(`headline is asleep`)
    expect(recommendations).toEqual([
      `Rewrite the headline to name the outcome.`,
      `Add proof under the hero.`,
      `One call to action, repeated.`,
    ])
  })

  it(`keeps the whole text as roast when there is no list`, () => {
    const {roast, recommendations} = Analyzer.parseRoast(`Just a roast, no list here.`)
    expect(roast).toBe(`Just a roast, no list here.`)
    expect(recommendations).toEqual([])
  })

  it(`caps recommendations at 10`, () => {
    const list = Array.from({length: 12}, (_, i) => `${i + 1}. Tip ${i + 1}.`).join(`\n`)
    const {recommendations} = Analyzer.parseRoast(`Roast: x.\n\nRecommendations:\n${list}`)
    expect(recommendations.length).toBe(10)
    expect(recommendations[9]).toBe(`Tip 10.`)
  })

  it(`parses the live-model shape: markdown roast headings + a CRO Ideas checklist`, () => {
    const text = [
      `## The Roast`,
      ``,
      `### 1. **Headline Hiccup**`,
      `Your headline is bland and SEO-driven.`,
      `### 2. **Hero Area Overload**`,
      `Too much text, no proof.`,
      `## 10 Personalised CRO Ideas (No Generic Stuff)`,
      `### Quick Implementation Checklist`,
      `1. **Hero**`,
      `   - Replace with headline + sub-headline + video.`,
      `2. **Trust and Social Proof**`,
      `   - Add a logo carousel under the hero.`,
      `3. **Feature Cards**`,
      `   - Redesign the list into 4 benefit-led cards.`,
    ].join(`\n`)
    const {roast, recommendations} = Analyzer.parseRoast(text)
    // The roast keeps its own numbered headings; they are NOT the tips.
    expect(roast).toContain(`1. Headline Hiccup`)
    expect(roast).toContain(`2. Hero Area Overload`)
    expect(roast).not.toContain(`**`)
    expect(roast).not.toContain(`##`)
    expect(recommendations).toEqual([
      `Hero - Replace with headline + sub-headline + video.`,
      `Trust and Social Proof - Add a logo carousel under the hero.`,
      `Feature Cards - Redesign the list into 4 benefit-led cards.`,
    ])
  })

  it(`parses a bulleted recommendations list as a fallback`, () => {
    const text = `Roast: the page is vague.\n\nRecommendations:\n- Rewrite the headline around the outcome.\n- Add proof under the hero.`
    const {recommendations} = Analyzer.parseRoast(text)
    expect(recommendations).toEqual([`Rewrite the headline around the outcome.`, `Add proof under the hero.`])
  })

  it(`strips markdown bold and heading markers from the roast`, () => {
    const {roast} = Analyzer.parseRoast(`## The Roast\n\n**Bold claim** and *italic* words.`)
    expect(roast).toBe(`Bold claim and italic words.`)
  })
})

describe(`Analyzer.splitText`, () => {
  it(`returns one chunk for short text`, () => {
    expect(Analyzer.splitText(`hello`)).toEqual([`hello`])
  })

  it(`splits long text into chunks under the limit`, () => {
    const para = `word `.repeat(500).trim()
    const text = [para, para, para].join(`\n\n`)
    const chunks = Analyzer.splitText(text, 1000)
    expect(chunks.length).toBeGreaterThan(1)
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(1000)
    expect(chunks.join(` `).replace(/\s+/g, ` `)).toBe(text.replace(/\s+/g, ` `))
  })
})

describe(`Analyzer.groupItems`, () => {
  it(`numbers items and groups them under the limit`, () => {
    const items = Array.from({length: 10}, (_, i) => `Tip ${i + 1} `.repeat(20).trim())
    const groups = Analyzer.groupItems(items, 1000)
    expect(groups.flat()).toHaveLength(10)
    expect(groups.flat()[0]).toMatch(/^1\. Tip 1/)
    for (const g of groups) expect(g.join(`\n\n`).length).toBeLessThanOrEqual(1000)
  })
})

describe(`Analyzer.mockResult`, () => {
  it(`returns a roast + exactly 10 recommendations for the host`, () => {
    const r = Analyzer.mockResult(`https://yuzuu.co/`, `yuzuu.co`)
    expect(r.kind).toBe(`ok`)
    expect(r.via).toBe(`mock`)
    expect(r.roast).toContain(`yuzuu.co`)
    expect(r.recommendations.length).toBe(10)
    expect(new Set(r.recommendations).size).toBe(10)
  })
})

describe(`Analyzer.analyze`, () => {
  const realFetch = Scraper.fetchFn
  const realLookup = Scraper.dnsLookup
  const realAiFetch = OpenAIClient.fetchFn
  afterEach(() => {
    Scraper.fetchFn = realFetch
    Scraper.dnsLookup = realLookup
    OpenAIClient.fetchFn = realAiFetch
  })

  it(`mock mode answers without any network`, async () => {
    let called = false
    Scraper.fetchFn = (async () => {
      called = true
      return new Response(``, {status: 200})
    }) as unknown as typeof fetch
    const r = await Analyzer.analyze(`https://yuzuu.co/`, MOCK_ENV)
    expect(r.kind).toBe(`ok`)
    expect(r.via).toBe(`mock`)
    expect(r.recommendations.length).toBe(10)
    expect(called).toBe(false)
  })

  it(`rejects a bad URL without fetching`, async () => {
    const r = await Analyzer.analyze(`not a url`, MOCK_ENV)
    expect(r.kind).toBe(`invalid`)
    expect(r.code).toBe(`invalid-url`)
  })

  it(`live path: scrapes, asks the model, parses roast + 10 tips`, async () => {
    Scraper.fetchFn = (async () =>
      new Response(`<html><head><title>Acme</title></head><body><h1>Ship faster</h1><p>We help teams launch.</p></body></html>`, {
        status: 200,
        headers: {"Content-Type": `text/html`},
      })) as unknown as typeof fetch
    Scraper.dnsLookup = async () => [{address: `93.184.216.34`}]
    const modelReply = `Roast: The headline is vague.\n\nRecommendations:\n1. Name the outcome in the headline.\n2. Add proof under the hero.\n3. One CTA everywhere.\n4. Cut the first screen to one job.\n5. Add a what-you-get strip.\n6. Outcome bullets, not features.\n7. Risk-reversal by the button.\n8. Sticky header with the CTA.\n9. Show a real screenshot.\n10. Close with the same promise.`
    OpenAIClient.fetchFn = (async () =>
      new Response(JSON.stringify({choices: [{message: {role: `assistant`, content: modelReply}}]}), {status: 200})) as unknown as typeof fetch
    const env = {...process.env, ANALYZE_MOCK_AI: ``, OPENAI_API_KEY: `test-key`, OPENAI_MODEL: `gpt-4o-mini`}
    const r = await Analyzer.analyze(`https://example.com/`, env)
    expect(r.kind).toBe(`ok`)
    expect(r.via).toBe(`openai`)
    expect(r.title).toBe(`Acme`)
    expect(r.roast).toContain(`headline is vague`)
    expect(r.recommendations.length).toBe(10)
    expect(r.recommendations[0]).toContain(`Name the outcome`)
  })

  it(`live path: a fetch failure becomes fetch-error, never fake content`, async () => {
    Scraper.fetchFn = (async () => new Response(`gone`, {status: 404, headers: {"Content-Type": `text/html`}})) as unknown as typeof fetch
    Scraper.dnsLookup = async () => [{address: `93.184.216.34`}]
    const env = {...process.env, ANALYZE_MOCK_AI: ``, OPENAI_API_KEY: `test-key`, OPENAI_MODEL: `gpt-4o-mini`}
    const r = await Analyzer.analyze(`https://example.com/missing`, env)
    expect(r.kind).toBe(`fetch-error`)
    expect(r.roast).toBe(``)
    expect(r.recommendations).toEqual([])
  })
})
