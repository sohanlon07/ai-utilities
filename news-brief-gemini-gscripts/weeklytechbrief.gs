function sendWeeklyTechBrief() {
  const apiKey =
    PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  const emailRecipient = "sohanlon07@gmail.com";

  // 1. Calculate 7-day date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 7);

  const formatDate = (d) =>
    d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  const dateRangeStr = `${formatDate(startDate)} –${formatDate(endDate)}`;

  // 2. Fetch live RSS items across technical domain queries
  const queries = [
    'AI OR "AI agents" OR "Model Context Protocol" OR MCP OR "platform engineering"',
    'Kubernetes OR "cloud native" OR "infrastructure as code" OR GitOps OR DevOps OR SRE',
    'cybersecurity OR "supply chain security" OR "developer tooling" OR "open source"',
  ];

  let newsItems = [];
  queries.forEach((q) => {
    try {
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-GB&gl=GB&ceid=GB:en`;
      const rssResponse = UrlFetchApp.fetch(rssUrl);
      const xml = XmlService.parse(rssResponse.getContentText());
      const items = xml
        .getRootElement()
        .getChild("channel")
        .getChildren("item");

      for (let i = 0; i < Math.min(items.length, 20); i++) {
        const title = items[i].getChildText("title");
        const pubDate = items[i].getChildText("pubDate");
        const link = items[i].getChildText("link");
        newsItems.push(
          `- Title: ${title} | URL: ${link} \vert{} Published:${pubDate}`,
        );
      }
    } catch (e) {
      Logger.log("Error fetching RSS query: " + q + " -> " + e.message);
    }
  });

  const liveNewsContext = newsItems.join("\n");

  // 3. Formulate Prompt
  const prompt = `You are an expert technical editor writing "The Week in Tech" for senior platform and software engineers.
Covered Date Range: ${dateRangeStr}

Below is a curated context list of real headlines and URLs published over the past week:
${liveNewsContext}

Requirements:
- Subject line target: The Week in Tech — ${dateRangeStr}
- Format the entire response as valid, responsive, clean HTML (using inline CSS) ready for an email body.
- Single-column reading flow optimized for desktop and mobile reading in Gmail.
- Start with a prominent title ("The Week in Tech") and the date range (${dateRangeStr}) at the top.
- Include a 60–100 word introductory theme paragraph highlighting the overarching technical trend of the week.
- Every substantive item MUST include a direct, clickable HTTPS hyperlink (<a href="URL" target="_blank" style="color: #1a73e8; text-decoration: none;">Link / Title</a>) using the URLs from the context list.

Use these exact 15 sections in this exact order:
1. The 5 Things That Mattered (exactly 5 key developments across the field)
2. AI (model releases, products, research, ecosystem)
3. AI Agents (frameworks, MCP, computer use, orchestration, autonomous workflows)
4. AI-Assisted Development (coding agents, IDE assistants, developer tooling, benchmarks)
5. Platform Engineering (Kubernetes, containers, cloud, IaC, GitOps, CI/CD, observability, SRE)
6. Security (cloud, supply chain, Kubernetes, identity, AI security, defensive tooling)
7. Industry (strategy, acquisitions, regulation, incidents, outages, market shifts)
8. Engineering Reads (3–5 strong technical articles or blog posts with links)
9. Open-Source Radar (meaningful projects/releases with canonical links)
10. Research & Benchmarks (significant papers, evaluations, benchmark results)
11. From the Community (discussion from HN, Reddit, X, Bluesky; clearly distinguish community reaction from verified fact)
12. This Week's Deep Dive (400–700 word technical synthesis of a major theme)
13. Releases Worth Knowing About (short items for meaningful releases)
14. Quick Hits (5–10 concise one-sentence linked items)
15. Worth Watching (upcoming releases, conferences, deprecations, deadlines)

End with an editorial note stating that the edition was curated from reputable sources published or updated during the previous week.

Editorial Rules:
- Rigorous, engineering-focused depth suitable for Staff/Senior engineers.
- Deduplicate overlapping stories.
- Do not output markdown code fencing like \`\`\`html.
- Do not include scripts, remote fonts, or complex nested tables.`;

  // 4. Call helper (Handles API POST, 503 retries, model fallbacks, JSON parsing & HTML cleaning)
  const htmlContent = callGeminiWithFallback(apiKey, prompt);

  // 5. Dispatch Email
  GmailApp.sendEmail(
    emailRecipient,
    `The Week in Tech — ${dateRangeStr}`,
    "Please enable HTML email viewing to read your weekly briefing.",
    { htmlBody: htmlContent },
  );
}
