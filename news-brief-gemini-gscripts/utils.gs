/**
 * Shared Global Helper with Execution Time Safeguards for Google Apps Script
 */
function callGeminiWithFallback(apiKey, prompt) {
  const models = ["gemini-flash-latest", "gemini-3.7-flash", "gemini-3-flash"];

  const maxRetriesPerModel = 2; // Reduced to prevent hitting 6-min GAS quota

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const payload = { contents: [{ parts: [{ text: prompt }] }] };
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      timeoutInSeconds: 45, // Hard ceiling per call to avoid hanging
    };

    let delayMs = 2000;

    for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
      try {
        const response = UrlFetchApp.fetch(url, options);
        const responseCode = response.getResponseCode();

        if (responseCode === 200) {
          const data = JSON.parse(response.getContentText());
          let htmlContent = data.candidates[0].content.parts[0].text;
          return htmlContent
            .replace(/^```html\s*/i, "")
            .replace(/\s*```$/i, "");
        }

        Logger.log(
          `Model ${model} returned HTTP ${responseCode} (Attempt ${attempt}/${maxRetriesPerModel})`,
        );

        if (
          (responseCode === 503 || responseCode === 429) &&
          attempt < maxRetriesPerModel
        ) {
          Utilities.sleep(delayMs);
          delayMs *= 2;
        } else {
          Logger.log(`Switching fallback model away from ${model}...`);
          break; // Move to next model immediately
        }
      } catch (e) {
        Logger.log(`Fetch error/timeout on ${model}: ${e.message}`);
        if (attempt < maxRetriesPerModel) {
          Utilities.sleep(delayMs);
          delayMs *= 2;
        }
      }
    }
  }

  throw new Error("All Gemini model fallbacks failed or timed out.");
}
