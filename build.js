import { readdir, readFile, writeFile, mkdir, cp } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const ITEMS_DIR = "./items";
const OUTPUT_DIR = "./_site";

async function build() {
  console.log("Building nostrdevs...");

  // Create output directory
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  // Read all JSON files from items directory
  const items = [];

  if (existsSync(ITEMS_DIR)) {
    const files = await readdir(ITEMS_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    for (const file of jsonFiles) {
      try {
        const content = await readFile(join(ITEMS_DIR, file), "utf-8");
        const item = JSON.parse(content);

        // Validate required fields
        if (!item.title || !item.url || !item.date) {
          console.warn(
            `Warning: ${file} missing required fields (title, url, date)`,
          );
          continue;
        }

        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
          console.warn(
            `Warning: ${file} has invalid date format (expected YYYY-MM-DD)`,
          );
          continue;
        }

        // Ensure tags is an array
        if (!item.tags) {
          item.tags = [];
        }

        items.push(item);
      } catch (err) {
        console.error(`Error parsing ${file}:`, err.message);
      }
    }
  }

  // Sort by date descending (newest first)
  items.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Write combined items.json
  await writeFile(
    join(OUTPUT_DIR, "items.json"),
    JSON.stringify(items, null, 2),
  );

  // Copy static files
  const staticFiles = ["index.html", "about.html", "style.css", "app.js"];
  for (const file of staticFiles) {
    if (existsSync(file)) {
      await cp(file, join(OUTPUT_DIR, file));
    }
  }

  console.log(`✓ Built ${items.length} items to ${OUTPUT_DIR}/`);
}

build().catch(console.error);
