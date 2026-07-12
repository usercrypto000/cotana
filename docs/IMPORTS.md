# Catalog Imports

Catalog imports are internal admin operations only. They are not a public submission flow, a developer claim flow, or a developer portal.

## Supported Format

Use JSON for launch operations.

```json
{
  "apps": [
    {
      "slug": "example-app",
      "name": "Example App",
      "categorySlug": "defi",
      "shortDescription": "Simple discovery copy.",
      "longDescription": "A longer description for the app detail page.",
      "websiteUrl": "https://example.com",
      "logoUrl": "https://example.com/logo.png",
      "verified": false,
      "tags": ["defi", "analytics"],
      "screenshots": ["https://example.com/screenshot.png"],
      "status": "DRAFT"
    }
  ]
}
```

`tags` and `screenshots` may also be pipe-separated or comma-separated strings for simple CSV-to-JSON workflows.

## Dry Run

Dry run is the default behavior.

```bash
pnpm catalog:import ./catalog.json
```

The report includes:

- valid row count
- invalid rows
- row numbers
- validation errors
- whether writes are allowed

## Write Mode

Use write mode only after reviewing the dry-run report.

```bash
pnpm catalog:import ./catalog.json --write
```

Production writes require explicit confirmation:

```bash
COTANA_CONFIRM_PRODUCTION_IMPORT=true pnpm catalog:import ./catalog.json --write
```

## Validation Rules

- `name` is required
- `categorySlug` must match an existing Cotana category
- `shortDescription` is required
- `longDescription` is required
- `websiteUrl` must be a valid URL
- `logoUrl` must be a valid URL
- imported apps default to `DRAFT`
- imported apps default to `HUMAN` audience with no agent registry listing

Agent capability metadata should still be reviewed through the admin app before publication.

## Production Rules

- do not run fixture seeds in production
- do not import directly to production without a dry run
- do not publish imported rows automatically unless the row explicitly requests `PUBLISHED`
- do not treat import as a developer submission path
- do not import credentials, wallet data, or downstream execution data
