"""Title normalization, author tie-breaking, and CSV output building."""

import csv
import io
import re
import unicodedata
from difflib import SequenceMatcher

TITLE_THRESHOLD = 0.93
# If the top two candidates are within this margin, treat as ambiguous and use
# the All Authors column to break the tie.
AMBIGUOUS_MARGIN = 0.05


def normalize(text: str) -> str:
    """Unicode-normalize, replace typographic chars, lowercase, collapse whitespace."""
    t = unicodedata.normalize("NFKC", text or "")
    for src, dst in [
        ("‘", "'"), ("’", "'"), ("“", '"'), ("”", '"'),
        ("–", "-"), ("—", "-"), ("―", "-"),
    ]:
        t = t.replace(src, dst)
    return " ".join(t.lower().split())


def title_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, normalize(a), normalize(b)).ratio()


def csv_author_surnames(all_authors: str) -> set[str]:
    """
    Parse surnames from an 'All Authors' cell like
    'Jing Wu (University of St. Gallen); Philipp John (...); ...'.
    Returns a set of lowercased family-name tokens.
    """
    surnames = set()
    for chunk in (all_authors or "").split(";"):
        name = chunk.split("(")[0].strip()
        if not name:
            continue
        # Last whitespace-separated token is the family name (best-effort).
        tokens = name.split()
        if tokens:
            surnames.add(normalize(tokens[-1]))
    surnames.discard("")
    return surnames


def crossref_author_surnames(authors: list[dict]) -> set[str]:
    return {normalize(a.get("family", "")) for a in (authors or [])} - {""}


def select_best(candidates: list[dict], csv_title: str, all_authors: str) -> dict | None:
    """
    Pick the best candidate for a CSV row.
    candidates: list of {doi, title, authors}.
    Returns a record dict {doi, title, authors, score, ambiguous, matched, reason}
    or a non-matched record describing why.
    """
    if not candidates:
        return {"doi": None, "title": "", "authors": [], "score": 0.0,
                "matched": False, "reason": "No CrossRef candidate under the given prefix"}

    scored = sorted(
        ((title_similarity(csv_title, c.get("title", "")), c) for c in candidates),
        key=lambda x: x[0],
        reverse=True,
    )
    best_score, best = scored[0]

    # Author tie-break only when the top two are close.
    if len(scored) > 1 and (best_score - scored[1][0]) < AMBIGUOUS_MARGIN:
        row_surnames = csv_author_surnames(all_authors)
        if row_surnames:
            def author_overlap(cand):
                return len(row_surnames & crossref_author_surnames(cand.get("authors", [])))
            # Re-rank the near-tied top group by author overlap, keeping title as secondary.
            near = [sc for sc in scored if (best_score - sc[0]) < AMBIGUOUS_MARGIN]
            near.sort(key=lambda sc: (author_overlap(sc[1]), sc[0]), reverse=True)
            best_score, best = near[0]

    matched = best_score >= TITLE_THRESHOLD
    return {
        "doi": best.get("doi"),
        "title": best.get("title", ""),
        "authors": best.get("authors", []),
        "score": round(best_score, 3),
        "matched": matched,
        "reason": "" if matched else f"Best title similarity {best_score:.2f} (threshold {TITLE_THRESHOLD})",
    }


def build_output_csv(csv_bytes: bytes, resolved: dict) -> tuple[bytes, list[dict], list[dict], dict]:
    """
    Apply resolved DOIs to the CSV's Link column.
    resolved: normalized-csv-title -> record from select_best().
    Returns (csv_bytes, matched, unmatched, table) where table is for on-page display.
    """
    text = csv_bytes.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    fieldnames = reader.fieldnames or []
    rows = list(reader)

    matched, unmatched = [], []
    table_rows = []

    for idx, row in enumerate(rows):
        csv_title = row.get("Title", "")
        rec = resolved.get(normalize(csv_title))
        original_link = row.get("Link", "")
        is_matched = bool(rec and rec.get("matched") and rec.get("doi"))

        if is_matched:
            link = f"https://doi.org/{rec['doi']}"
            row["Link"] = link
            matched.append({"title": csv_title, "doi": rec["doi"], "link": link,
                            "score": rec.get("score")})
        else:
            link = original_link
            reason = (rec or {}).get("reason", "No CrossRef result")
            unmatched.append({"title": csv_title, "reason": reason,
                              "original_link": original_link})

        table_rows.append({
            "index": idx,
            "Link": row.get("Link", ""),
            "Title": csv_title,
            "Type": row.get("Type", ""),
            "All Authors": row.get("All Authors", ""),
            "matched": is_matched,
        })

    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=fieldnames, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)

    table = {"columns": ["Link", "Title", "Type", "All Authors"], "rows": table_rows}
    return out.getvalue().encode("utf-8"), matched, unmatched, table
