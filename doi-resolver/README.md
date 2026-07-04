# DOI Resolver

Resolves canonical `https://doi.org/` DOI links for a paper CSV by searching CrossRef by
title, and writes the DOIs into the CSV's `Link` column.

It searches CrossRef (`query.bibliographic`) for each row's `Title`, restricted to the
registrant prefix, and keeps the best hit whose DOI starts with one of your full DOI
prefixes (e.g. `10.1145/3800645.`). No ACM Digital Library HTML export is needed.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Web UI

```bash
python3 app.py
```

Open http://localhost:5055, then:

1. Upload the **papers CSV**.
2. Enter one or more **DOI prefixes** (one per line) and your **email** (sent to CrossRef as `mailto=`).
3. Click **Test search (first 3 rows)** to verify match quality before the full run. The CSV
   and settings are kept, so you can go straight to **Run full batch** afterwards.
4. **Run full batch** — the results page shows a table (Link / Title / Type / All Authors)
   with **unmatched rows highlighted**. The `Link` field is **editable**: fill in a DOI URL
   manually for any unmatched row, then **Download CSV (with edits)** to get the full CSV
   (all original columns) with your edits applied.

**Use cache only**: match against the existing JSON cache without contacting CrossRef
(email not required). Re-uploading a JSON cache skips already-resolved titles.

## CLI (for local testing)

```bash
# Search only the first 3 rows
python3 cli.py --email you@example.com --test

# Full run
python3 cli.py --email you@example.com

# Multiple prefixes / cache-only
python3 cli.py --email you@example.com --prefix 10.1145/3800645. --prefix 10.1145/XXXX.
python3 cli.py --email you@example.com --cache-only

python3 cli.py --help
```

Outputs: `output.csv` (updated), `crossref_cache.json` (resolved metadata, reused on reruns).

## How it works

1. **Search** — for each CSV `Title`, query CrossRef restricted to the registrant prefix
   (`doi_resolver/crossref.py`), with retry/backoff on transient 429/5xx and a ≤10/s,
   ≤3-concurrent rate limit. Candidates are filtered to DOIs starting with your prefix(es).
2. **Match** — pick the best candidate by title similarity (`doi_resolver/match.py`); the
   `All Authors` column breaks ties only when the top candidates are close. Below the
   similarity threshold → unmatched.
3. **Cache** — resolved records keyed by normalized title, saved incrementally; transient
   errors are not cached so they retry next run.
4. **Output** — matched rows get `https://doi.org/<DOI>`; unmatched rows keep their original
   link and are flagged. Manual edits in the web table are applied on download.


## Project by

[SwissCHI](https://swisschi.acm.org/) - The Swiss ACM SIGCHI Chapter

- Website: https://swisschi.acm.org/
- LinkedIn: https://www.linkedin.com/company/swisschi/
- Github: https://github.com/swisschi
