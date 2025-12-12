# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NostrDevs is a static site generator that creates a filterable, curated list of Nostr development resources for meetup organizers. The build process aggregates individual JSON files from the `/items` directory into a single-page web application.

## Build and Development

```bash
# Build the site (processes items/*.json → _site/)
node build.js

# Build and serve locally
npm run dev
# Or manually:
node build.js && npx serve _site
```

## Architecture

### Build Pipeline (`build.js`)

- Reads all JSON files from `/items` directory
- Validates required fields: `title`, `url`, `date` (YYYY-MM-DD format)
- Sorts items by date (newest first)
- Outputs consolidated `_site/items.json`
- Copies static files (`index.html`, `style.css`, `app.js`) to `_site/`

### Frontend (`app.js`)

- Fetches `items.json` on page load
- Implements two filtering mechanisms:
  1. **Date filter**: Shows items since a selected date (persisted to localStorage)
  2. **Tag filter**: Shows items matching a selected tag
- Dynamically builds tag buttons from all tags found in items
- Updates URL list and item count when filters change

### Data Format

Items are individual JSON files in `/items` with filename format: `YYYY-MM-DD-short-description.json`

**Required fields:**
- `title` (string)
- `url` (string)
- `date` (string, YYYY-MM-DD format)

**Optional fields:**
- `tags` (array of strings)

Common tags: `nips`, `clients`, `relays`

## Key Behaviors

- Date filter state persists in localStorage (key: `nostrdevs-since-date`)
- Filters work together (date AND tag)
- Invalid items log warnings during build but don't fail the process
- Missing tags default to empty array
- Build process requires Node.js 22+

<frontend_aesthetics>
You tend to converge toward generic, "on distribution" outputs. In frontend design, this creates what users call the "AI slop" aesthetic. Avoid this: make creative, distinctive frontends that surprise and delight.

Focus on:
- Typography: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics.
- Color & Theme: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Draw from IDE themes and cultural aesthetics for inspiration.
- Motion: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions.
- Backgrounds: Create atmosphere and depth rather than defaulting to solid colors. Layer CSS gradients, use geometric patterns, or add contextual effects that match the overall aesthetic.

Avoid generic AI-generated aesthetics:
- Overused font families (Inter, Roboto, Arial, system fonts)
- Clichéd color schemes (particularly purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character

Interpret creatively and make unexpected choices that feel genuinely designed for the context. Vary between light and dark themes, different fonts, different aesthetics.
</frontend_aesthetics>
