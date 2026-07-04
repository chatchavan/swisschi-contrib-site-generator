# Site template for showcasing Swiss research contributions at a SIGCHI conference

A web app showcasing Swiss research contributions at various conferences

## Features

- Browse all Swiss research contributions
- Filter by type, institution, author, or award
- Clickable tags for quick filtering
- View author messages
- Best Paper 🏆 , Honorable Mention 🏅, and Competition winners 🙌 highlights

## Configuration

All per-conference values are stored in **`conference.yaml`** at the root of this folder.
Edit that file and rebuild — nothing needs to change in the source code.

Key fields in `conference.yaml`:

| Field | Purpose |
|---|---|
| `sheetCsvUrl` | Published Google Sheet CSV URL; leave empty to use the embedded CSV |
| `dataFile` | Embedded CSV filename in `public/` (used when `sheetCsvUrl` is empty) |
| `pageTitle` | Browser tab title |
| `faviconPath` | Path to favicon inside `public/` |
| `headerTitle` | Main heading shown in the site header |
| `headerSubtitle` | Dates/location line shown below the heading |
| `location` | Conference location (for reference / downstream use) |
| `chapterUrl` | Chapter website link |
| `linkedinUrl` | LinkedIn link |
| `footerCredit` | Left-hand footer text (e.g. "Data from the conference program") |
| `basePath` | Vite `base` path for GitHub Pages deployment (use `'/'` for root) |

Values are baked in at build time via Vite — the output works from `file://` and GitHub Pages without any runtime fetch.

## Data Source

By default the site loads the **embedded** `public/<dataFile>` CSV, so it is
self-contained. Alternatively set `sheetCsvUrl` in `conference.yaml` to a
published Google Sheet CSV URL, which then takes precedence.

Required columns:
- `ID`, `Link`, `Title`, `Type`, `Awards`
- `Author's Message`, `Swiss Institutes`, `Swiss Authors`
- `Swiss Authors Count`, `All Authors`, `Abstract`

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Deployment

```bash
# Deploy to GitHub Pages
npm run deploy
```

This pushes the built site to the `gh-pages` branch.

## Project by

[SwissCHI](https://swisschi.acm.org/) - The Swiss ACM SIGCHI Chapter

- Website: https://swisschi.acm.org/
- LinkedIn: https://www.linkedin.com/company/swisschi/
