# News briefs with Gemini and Google Apps Script

These scripts generate HTML email newsletters from live Google News RSS results and Gemini. They are designed to run in the [Google Apps Script](https://script.google.com/) service without a separate server or build step.

## Scripts

| File | Entry point | Purpose |
| --- | --- | --- |
| `dailybrief.gs` | `sendDailyBriefing` | Sends a daily briefing covering AI, platform engineering, gaming, consumer technology, science and space, and film/TV/comics. |
| `weeklytechbrief.gs` | `sendWeeklyTechBrief` | Sends a weekly, engineering-focused technology briefing with 15 editorial sections. |
| `utils.gs` | `callGeminiWithFallback` | Shared Gemini API client with retries, model fallbacks, response parsing, and Markdown code-fence cleanup. |

## Requirements

- A Google account with access to Google Apps Script and Gmail.
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
- A Gmail account permitted to send mail from the Apps Script project.
- A Google Apps Script project with the three `.gs` files copied into it.

The scripts use these Apps Script services:

- `PropertiesService` for the Gemini API key.
- `UrlFetchApp` for Google News RSS and Gemini API requests.
- `XmlService` for parsing RSS XML.
- `GmailApp` for sending HTML email.
- `Utilities` and `Logger` for retry delays and diagnostics.

## Setup

1. Open [Google Apps Script](https://script.google.com/) and create a standalone project, or open an existing project.
2. Create one script file for each repository file and copy in:
   - `dailybrief.gs`
   - `weeklytechbrief.gs`
   - `utils.gs`
3. In **Project Settings**, open **Script properties** and add:

   | Property | Value |
   | --- | --- |
   | `GEMINI_API_KEY` | Your Gemini API key |

4. Update the `emailRecipient` constant in `dailybrief.gs` and `weeklytechbrief.gs`.
5. Save the project.
6. Run one entry point manually from the Apps Script editor:
   - `sendDailyBriefing`
   - `sendWeeklyTechBrief`
7. Review and approve the requested permissions. The first run may require authorization to make external requests and send Gmail email.

Do not put the API key directly in a `.gs` file. Script Properties keeps it separate from the source code and makes it easier to rotate.

## Scheduling

Create installable time-driven triggers from **Triggers** in the Apps Script editor:

- For `sendDailyBriefing`, choose **Time-driven**, then a daily time window.
- For `sendWeeklyTechBrief`, choose **Time-driven**, then **Week timer** and the preferred day/time.

Google Apps Script schedules triggers within the selected time window rather than guaranteeing an exact minute. Avoid creating duplicate triggers for the same function, or multiple emails may be sent.

## Configuration

The main configuration is currently kept near the top of each entry-point function:

- `emailRecipient` controls the destination address.
- The RSS query in `dailybrief.gs` controls the daily topics.
- The `queries` array in `weeklytechbrief.gs` controls the weekly search areas.
- The prompts define the newsletter structure, editorial rules, and HTML output requirements.

The shared helper in `utils.gs` controls:

- Gemini model fallback order.
- Maximum retries per model.
- Retry backoff delays.
- The per-request timeout.

Keep `utils.gs` in the same Apps Script project as both entry-point files. Apps Script exposes top-level functions across files in a project, so no imports are required.

## How a run works

1. The entry point reads `GEMINI_API_KEY` from Script Properties.
2. It fetches recent Google News RSS results for its configured queries.
3. It builds a prompt containing the live headlines, publication dates, and source URLs.
4. `callGeminiWithFallback` sends the prompt to Gemini and retries transient failures.
5. The generated HTML is cleaned of accidental Markdown code fences.
6. `GmailApp.sendEmail` sends both a plain-text fallback and the generated HTML body.

The weekly job limits each RSS query to 20 items. The daily job uses up to 30 items from its combined query. These limits help keep executions within Apps Script runtime and request quotas.

## Monitoring and troubleshooting

Use **Executions** in the Apps Script editor to inspect failed runs, and use **Execution log** or `Logger.log` output to diagnose fallback and RSS errors.

Common issues:

- **Missing API key:** Add a Script Property named exactly `GEMINI_API_KEY`.
- **Gemini API errors or quota limits:** Confirm the key is valid and has quota. The helper retries HTTP `429` and `503` responses, then tries the next configured model.
- **No email received:** Check Gmail sending limits, spam folders, the recipient address, and the execution log.
- **RSS failures:** Google News RSS or an individual request may be temporarily unavailable. The weekly script logs failed queries and continues with the remaining queries; the daily script fails if its RSS request cannot be completed.
- **Unexpected HTML:** Gemini output is expected to be HTML. The prompts ask it not to use Markdown fences, and the helper removes fences if they appear, but generated content should still be reviewed periodically.

## Quotas and security

Apps Script, Gmail, URL Fetch, and Gemini all have usage limits. The weekly script is deliberately configured with a small retry count and a request timeout to reduce the chance of exceeding the Apps Script execution limit.

Treat the Gemini API key as a secret:

- Store it only in Script Properties.
- Restrict or rotate it from Google AI Studio if it is exposed.
- Avoid sharing execution logs that might contain request URLs or sensitive data.

The generated newsletters contain links and summaries based on external news sources. Review the output before relying on it for high-impact decisions.
