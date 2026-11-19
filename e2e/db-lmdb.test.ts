import {beforeEach, describe, expect, it} from "bun:test"
import {bot, dbUser, e2e, resetEnv} from "./setup"
import type {IAnalysis} from "../src/types/analyze"

function sample(url: string): IAnalysis {
  return {url, host: `example.com`, title: ``, roast: `roast`, recommendations: [`1. Fix it.`], createdAt: new Date().toISOString()}
}

beforeEach(async () => {
  e2e.clearCalls()
  await resetEnv()
})

describe(`E2E: LMDB stores (user + analyses)`, () => {
  it(`user createIfNotExists is idempotent`, async () => {
    // data-e2e persists across runs, so the row may already exist from a
    // previous run — assert idempotency, not first-run creation.
    await bot.db.user.createIfNotExists(dbUser.user.id, {username: `dbuser`, firstName: `Db`})
    const second = await bot.db.user.createIfNotExists(dbUser.user.id, {username: `dbuser`, firstName: `Db`})
    expect(second.created).toBe(false)
    expect(second.user.username).toBe(`dbuser`)
    expect(bot.db.user.count()).toBeGreaterThan(0)
  })

  it(`analyses keep only the newest 5`, async () => {
    for (let i = 1; i <= 6; i++) {
      await bot.db.analyses.add(dbUser.user.id, sample(`https://example.com/${i}`))
    }
    const list = bot.db.analyses.list(dbUser.user.id)
    expect(list.length).toBe(5)
    expect(list[0]!.url).toBe(`https://example.com/6`)
    expect(list[4]!.url).toBe(`https://example.com/2`)
  })

  it(`analyses clear removes the history`, async () => {
    await bot.db.analyses.add(dbUser.user.id, sample(`https://example.com/1`))
    expect(bot.db.analyses.list(dbUser.user.id).length).toBe(1)
    await bot.db.analyses.clear(dbUser.user.id)
    expect(bot.db.analyses.list(dbUser.user.id).length).toBe(0)
  })

  it(`usage reports map pressure`, () => {
    const usage = bot.db.usage()
    expect(usage.total).toBeGreaterThan(0)
  })
})
