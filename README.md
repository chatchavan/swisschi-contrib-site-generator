# SwissCHI conference presence site generator

A collection of software that turns a SIGCHI program JSON into a
deployable "Swiss contributions" website.


## Use it

Open **`index.html`** in a browser (double-click). It has two
**independent** stages — run either one alone, in any order:

1. **Extract papers → CSV.** Drop a SIGCHI program JSON (the conference's
   "Get Conference data JSON" download). Downloads `swiss_papers.csv`.
   Curate it however you like — manually or collaboratively (awards, institute
   fixes, added/removed papers, the `Author's Message` column).
2. **Build site ← curated CSV.** Drop your curated CSV, fill in the conference
   details (and the **Deploy URL**, e.g. `swisschi-dis26.github.io`, which sets
   the base path + homepage), pick an output format, and download:
   - **Deployable site (ZIP)** — the React/Vite project. Unzip, then deploy per
     its `README.md`: `npm install && npm run deploy`. The curated CSV is
     embedded (`public/swiss_papers.csv`); no Google Sheet needed. (Advanced:
     you can instead point it at a published Google Sheet CSV URL.)
   - **Single static HTML file** — one hand-written vanilla HTML+JS page with
     the papers embedded as JSON. No build step; open directly or drop it on
     any static host. The JSON is serialized so the file is safe to publish
     through Jekyll/GitHub Pages (no Liquid-trigger or script-closing
     sequences can occur).


(Optional:) You can replace the URL to the program page with the URL to paper's DOI. 
See instructions in the `doi-resolver` folder.

## Code organization
- `site-template`: template of the output website
- `wrangler`: code that parse SIGCHI Program JSON and generate the CSV file
- `generator`: site generator
- `doi-resolver`: a Python program to replace program URL with DOI by querying Crossref

Each of these subfolders has their own `README.md` that provides more details.


## Project by

[SwissCHI](https://swisschi.acm.org/) - The Swiss ACM SIGCHI Chapter

- Website: https://swisschi.acm.org/
- LinkedIn: https://www.linkedin.com/company/swisschi/
- Github: https://github.com/swisschi
