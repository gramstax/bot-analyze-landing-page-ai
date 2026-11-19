import {beforeEach, describe, expect, it} from "bun:test"
import {analyzeEnUser, analyzeUser, bot, e2e, resetEnv, startUser} from "./setup"

const intent = `analyze`

function sendMessages() {
  return e2e.calls.filter((c) => c.method === `sendMessage`)
}

beforeEach(async () => {
  e2e.clearCalls()
  await resetEnv()
})

describe(`E2E: AnalyzePage`, () => {
  it(`/analyze <url> returns a roast + exactly 10 recommendations (Indonesian)`, async () => {
    const responses = await e2e.sendText(`/analyze https://yuzuu.co/`, analyzeUser)
    expect(responses.length).toBeGreaterThan(0)
    expect(e2e.calls.some((c) => c.method === `sendChatAction`)).toBe(true)
    const sends = sendMessages()
    expect(sends.length).toBe(2)
    expect(e2e.extractText(sends[0]!)).toContain(`yuzuu.co`)
    expect(e2e.extractText(sends[1]!)).toContain(`10 cara memperbaikinya`)
    expect(e2e.extractText(sends[1]!)).toContain(`1. `)
    expect(e2e.extractText(sends[1]!)).toContain(`10. `)
    // The analysis is saved to the user's history.
    expect(bot.db.analyses.list(4401).length).toBe(1)
    expect(bot.db.analyses.list(4401)[0]!.url).toBe(`https://yuzuu.co/`)
  })

  it(`/analyze <url> renders the English header for an en user`, async () => {
    await e2e.sendText(`/analyze https://example.com/`, analyzeEnUser)
    const sends = sendMessages()
    expect(sends.length).toBe(2)
    expect(e2e.extractText(sends[1]!)).toContain(`10 ways to fix it`)
  })

  it(`a bare URL in free text is analyzed`, async () => {
    await e2e.sendText(`https://example.com/`, analyzeUser)
    const sends = sendMessages()
    expect(sends.length).toBe(2)
    expect(e2e.extractText(sends[0]!)).toContain(`example.com`)
  })

  it(`/analyze without an argument shows the prompt`, async () => {
    const responses = await e2e.sendText(`/analyze`, analyzeUser)
    expect(responses.length).toBeGreaterThan(0)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(e2e.gmsg(intent, `default`, {state: `prompt`, url: ``, code: ``}, `id`))
  })

  it(`free text that is not a URL shows the prompt, not an error`, async () => {
    const responses = await e2e.sendText(`hello there`, analyzeUser)
    expect(responses.length).toBeGreaterThan(0)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toContain(`Analisis landing page`)
  })

  it(`an invalid URL is refused honestly, with no fake analysis`, async () => {
    const responses = await e2e.sendText(`/analyze not a url`, analyzeUser)
    expect(responses.length).toBeGreaterThan(0)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(e2e.gmsg(intent, `default`, {state: `invalid`, url: `not a url`, code: `invalid-url`}, `id`))
    expect(bot.db.analyses.list(4401).length).toBe(0)
  })

  it(`a localhost URL is refused by the SSRF guard`, async () => {
    const responses = await e2e.sendText(`/analyze http://localhost:3000/admin`, analyzeUser)
    expect(responses.length).toBeGreaterThan(0)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(e2e.gmsg(intent, `default`, {state: `invalid`, url: `http://localhost:3000/admin`, code: `blocked-host`}, `id`))
    expect(bot.db.analyses.list(4401).length).toBe(0)
  })

  it(`the Analyze button on /start opens the prompt`, async () => {
    await e2e.sendText(`/start`, startUser)
    e2e.clearCalls()
    const responses = await e2e.sendCallbackQuery(`analyze`, analyzeUser)
    expect(responses.length).toBeGreaterThan(0)
    const reply = responses[0]!
    expect(reply.method).toBe(`editMessageText`)
    expect(e2e.extractText(reply)).toContain(`Analisis landing page`)
  })
})
