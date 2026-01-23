import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import Firecrawl from '@mendable/firecrawl-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const ITEMS_DIR = path.join(process.cwd(), 'items');

// Initialize APIs
const firecrawl = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

function getExistingUrls() {
  const urls = new Set();
  if (!fs.existsSync(ITEMS_DIR)) return urls;

  for (const file of fs.readdirSync(ITEMS_DIR)) {
    if (!file.endsWith('.json')) continue;
    try {
      const item = JSON.parse(fs.readFileSync(path.join(ITEMS_DIR, file), 'utf8'));
      if (item.url) urls.add(item.url);
    } catch (e) {
      // skip invalid files
    }
  }
  return urls;
}

async function scrapeUrl(url) {
  const result = await firecrawl.v1.scrapeUrl(url, { formats: ['markdown'] });
  if (!result.success) {
    throw new Error(result.error || 'Scrape failed');
  }
  return {
    markdown: result.markdown || '',
    title: result.metadata?.title || '',
    description: result.metadata?.description || ''
  };
}

async function generateTitleAndTags(url, content) {
  const prompt = `Analyze this webpage about Nostr (decentralized social protocol).

URL: ${url}
Title: ${content.title}
Description: ${content.description}

Content (truncated):
${content.markdown.slice(0, 4000)}

Generate a JSON response with:
1. "title": A concise, descriptive title (max 60 chars) for a developer resource list
2. "tags": An array of relevant tags from ONLY these options: ["nips", "clients", "relays"]
   - "nips": NIPs (Nostr Implementation Possibilities), protocol specs, standards
   - "clients": Nostr client apps, user-facing applications
   - "relays": Relay implementations, relay software, infrastructure

Return ONLY valid JSON, no markdown code blocks:
{"title": "...", "tags": [...]}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Clean up potential markdown code blocks
  const cleaned = text.replace(/^```json?\n?|\n?```$/g, '').trim();
  return JSON.parse(cleaned);
}

async function processUrl(url, existingUrls) {
  if (existingUrls.has(url)) {
    return { status: 'skipped', reason: 'duplicate' };
  }

  // Scrape the page
  const content = await scrapeUrl(url);

  // Generate title and tags
  const { title, tags } = await generateTitleAndTags(url, content);

  // Create item
  const today = new Date().toISOString().split('T')[0];
  const item = {
    title,
    url,
    date: today,
    tags: tags.filter(t => ['nips', 'clients', 'relays'].includes(t))
  };

  // Write file
  const slug = slugify(title);
  const filename = `${today}-${slug}.json`;
  const filepath = path.join(ITEMS_DIR, filename);

  fs.writeFileSync(filepath, JSON.stringify(item, null, 2) + '\n');

  return { status: 'imported', filename, title };
}

async function main() {
  // Check API keys
  if (!process.env.FIRECRAWL_API_KEY) {
    console.error('Error: FIRECRAWL_API_KEY not set');
    process.exit(1);
  }
  if (!process.env.GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY not set');
    process.exit(1);
  }

  // Read links file
  const linksFile = process.argv[2] || 'links.txt';
  if (!fs.existsSync(linksFile)) {
    console.error(`Error: ${linksFile} not found`);
    process.exit(1);
  }

  const lines = fs.readFileSync(linksFile, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));

  if (lines.length === 0) {
    console.log('No URLs found in', linksFile);
    return;
  }

  console.log(`Found ${lines.length} URL(s) to process\n`);

  // Get existing URLs
  const existingUrls = getExistingUrls();

  // Process each URL
  const results = { imported: 0, skipped: 0, failed: 0 };

  for (const url of lines) {
    process.stdout.write(`Processing: ${url}...`);
    try {
      const result = await processUrl(url, existingUrls);
      if (result.status === 'imported') {
        console.log(` imported as ${result.filename}`);
        results.imported++;
        existingUrls.add(url); // prevent duplicates within same run
      } else {
        console.log(` skipped (${result.reason})`);
        results.skipped++;
      }
    } catch (err) {
      console.log(` FAILED: ${err.message}`);
      results.failed++;
    }
  }

  // Summary
  console.log('\n--- Summary ---');
  console.log(`Imported: ${results.imported}`);
  console.log(`Skipped:  ${results.skipped}`);
  console.log(`Failed:   ${results.failed}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
