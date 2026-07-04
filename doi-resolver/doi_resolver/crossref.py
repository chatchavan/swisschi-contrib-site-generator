"""Reverse title-search against the CrossRef API, with caching and rate limiting."""

import json
import os
import tempfile
import time
from threading import Lock

import requests

CROSSREF_URL = "https://api.crossref.org/works"
MIN_INTERVAL = 1.0 / 10  # 10 req/s ceiling
MAX_RETRIES = 3
RETRY_STATUSES = {429, 500, 502, 503, 504}


def registrant_prefix(prefix: str) -> str:
    """Return the CrossRef registrant prefix (e.g. '10.1145' from '10.1145/3800645.')."""
    return prefix.split("/", 1)[0]


def search_title(
    title: str,
    prefixes: list[str],
    email: str,
    session: requests.Session,
    rows: int = 5,
) -> list[dict]:
    """
    Search CrossRef for a paper title, restricted to the registrant prefix(es),
    and return candidate records whose DOI starts with any of the full prefixes.
    Each candidate: {doi, title, authors:[{given,family}]}.
    """
    registrants = sorted({registrant_prefix(p) for p in prefixes})
    params = {
        "query.bibliographic": title,
        "filter": ",".join(f"prefix:{r}" for r in registrants),
        "select": "DOI,title,author",
        "rows": rows,
        "mailto": email,
    }
    r = None
    for attempt in range(MAX_RETRIES):
        r = session.get(CROSSREF_URL, params=params, timeout=20)
        if r.status_code in RETRY_STATUSES and attempt < MAX_RETRIES - 1:
            time.sleep(1.0 * (attempt + 1))  # linear backoff: 1s, 2s
            continue
        break
    r.raise_for_status()
    items = r.json().get("message", {}).get("items", [])

    candidates = []
    for item in items:
        doi = item.get("DOI", "")
        if not any(doi.startswith(p) for p in prefixes):
            continue
        titles = item.get("title") or []
        authors = [
            {"given": a.get("given", ""), "family": a.get("family", "")}
            for a in item.get("author") or []
        ]
        candidates.append({
            "doi": doi,
            "title": titles[0] if titles else "",
            "authors": authors,
        })
    return candidates


def make_session(email: str) -> requests.Session:
    session = requests.Session()
    session.headers["User-Agent"] = f"doi-resolver/2.0 (mailto:{email})"
    return session


class RateGate:
    """Serializes the *start* of requests so the combined rate stays <= 10/s."""

    def __init__(self, min_interval: float = MIN_INTERVAL):
        self._lock = Lock()
        self._last = 0.0
        self._min_interval = min_interval

    def wait(self) -> None:
        with self._lock:
            now = time.monotonic()
            delay = self._min_interval - (now - self._last)
            if delay > 0:
                time.sleep(delay)
            self._last = time.monotonic()


def flush_cache(cache: dict, cache_path: str) -> None:
    """Atomically write the cache dict to disk."""
    dir_ = os.path.dirname(cache_path) or "."
    with tempfile.NamedTemporaryFile("w", dir=dir_, delete=False, suffix=".tmp") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)
        tmp = f.name
    os.replace(tmp, cache_path)


def load_cache(cache_path: str | None) -> dict:
    """Load an existing JSON cache from disk, returning {} if absent/invalid."""
    if not cache_path or not os.path.exists(cache_path):
        return {}
    try:
        with open(cache_path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}
