import {Analyzer} from "./lib/analyzer"
import {AppConfig} from "./lib/config"
import {LogHe} from "./helpers/log"

/**
 * Standalone HTTP endpoint for the same analysis the Telegram bot does.
 *
 * Gramstax's own status server (statusServerPort) is a fixed health
 * server with no custom routes, so the endpoint runs as a small Bun.serve
 * next to `gramstax start` — `bun run serve`. It shares Analyzer with the
 * bot, so bot and endpoint always analyze the same way.
 *
 *   POST /analyze   {"url": "https://..."} -> {"url","host","title","roast","recommendations":[...],"via":"openai"|"mock"}
 *   GET  /health    {"ok":true}
 *   GET  /          {"service": ...} (usage)
 *
 * The endpoint is unauthenticated by design: run it on localhost or
 * behind your own reverse proxy with auth. It stores nothing.
 */
const config = AppConfig.get()

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {status, headers: {"Content-Type": `application/json`}})
}

export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url)
  if (req.method === `GET` && url.pathname === `/health`) return json({ok: true})
  if (req.method === `GET` && url.pathname === `/`) {
    return json({service: `bot-analyze-landing-page-ai`, endpoints: {analyze: `POST /analyze {"url": "https://..."}`, health: `GET /health`}})
  }
  if (req.method === `POST` && url.pathname === `/analyze`) {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return json({error: `invalid-json`}, 400)
    }
    const input = (body as {url?: unknown} | null)?.url
    if (typeof input !== `string` || input.trim() === ``) return json({error: `url-required`}, 400)
    const result = await Analyzer.analyze(input)
    if (result.kind !== `ok`) return json({error: result.code ?? result.kind, url: result.url}, result.kind === `invalid` ? 400 : 502)
    return json({url: result.url, host: result.host, title: result.title, roast: result.roast, recommendations: result.recommendations, via: result.via})
  }
  return json({error: `not-found`}, 404)
}

if (import.meta.main) {
  const port = config.analyzePort
  const server = Bun.serve({port, fetch: handleRequest})
  LogHe.info(`[analyze] HTTP endpoint listening on http://127.0.0.1:${server.port} (POST /analyze)`)
}
