function sendDailyBriefing() {
  const apiKey =
    PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  const emailRecipient = "sohanlon07@gmail.com";
  const todayStr = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // 1. Fetch live breaking news from Google News RSS + extract article URLs
  const query = encodeURIComponent(
    'AI OR "platform engineering" OR gaming OR "consumer tech" OR space OR "film tv"',
  );
  const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-GB&gl=GB&ceid=GB:en`;
  const rssResponse = UrlFetchApp.fetch(rssUrl);
  const xml = XmlService.parse(rssResponse.getContentText());
  const items = xml.getRootElement().getChild("channel").getChildren("item");

  let newsItems = [];
  for (let i = 0; i < Math.min(items.length, 30); i++) {
    const title = items[i].getChildText("title");
    const pubDate = items[i].getChildText("pubDate");
    const link = items[i].getChildText("link");
    newsItems.push(
      `- Title: ${title} | URL: ${link} \vert{} Published:${pubDate}`,
    );
  }
  const liveNewsContext = newsItems.join("\n");

  // 2. Prompt formulation
  const prompt = `Today's date is ${todayStr}. Below is a list of real, live news headlines published in the past 24 hours with their original article URLs:

${liveNewsContext}

Task:
Select and curate the top 10 highest-impact stories from the provided list across these priority topics:
- AI, agents, and platform engineering
- Gaming and gaming hardware
- Consumer technology
- Science and space
- Film, TV, and comics

Requirements:
- Only write summaries for real news items present in the provided list.
- HYPERLINK EVERY STORY: Wrap each headline in an HTML anchor tag (<a href="URL" target="_blank" style="color: #1a73e8; text-decoration: none;">Headline</a>) using the exact URL provided for that item in the list.
- Format the ENTIRE response as valid, responsive HTML (using inline CSS) ready to send in an email body.
- Use clean typography (font-family: Arial, sans-serif), card layout dividers, clickable bold headlines, 2-sentence summaries, key takeaways, and source badges.
- Do not output markdown code fencing like \`\`\`html.`;

  // 3. Execute using shared retry/fallback helper
  const htmlContent = callGeminiWithFallback(apiKey, prompt);

  // 4. Send Email
  GmailApp.sendEmail(
    emailRecipient,
    `Daily News Briefing - ${todayStr}`,
    "Please enable HTML email viewing to read your daily briefing.",
    { htmlBody: htmlContent },
  );
}
