# AGENTS.md

## STRICT RECREATE RULES (Damar, 2026-11-19 — apply to this project AND every
## future recreate project, no exceptions)

1. **English only in repo content**: repo description + README.md in
   English; README follows the `create-gramstax` 6.1.0 template style
   (title + badges, Features, Quick Start, Scripts table, Project
   Structure, Configuration, Testing, Deployment, Tech Stack, License).
2. **Original-flow source lives in `references/`** (NEVER `assets/`).
   Do NOT name the original workflow tool in the repo description,
   `package.json` description, or main README.md — it is only a
   reference inside `references/` (its README + the JSON file name).
3. **README.md MUST contain a Mermaid flowchart** of this project's
   own code flow.
4. **Repo description MUST start with 1 emoji**, English. The bot is
   multilingual — NEVER "plain English" only: say "English or
   Indonesian", and the README intro + start/help templates must say
   the same.
5. **Bilingual, English by default**: every user-facing message is
   English by default AND Indonesian. Language is stored per user in
   LMDB (`UserSchema.botLang`), changed with `/language`; follow
   `gramstax-best-practices` and `lmdb-best-practices` (6.1.0).
6. **Commands are ENGLISH ONLY (Damar, 2026-11-19 ~15:22 WIB).** There
   is NO `intentCommandText` in any page's `buildData()`:
   `static data = this.buildData()` (or with a callback-args function
   where the page has one), and the command is the page name:
   `/analyze`, `/language`, `/forget` (+ `/start`, `/help`).
   Message CONTENT is still bilingual (rule 5/7) — an English command
   does NOT make the replies English-only.

   6a. **Localization is done ONLY with static template blocks**
   (`<g-message>`, `<g-message lang="id">`, `<g-switch>`,
   `<g-map>`, `<g-ifelse>`); user-facing messages live in the
   template, dynamic data is passed as template variables.
   **`src/lib/i18n.ts` is FORBIDDEN** (Damar, 2026-11-19 ~14:43 WIB)
   — it is useless. The only language helper allowed is
   `src/lib/lang.ts` (resolves the language code `en`|`id`, no
   messages). Documented exceptions, all non-user-facing: the LLM
   system prompt, model-facing tokens in `src/lib/analyzer.ts`
   (`CRO_SYSTEM_PROMPT`, `parseRoast`), and the HTTP endpoint's JSON
   error codes.
   6b. **`<g-description>` is PER PAGE** (confirmed by Damar
   2026-11-19 ~15:22 WIB): the sync reads
   `getGDescription("<page-name>", "default", lang, scope)`, so a
   description placed in `start/index.ts` would only ever sync
   `/start`. EVERY page with a command handler
   (`handleCommandText` / `handleCommandArgsText`) carries its own
   `<g-description>` block in its template's default `<g-base>`,
   in EN (default) + `lang="id"`. Pages without a command handler
   (`status.ts`) carry none. Command pages here: start, analyze,
   help, language, forget — 5 commands, 2 languages each.
   6c. **Keyboard is written ONCE** in `src/blocks/g-keyboard.ts`
   (`KeyboardGBlock.mainMenu()`), with `{default, id}` labels;
   the framework `_build` emits both variants. Pages reuse it —
   never duplicate the keyboard per page.
   6d. **Mermaid in README: plain words only in node labels**
   (Damar, 2026-11-19 ~16:30 WIB — found in the DB Chat repo,
   verified on the live GitHub page). The local Mermaid parser v11
   can print PARSE OK while GitHub's renderer FAILS: the DB Chat
   diagram errored on GitHub with `Parse error ... Expecting 'SQE'
   ... got 'STR'` because a node contained `=` and nested quotes
   (`PAGES["... lang='id'"]`). NEVER put `=` or nested quotes
   inside a Mermaid node label — write plain words only (e.g.
   `template EN and ID`). Validate locally with
   `/tmp/mmd-parse/parse-both.ts` (must print PARSE OK), AND the
   final verification MUST be viewing the rendered diagram on the
   GitHub README page in the browser — local parse alone is NOT
   proof. Also recorded in `~/workspace/recreate-rules.md` §6d.
