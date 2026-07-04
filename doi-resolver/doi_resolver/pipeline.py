"""Orchestrates reverse title-search → match → produce outputs."""

import csv
import io
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

from .crossref import RateGate, flush_cache, load_cache, make_session, search_title
from .match import build_output_csv, normalize, select_best

MAX_WORKERS = 3


def parse_prefixes(text: str) -> list[str]:
    """Parse a multi-line prefixes field, one prefix per line."""
    return [line.strip() for line in (text or "").splitlines() if line.strip()]


def _read_rows(csv_bytes: bytes) -> list[dict]:
    reader = csv.DictReader(io.StringIO(csv_bytes.decode("utf-8-sig")))
    return list(reader)


def _resolve_rows(
    rows: list[dict],
    prefixes: list[str],
    email: str,
    cache: dict,
    cache_path: str | None,
    cache_only: bool,
    limit: int | None = None,
    progress_callback=None,
) -> dict:
    """
    For each row's Title, ensure a resolved record exists in cache (keyed by normalized
    title). Searches CrossRef for uncached titles unless cache_only. Returns the cache.
    """
    # Unique titles preserving order
    titles = []
    seen = set()
    for row in rows:
        t = row.get("Title", "")
        key = normalize(t)
        if key and key not in seen:
            seen.add(key)
            titles.append((key, t, row.get("All Authors", "")))

    pending = [(k, t, a) for (k, t, a) in titles
               if k not in cache or cache[k].get("error")]
    if limit is not None:
        pending = pending[:limit]

    if cache_only or not pending:
        return cache

    gate = RateGate()
    session = make_session(email)
    lock = Lock()
    done = [0]
    total = len(pending)
    flush_every = 3

    def work(item):
        key, title, all_authors = item
        gate.wait()
        try:
            candidates = search_title(title, prefixes, email, session)
            record = select_best(candidates, title, all_authors)
            record["error"] = False
        except Exception as exc:
            # Transient/network error: do NOT cache, so the next run retries.
            record = {"doi": None, "title": "", "authors": [], "score": 0.0,
                      "matched": False, "reason": f"CrossRef error: {exc}", "error": True}
        record["query_title"] = title
        return key, record

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = [pool.submit(work, item) for item in pending]
        for fut in as_completed(futures):
            key, record = fut.result()
            with lock:
                if not record.get("error"):
                    cache[key] = record
                    if cache_path and (done[0] + 1) % flush_every == 0:
                        flush_cache(cache, cache_path)
                done[0] += 1
            if progress_callback:
                progress_callback(done[0], total)

    if cache_path:
        flush_cache(cache, cache_path)
    return cache


def run(
    csv_bytes: bytes,
    prefixes: list[str] | str,
    email: str | None,
    cache_path: str | None = None,
    cache_only: bool = False,
    progress_callback=None,
) -> dict:
    """
    Full pipeline: title-search each CSV row, match, build updated CSV.
    Returns dict with csv_bytes, crossref_json, matched, unmatched, table, and counts.
    """
    if isinstance(prefixes, str):
        prefixes = parse_prefixes(prefixes)

    rows = _read_rows(csv_bytes)
    cache = load_cache(cache_path)

    keys = [normalize(r.get("Title", "")) for r in rows]
    cached_before = sum(1 for k in set(keys) if k and k in cache)

    cache = _resolve_rows(rows, prefixes, email, cache, cache_path, cache_only,
                          progress_callback=progress_callback)

    csv_out, matched, unmatched, table = build_output_csv(csv_bytes, cache)

    return {
        "csv_bytes": csv_out,
        "crossref_json": json.dumps(cache, ensure_ascii=False, indent=2),
        "matched": matched,
        "unmatched": unmatched,
        "table": table,
        "row_count": len(rows),
        "cached_count": cached_before,
        "fetched_count": 0 if cache_only else max(0, len(set(filter(None, keys))) - cached_before),
    }


def test_search(
    csv_bytes: bytes,
    prefixes: list[str] | str,
    email: str,
    cache_path: str | None = None,
    n: int = 3,
) -> list[dict]:
    """Run the title search for the first n CSV rows and return their resolved records."""
    if isinstance(prefixes, str):
        prefixes = parse_prefixes(prefixes)

    rows = _read_rows(csv_bytes)
    cache = _resolve_rows(rows, prefixes, email, {}, None, False, limit=n)

    out = []
    for row in rows:
        key = normalize(row.get("Title", ""))
        if key in cache:
            rec = dict(cache[key])
            rec["csv_title"] = row.get("Title", "")
            out.append(rec)
        if len(out) >= n:
            break
    return out
