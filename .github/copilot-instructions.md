# Copilot instructions

## Repository scope

This repository contains small AI utilities and experiments. The current utility is a Google Apps Script project under `news-brief-gemini-gscripts/`; it is copied into and run from the Google Apps Script editor rather than built as a local Node.js application.

## Build, test, and lint

There is currently no `package.json`, build command, automated test suite, or lint configuration. Do not add a local build pipeline unless the repository gains a utility that requires one.

To validate the Apps Script utility:

1. Copy or sync `news-brief-gemini-gscripts/dailybrief.gs`, `weeklytechbrief.gs`, and `utils.gs` into the same Google Apps Script project.
2. Set the `GEMINI_API_KEY` Script Property and confirm the recipient address.
3. Run `sendDailyBriefing` or `sendWeeklyTechBrief` manually from the Apps Script editor.
4. Check **Executions** and the execution log, then confirm the generated email.

Those entry points are also the smallest available single-function checks:

- Daily check: run `sendDailyBriefing`.
- Weekly check: run `sendWeeklyTechBrief`.

## Architecture

The newsletter utility has two entry points and one shared service layer:

- `dailybrief.gs` fetches up to 30 recent Google News RSS results for a broad set of AI, platform, gaming, consumer technology, science/space, and film/TV topics. It asks Gemini to select and format the top 10 stories.
- `weeklytechbrief.gs` fetches up to 20 items for each of three technical-domain RSS queries over the preceding week. It asks Gemini to produce the fixed 15-section “The Week in Tech” newsletter.
- `utils.gs` provides the global `callGeminiWithFallback(apiKey, prompt)` function used by both entry points. It calls the Gemini `generateContent` REST endpoint, retries transient failures, falls back across configured models, parses the response, and strips accidental HTML code fences.
- Both entry points use `GmailApp.sendEmail` with a plain-text fallback and Gemini-generated HTML in `htmlBody`.

At runtime, the flow is:

`PropertiesService` → Google News RSS via `UrlFetchApp` → `XmlService` parsing → prompt construction → Gemini REST request → HTML cleanup → Gmail delivery.

All three `.gs` files must live in the same Apps Script project. Apps Script exposes their top-level functions globally, so there are no imports or module boundaries.

## Repository-specific conventions

- Keep API credentials in Apps Script **Script Properties** under the exact key `GEMINI_API_KEY`; never hard-code or commit the key.
- Keep user-facing configuration near the relevant entry point: `emailRecipient`, RSS queries, date ranges, item limits, and editorial prompts are intentionally local to the daily or weekly job.
- Keep Gemini request/retry behavior in `utils.gs` so both jobs share model fallback order, retry limits, backoff, timeout, response parsing, and error behavior.
- Preserve the prompts’ HTML-email constraints. Generated content must be valid email-ready HTML, use inline CSS, include direct links from the supplied RSS context, and avoid Markdown code fences.
- Treat RSS headlines and URLs as the source context for summaries. Do not make the model invent stories or substitute unrelated links.
- Preserve the execution-time safeguards: bounded RSS item counts, bounded Gemini retries, exponential backoff for retryable failures, and the per-request timeout.
- Use `Logger.log` for recoverable RSS/model diagnostics and allow terminal failures to remain explicit. Do not silently send an empty or success-shaped newsletter when all Gemini fallbacks fail.
- When changing the newsletter structure, update the corresponding prompt and `news-brief-gemini-gscripts/README.md` together.
- The scripts are scheduled with installable time-driven Apps Script triggers. Changes to entry-point names or function signatures require updating those triggers in the Apps Script project.

## Operational configuration

The scripts depend on external Google services and their quotas: Google News RSS, Gemini API, URL Fetch, and Gmail. A successful local file edit does not prove a successful run; validate changes in Apps Script and inspect **Executions** for authorization, quota, RSS, or model errors.

`.clasp.json` is ignored because it can contain project-specific Apps Script metadata. If clasp support is introduced later, document its exact commands here and keep deployment metadata separate from secrets.
