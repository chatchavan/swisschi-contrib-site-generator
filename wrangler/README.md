# Swiss-papers wrangler (JS)

Browser- and Node-compatible ES module that extracts papers with at least one
Switzerland-affiliated author from a SIGCHI program JSON. Pure functions over a
parsed JSON object — no filesystem or network access — so it runs client-side in
the generator app (WP-D) as well as under Node.

A port of April Wang's `find_swiss_papers.py` in the [swisschi-chi26/chi26-data-wrangler](https://github.com/swisschi-chi26/chi26-data-wrangler) repo.

## API

```js
import { findSwissPapers, papersToCSV } from './wrangler.js'

const program = JSON.parse(jsonText)   // a SIGCHI program JSON
const papers  = findSwissPapers(program)
const csv     = papersToCSV(papers)    // Google-Sheet column schema
```

- `findSwissPapers(data, { mapping })` → array of paper objects.
- `papersToCSV(papers, mapping)` → CSV string (website's column order).
- `paperToRow`, `swissInstitutes`, `normalizeInstitute`, `INSTITUTE_MAPPING`,
  `CSV_COLUMNS`, `buildContentLink` are also exported.

`Author's Message` is emitted **empty** for manual-curation.

## Verification

The test checks a field-for-field match with `SwissCHI CHI 2026 - swiss_papers.csv` on every
algorithm-controlled column across the shared rows. 
To run this test, first to download JSON from program pages:

- `CHI_2026_program.json` can be downloaded from https://programs.sigchi.org/chi/2026'
- `DIS_2026_program.json`  can be downloaded from https://programs.sigchi.org/dis/2026'

At the bottom of each page, click **Get conference data JSON**. Put the files in the `test` folder.
Then, run the following commands

```bash
npm test    # node test/wrangler.test.mjs
```

## Project by

[SwissCHI](https://swisschi.acm.org/) - The Swiss ACM SIGCHI Chapter

- Website: https://swisschi.acm.org/
- LinkedIn: https://www.linkedin.com/company/swisschi/
- Github: https://github.com/swisschi