7. **No emoji in `##` README headings** (the "emoji on parent
   headings" rule was REVOKED by Damar 2026-11-19 ~14:40 WIB).
   Emoji is still fine in the repo DESCRIPTION (rule 4) and inside
   list items / body text.
8. **Repo name represents the project**, not the original flow's
   name (e.g. `bot-analyze-landing-page-ai`). Get the name right at
   creation — do NOT rename a published repo (renaming breaks its
   URL). Repo is PUBLIC. Description has NO ecosystem version
   number. README is firm, human, and clear. Promo for the
   Telegram-bot creation service by a Gramstax engineer sits at the
   TOP of every README.md (under title + badges, before Features,
   English, linking Telegram @damartripamungkas).
9. **Conventional commits + scope** (e.g. `feat(pages): ...`,
   `fix(analyzer): ...`, `chore(repo): ...`). Every project MUST
   have `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md`.
   Every repo MUST have topics for SEO.
10. **Page file names in English only** (e.g. `analyze.ts`,
    `forget.ts`, `language.ts` — never an Indonesian spelling).
11. **AI model + base URL via `.env`** (Damar, 2026-11-19 ~16:10
    WIB): `OPENAI_BASE_URL` (default `https://api.openai.com/v1`)
    + `OPENAI_MODEL` (default `o1` here — the original flow used
    o1 with high reasoning effort). Never hardcode the model or URL
    in code. Free OpenAI-compatible provider verified working
    without a key: Pollinations `https://text.pollinations.ai/openai`,
    model `openai-fast` (the `openai` model often rate-limits 402
    FREE_LIMIT, 1 reply/45s/IP — use `openai-fast` for live tests).
    If a custom base URL is set, an empty key must NOT force mock
    mode; if the base URL is the OpenAI default and the key is empty
    → mock. Reasoning params (`reasoning_effort`) are sent ONLY to
    reasoning models (o1/o3/o4) and only when configured; `temperature`
    is omitted for reasoning models — never break generic
    OpenAI-compatible providers.
12. **ALWAYS check the Mermaid flow in README.md** (Damar,
    2026-11-19 ~16:13 WIB): render/validate until 0 errors before
    commit/push. See rule 6d for the GitHub-vs-local trap.

## Project notes — bot-analyze-landing-page-ai (2026-11-19)

Recreate of the original workflow 3100 ("Analyze Landing Page with
OpenAI and Get Optimization Tips", 4 nodes: Form Trigger → HTTP
Request scrape → AI Agent CRO roast + 10 recommendations → OpenAI
Chat Model o1, reasoningEffort high). Original JSON: `references/` (workflow id 3100, 4 nodes, validated —
the file name inside references/ is the only place the original tool's
name appears).

Mapping original → Gramstax:

- Form Trigger ("Landing Page Url") → Telegram `/analyze <url>` and
  free-text URL, PLUS the HTTP endpoint `POST /analyze`
  (`src/server.ts`, Bun.serve; `GET /health`, `GET /`).
- HTTP Request "Scrape Website" → `src/lib/scraper.ts`:
  `validateUrl` (http/https only, blocks localhost/private/link-local
  hosts + DNS-resolved private IPs — SSRF guard), 15 s timeout,
  200 KB max, HTML→clean text (strips script/style/noscript/svg,
  decodes entities), 12,000 chars budget.
- AI Agent (CRO roast + EXACTLY 10 recommendations) →
  `src/lib/analyzer.ts`: `CRO_SYSTEM_PROMPT` is the original agent
  prompt (kept as a constant, adapted to English);
  `parseRoast` splits Roast + numbered Recommendations (caps at 10);
  `analyze()` runs validate → scrape → model → parse. Deterministic
  mock (env `ANALYZE_MOCK_AI=1`) returns a roast + exactly 10
  recommendations for the host — used by all e2e tests.
- OpenAI Chat Model o1 → `src/lib/openai.ts` (`IChatOptions`:
  `reasoningEffort`/`temperature`; `isReasoningModel` for o1/o3/o4;
  temperature omitted for reasoning models, `reasoning_effort` sent
  only when non-empty). Config in `src/lib/config.ts`
  (`OPENAI_BASE_URL`/`OPENAI_MODEL`/`OPENAI_REASONING_EFFORT`/`ANALYZE_PORT`,
  env prefix `ANALYZE_`).

LMDB (`@gramstax/lmdb` 6.1.0): `UserSchema` (per-user language
preference, `botLang`) + `AnalysisSchema` (one row per user, last 5
analyses as JSON, newest first). No long-term conversation memory —
the original flow has no memory node; `/forget` clears the analyses
only, not the language. `data/` is git-ignored; `src/db/index.ts`
exports `user` + `analyses` repos.

Pages (all EN commands, EN+ID content via static template):

- `start/index.ts` — welcome + mainMenu `[AnalyzePage, LanguagePage, HelpPage]`
- `analyze.ts` — `handleCommandText` (prompt), `handleCommandArgsText`
  (analyze), `handleFreeText` (bare URL → analyze; other text →
  prompt), `handleCallbackQueryData` (prompt). Sends roast chunks
  (4000 chars) then recommendation groups via the `roast`/`recs`
  `<g-base>` ids. `sendChatAction` typing while working.
- `help.ts`, `language.ts`, `forget.ts` (clears `db.analyses`),
  `status.ts` (Route Not Found, no `<g-description>`).

Verification commands: `bun run typecheck`, `bun run test:all`,
`bun run test:e2e:check`, `gramstax build`. Live test: run
`src/server.ts` with Pollinations (`OPENAI_BASE_URL=https://text.pollinations.ai/openai`,
`OPENAI_MODEL=openai-fast`, no key) and `curl POST /analyze` against
a real public page (e.g. https://yuzuu.co) — report the roast
summary + the 10-recommendation count, never the full roast.

Git: `gh` CLI (logged in as `damartripamungkas`), HTTPS via the `gh`
credential helper — SSH push FAILS (the VM key is only a Deploy Key
for `inkred-content-factory`). Repo: `gramstax/bot-analyze-landing-page-ai`
(PUBLIC). Topics: telegram-bot, gramstax, typescript, bun,
ai-assistant, openai, cro, landing-page, seo, chatbot.
