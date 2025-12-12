# NostrDevs

A curated list of nostr development resources for meetup organizers.

## For Meetup Organizers

Visit [nostrdevs.org](https://nostrdevs.org) and use the date picker to filter items since your last meetup. Click through each link to prepare for your discussion.

## Contributing

Add a JSON file to the `/items` directory:

**Filename format:** `YYYY-MM-DD-short-description.json`

**Content:**
```json
{
  "title": "Human readable title",
  "url": "https://example.com/link-to-resource",
  "date": "2025-01-15",
  "tags": ["nips", "clients", "relays"]
}
```

**Required fields:**
- `title` - Brief, descriptive title
- `url` - Link to the resource
- `date` - Date in YYYY-MM-DD format (when submitted or when the resource was published)

**Optional fields:**
- `tags` - Array of tags. Use existing tags when possible:
  - `nips` - Protocol specs and NIPs
  - `clients` - Client apps and updates
  - `relays` - Relay software and infrastructure
  - Or create your own!

### Submitting

1. Fork this repo
2. Add your JSON file to `/items`
3. Open a PR

## Development

```bash
# Install Node.js 22+
node build.js
npx serve _site
```

## License

MIT
