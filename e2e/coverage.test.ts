import {beforeEach, describe, expect, it} from "bun:test"
import {bot, coverageUser, deniedUser, e2e, noUsernameUser, resetEnv} from "./setup"
import type {IAnalysis} from "../src/types/analyze"

beforeEach(async () => {
  e2e.clearCalls()
  await resetEnv()
  process.env.ANALYZE_ALLOWED_IDS = ``
})

describe(`coverage: AllowList guard (hookBeforeRoute)`, () => {
  it(`denies a user not on ANALYZE_ALLOWED_IDS and explains why`, async () => {
    process.env.ANALYZE_ALLOWED_IDS = `4952`
    try {
      const responses = await e2e.sendText(`/start`, deniedUser)
      expect(responses.length).toBeGreaterThan(0)
      expect(responses[0]!.method).toBe(`sendMessage`)
      expect(e2e.extractText(responses[0]!)).toContain(`hanya melayani pengguna yang diizinkan`)
      expect(e2e.extractText(responses[0]!)).not.toContain(`aku Page Roast`)
    } finally {
      process.env.ANALYZE_ALLOWED_IDS = ``
    }
  })

  it(`allows a user on ANALYZE_ALLOWED_IDS`, async () => {
    process.env.ANALYZE_ALLOWED_IDS = `4952`
    try {
      const responses = await e2e.sendText(`/start`, coverageUser)
      const reply = e2e.lastCall(`sendMessage`)!
      expect(reply).toBeDefined()
      expect(e2e.extractText(reply)).toContain(`aku Page Roast`)
    } finally {
      process.env.ANALYZE_ALLOWED_IDS = ``
    }
  })

  it(`allows a user without a Telegram username (no username guard)`, async () => {
    const responses = await e2e.sendText(`/start`, noUsernameUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(reply).toBeDefined()
    expect(e2e.extractText(reply)).toContain(`aku Page Roast`)
  })
})

describe(`coverage: analyses history cap`, () => {
  it(`history keeps only the newest 5 analyses`, async () => {
    for (let i = 1; i <= 6; i++) {
      const a: IAnalysis = {url: `https://example.com/${i}`, host: `example.com`, title: ``, roast: `r`, recommendations: [], createdAt: new Date().toISOString()}
      await bot.db.analyses.add(4952, a)
    }
    const list = bot.db.analyses.list(4952)
    expect(list.length).toBe(5)
    expect(list[0]!.url).toBe(`https://example.com/6`)
    expect(list[4]!.url).toBe(`https://example.com/2`)
  })
})
