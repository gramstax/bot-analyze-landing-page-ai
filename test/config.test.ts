import {describe, expect, it} from "bun:test"
import {AppConfig} from "../src/lib/config"

describe(`AppConfig.load`, () => {
  it(`defaults to the o1 model and the OpenAI base URL`, () => {
    const c = AppConfig.load({} as NodeJS.ProcessEnv)
    expect(c.openaiModel).toBe(`o1`)
    expect(c.openaiBaseUrl).toBe(`https://api.openai.com/v1`)
    expect(c.openaiReasoningEffort).toBe(``)
    expect(c.analyzePort).toBe(3002)
  })

  it(`reads model, base URL, reasoning effort, and port from env`, () => {
    const c = AppConfig.load({
      OPENAI_BASE_URL: `https://text.pollinations.ai/openai/`,
      OPENAI_MODEL: `openai-fast`,
      OPENAI_REASONING_EFFORT: `high`,
      ANALYZE_PORT: `4004`,
    } as NodeJS.ProcessEnv)
    expect(c.openaiBaseUrl).toBe(`https://text.pollinations.ai/openai`)
    expect(c.openaiModel).toBe(`openai-fast`)
    expect(c.openaiReasoningEffort).toBe(`high`)
    expect(c.analyzePort).toBe(4004)
  })

  it(`falls back to port 3002 for a bad ANALYZE_PORT`, () => {
    expect(AppConfig.load({ANALYZE_PORT: `abc`} as NodeJS.ProcessEnv).analyzePort).toBe(3002)
    expect(AppConfig.load({ANALYZE_PORT: `0`} as NodeJS.ProcessEnv).analyzePort).toBe(3002)
  })
})

describe(`AppConfig.isMock`, () => {
  it(`ANALYZE_MOCK_AI=1 always mocks`, () => {
    expect(AppConfig.isMock({ANALYZE_MOCK_AI: `1`, OPENAI_API_KEY: `key`} as NodeJS.ProcessEnv)).toBe(true)
  })

  it(`a key means live`, () => {
    expect(AppConfig.isMock({OPENAI_API_KEY: `key`} as NodeJS.ProcessEnv)).toBe(false)
  })

  it(`no key + default base URL means mock`, () => {
    expect(AppConfig.isMock({} as NodeJS.ProcessEnv)).toBe(true)
  })

  it(`no key + a custom base URL means live without a key`, () => {
    expect(AppConfig.isMock({OPENAI_BASE_URL: `https://text.pollinations.ai/openai`} as NodeJS.ProcessEnv)).toBe(false)
  })
})
