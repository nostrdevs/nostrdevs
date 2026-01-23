import "dotenv/config";
import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(join(__dirname, "_site")));

// Scrape URL content with Firecrawl
async function scrapeUrl(url) {
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (!firecrawlKey) {
    throw new Error("FIRECRAWL_API_KEY not configured");
  }

  const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${firecrawlKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Firecrawl error:", errorText);
    throw new Error("Failed to scrape URL");
  }

  const data = await response.json();
  return data.data?.markdown || "";
}

// AI extraction endpoint
app.post("/api/extract", async (req, res) => {
  const { url, context } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  }

  // Scrape the page content
  let pageContent = "";
  try {
    pageContent = await scrapeUrl(url);
  } catch (err) {
    console.error("Scrape error:", err.message);
    // Continue without content, Gemini will work with just URL + context
  }

  const prompt = `You are helping categorize Nostr development resources. Given this URL, page content, and optional context, extract:
1. A concise, descriptive title (not the page title, but a clear description of what this resource is about)
2. Relevant tags from this list: nips, clients, relays, libraries, tools, tutorials, events

URL: ${url}
${pageContent ? `\nPage Content:\n${pageContent.slice(0, 8000)}` : ""}
${context ? `\nContext from submitter: ${context}` : ""}

Respond with ONLY valid JSON in this exact format, no markdown:
{"title": "Your extracted title here", "tags": ["tag1", "tag2"]}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 256,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      return res.status(502).json({ error: "Failed to call Gemini API" });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(502).json({ error: "Empty response from Gemini" });
    }

    // Parse JSON from response (handle potential markdown code blocks)
    let jsonStr = text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr
        .replace(/```json?\n?/g, "")
        .replace(/```/g, "")
        .trim();
    }

    const extracted = JSON.parse(jsonStr);
    res.json({
      title: extracted.title || "",
      tags: Array.isArray(extracted.tags) ? extracted.tags : [],
    });
  } catch (err) {
    console.error("Extraction error:", err);
    res.status(500).json({ error: "Failed to extract details" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
