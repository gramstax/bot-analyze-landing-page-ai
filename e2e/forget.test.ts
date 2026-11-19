import {beforeEach, describe, expect, it} from "bun:test"
import {bot, e2e, forgetUser, resetEnv} from "./setup"

const intent = `forget`

beforeEach(async () => {
  e2e.clearCalls()
  await resetEnv()
})

describe(`E2E: ForgetPage`, () => {
  it(`clears the user's recent analyses and confirms`, async () => {
    await e2e.sendText(`/analyze https://example.com/`, forgetUser)
    expect(bot.db.analyses.list(4901).length).toBe(1)
    e2e.clearCalls()
    const responses = await e2e.sendText(`/forget`, forgetUser)
    expect(responses.length).toBeGreaterThan(0)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(e2e.gmsg(intent, `default`, {}, `id`))
    expect(bot.db.analyses.list(4901).length).toBe(0)
  })

  it(`after /forget, a new analysis starts a fresh history`, async () => {
    await e2e.sendText(`/analyze https://example.com/`, forgetUser)
    await e2e.sendText(`/forget`, forgetUser)
    e2e.clearCalls()
    await e2e.sendText(`/analyze https://yuzuu.co/`, forgetUser)
    expect(bot.db.analyses.list(4901).length).toBe(1)
    expect(bot.db.analyses.list(4901)[0]!.url).toBe(`https://yuzuu.co/`)
  })
})
