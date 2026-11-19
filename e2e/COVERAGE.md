# Coverage ledger — bot-analyze-landing-page-ai

Every page, handler, and template state in `src/` has a matching e2e
assertion here. The ledger is the contract: if a row has no test, the
feature is not covered.

## Conventions

- The e2e suite runs the bot in-process with `ANALYZE_MOCK_AI=1`: the
  analyzer never touches the network — the mock returns a deterministic
  roast + exactly 10 recommendations for the host. Real scraping + real
  AI are verified by the live test (Pollinations) and by the unit tests
  in `test/scraper.test.ts` and `test/analyzer.test.ts`, which stub the
  fetch layer.
- `gmsg` in assertions means: the rendered message equals the template
  output for that base/state/language (exact match, including the
  dynamic variables). `gkb` means the keyboard labels equal the single
  `KeyboardGBlock.mainMenu()` definition for that language.
- User-facing text is bilingual (EN default + ID) via static template
  blocks only — there is no `i18n.ts` in this project. The only
  non-user-facing English strings are the LLM system prompt and the
  model-facing tokens in `src/lib/analyzer.ts` (not user-facing).
- Commands are ENGLISH ONLY (`/analyze`, `/language`, `/forget`,
  `/start`, `/help`). Content stays bilingual.

## Pages

| page | file | covered by | notes |
| --- | --- | --- | --- |
| start | `src/pages/start/index.ts` | `e2e/start/index.test.ts` | /start EN + ID, exact gmsg, exact keyboard labels, callback edit, navigation to Analyze |
| analyze | `src/pages/analyze.ts` | `e2e/analyze.test.ts` | /analyze <url> → roast + exactly 10 recs (EN + ID), bare-URL free text, /analyze alone → prompt, non-URL text → prompt, invalid URL → honest error + no history, localhost → SSRF refusal + no history, typing indicator, history saved, Analyze button on /start |
| help | `src/pages/help.ts` | `e2e/help.test.ts` | /help command EN + ID, /start → Help callback |
| language | `src/pages/language.ts` | `e2e/language.test.ts` | /language command, EN→ID and ID→EN switches, analysis renders in the new language, fresh user defaults to EN |
| forget | `src/pages/forget.ts` | `e2e/forget.test.ts` | /forget clears analyses + confirms, next analysis starts a fresh history |
| status | `src/pages/status.ts` | `e2e/status.test.ts` | unknown callback → Route not found, unknown command → Route not found (EN + ID), unknown free text goes to Analyze (prompt), NOT to Route not found |

## Hooks and guards

| hook | case | covered by | assertion |
| --- | --- | --- | --- |
| hookBeforeRoute (deny) | user not on ANALYZE_ALLOWED_IDS | `e2e/coverage.test.ts` | sendMessage penolakan ID, tanpa "aku Page Roast" |
| hookBeforeRoute (allow) | user on ANALYZE_ALLOWED_IDS | `e2e/coverage.test.ts` | /start tampil "aku Page Roast" |
| hookBeforeRoute (no username) | user without username | `e2e/coverage.test.ts` | /start tampil "aku Page Roast" |

## Stores

| store | covered by | assertion |
| --- | --- | --- |
| user | `e2e/db-lmdb.test.ts` | createIfNotExists idempotent |
| analyses | `e2e/db-lmdb.test.ts`, `e2e/coverage.test.ts` | add/list, cap at newest 5, clear, usage |

## Descriptions (BotFather sync)

| check | covered by | assertion |
| --- | --- | --- |
| `<g-description>` per command page | `e2e/descriptions.test.ts` | `executeSyncBlocksDescription` → exactly 2 `setMyCommands` calls (default + `id`), 5 commands each, once each, exact EN/ID texts |

## Unit tests (not e2e — listed here so the ledger is complete)

| area | file | covers |
| --- | --- | --- |
| URL validation + SSRF guard | `test/scraper.test.ts` | validateUrl, isPrivateIp, htmlToText, fetchPageText (stubbed fetch/DNS): clean page, private-IP refusal, non-200, non-HTML, invalid URL never fetches |
| Analyzer | `test/analyzer.test.ts` | parseRoast (numbered list, no-list fallback, 10 cap), splitText, groupItems, mockResult (10 recs), analyze() mock + live path with stubbed model + fetch failure → fetch-error |
| OpenAI client | `test/openai.test.ts` | custom base URL, empty-key auth omission, tools/tool_choice, error paths, reasoning models: reasoning_effort sent + temperature omitted for o1/o3/o4, temperature sent for normal models |
| Config | `test/config.test.ts` | defaults (model o1, port 3002), env overrides, isMock matrix |
| HTTP endpoint | `test/server.test.ts` | GET /health, GET /, POST /analyze mock success (10 recs), url-required, invalid-url, blocked-host, 404 |
| Keyboard | `test/keyboard.test.ts` | mainMenu labels EN + ID, single definition |

## Not covered (deliberate)

- Live Telegram delivery (needs `BOT_TOKEN` from Damar) — covered by
  the live test instead (Pollinations + real page, via the /tmp script
  route and via `curl POST /analyze`).
- The real Whisper/voice path — this bot has no voice input.
- Webhook deploy mode — polling is the default; webhook config is the
  standard Gramstax branch in `gramstax.config.ts`.

## Handlers

Machine-checked by `scripts/check-e2e-handlers.ts`: every `handle*`
method in `src/pages/` has a row here, and every `e2e/*.test.ts` file
is referenced by at least one row.

| Page | Handler / state | Trigger | Test | Asserts |
| --- | --- | --- | --- | --- |
| start | handleCommandText | `/start` | e2e/start/index.test.ts | sendMessage welcome + keyboard |
| start | handleCallbackQueryData | callback `start` | e2e/start/index.test.ts | editMessageText welcome + keyboard |
| analyze | handleCommandText | `/analyze` | e2e/analyze.test.ts | prompt state |
| analyze | handleCommandArgsText | `/analyze <url>` | e2e/analyze.test.ts | roast + exactly 10 recommendations |
| analyze | handleFreeText | bare URL / other text | e2e/analyze.test.ts | analyze, or prompt for non-URL text |
| analyze | handleCallbackQueryData | callback `analyze` | e2e/analyze.test.ts | editMessageText prompt |
| help | handleCommandText | `/help` | e2e/help.test.ts | help text |
| help | handleCallbackQueryData | callback `help` | e2e/help.test.ts | editMessageText help |
| language | handleCommandText | `/language` | e2e/language.test.ts | language picker |
| language | handleCallbackQueryData | callback `language` | e2e/language.test.ts | language picker |
| language | handleArgsCallbackQueryData | callback `language:lang-xx` | e2e/language.test.ts | switch + confirmation |
| forget | handleCommandText | `/forget` | e2e/forget.test.ts | clear history + confirmation |
| status | - | unknown command / callback | e2e/status.test.ts | Route not found |
| hook | - | AllowList guard | e2e/coverage.test.ts | deny / allow / no-username |
| store | - | LMDB user + analyses | e2e/db-lmdb.test.ts | idempotent user, cap 5, clear |
| descriptions | - | g-description sync | e2e/descriptions.test.ts | 5 commands x 2 languages |
