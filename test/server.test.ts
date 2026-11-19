import {afterEach, describe, expect, it} from "bun:test"
import {handleRequest} from "../src/server"

describe(`HTTP endpoint POST /analyze`, () => {
  const prevMock = process.env.ANALYZE_MOCK_AI
  const prevKey = process.env.OPENAI_API_KEY
  afterEach(() => {
    if (prevMock === undefined) delete process.env.ANALYZE_MOCK_AI
    else process.env.ANALYZE_MOCK_AI = prevMock
    if (prevKey === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = prevKey
  })

  it(`GET /health answers ok`, async () => {
    const res = await handleRequest(new Request(`http://127.0.0.1/health`))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ok: true})
  })

  it(`GET / describes the service`, async () => {
    const res = await handleRequest(new Request(`http://127.0.0.1/`))
    expect(res.status).toBe(200)
    const body = (await res.json()) as {endpoints: {analyze: string}}
    expect(body.endpoints.analyze).toContain(`POST /analyze`)
  })

  it(`POST /analyze returns roast + 10 recommendations in mock mode`, async () => {
    process.env.ANALYZE_MOCK_AI = `1`
    process.env.OPENAI_API_KEY = ``
    const res = await handleRequest(
      new Request(`http://127.0.0.1/analyze`, {
        method: `POST`,
        headers: {"Content-Type": `application/json`},
        body: JSON.stringify({url: `https://yuzuu.co/`}),
      }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {url: string; host: string; title: string; roast: string; recommendations: string[]; via: string}
    expect(body.url).toBe(`https://yuzuu.co/`)
    expect(body.host).toBe(`yuzuu.co`)
    expect(body.via).toBe(`mock`)
    expect(body.roast).toContain(`yuzuu.co`)
    expect(body.recommendations.length).toBe(10)
  })

  it(`POST /analyze rejects a missing url`, async () => {
    const res = await handleRequest(
      new Request(`http://127.0.0.1/analyze`, {
        method: `POST`,
        headers: {"Content-Type": `application/json`},
        body: JSON.stringify({}),
      }),
    )
    expect(res.status).toBe(400)
    expect((await res.json()) as {error: string}).toEqual({error: `url-required`})
  })

  it(`POST /analyze rejects an invalid URL`, async () => {
    process.env.ANALYZE_MOCK_AI = `1`
    const res = await handleRequest(
      new Request(`http://127.0.0.1/analyze`, {
        method: `POST`,
        headers: {"Content-Type": `application/json`},
        body: JSON.stringify({url: `not a url`}),
      }),
    )
    expect(res.status).toBe(400)
    expect(((await res.json()) as {error: string}).error).toBe(`invalid-url`)
  })

  it(`POST /analyze rejects a localhost URL (SSRF guard)`, async () => {
    process.env.ANALYZE_MOCK_AI = `1`
    const res = await handleRequest(
      new Request(`http://127.0.0.1/analyze`, {
        method: `POST`,
        headers: {"Content-Type": `application/json`},
        body: JSON.stringify({url: `http://localhost:3000/admin`}),
      }),
    )
    expect(res.status).toBe(400)
    expect(((await res.json()) as {error: string}).error).toBe(`blocked-host`)
  })

  it(`unknown routes are 404`, async () => {
    const res = await handleRequest(new Request(`http://127.0.0.1/nope`))
    expect(res.status).toBe(404)
  })
})
