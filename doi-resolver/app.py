"""Flask web UI for the DOI resolver tool (title-search architecture)."""

import csv
import io
import json
import os
import uuid
from pathlib import Path

from flask import (
    Flask,
    jsonify,
    render_template,
    request,
    send_file,
    session,
)

from doi_resolver.pipeline import parse_prefixes, run, test_search

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-doi-resolver")

WORK_DIR = Path(os.environ.get("WORK_DIR", "/tmp/doi-resolver-sessions"))
WORK_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_PREFIX = "10.1145/3800645."


def _session_dir() -> Path:
    sid = session.setdefault("id", str(uuid.uuid4()))
    d = WORK_DIR / sid
    d.mkdir(exist_ok=True)
    return d


def _store_csv_if_uploaded(sd: Path) -> bool:
    """Save an uploaded CSV to the session dir. Returns True if a CSV is now present."""
    f = request.files.get("csv_file")
    if f and f.filename:
        f.save(sd / "papers.csv")
        session["csv_name"] = f.filename
    return (sd / "papers.csv").exists()


def _form_state() -> dict:
    """Current form values to re-render the index, preserving user input."""
    return {
        "prefixes_text": request.form.get("prefixes", DEFAULT_PREFIX),
        "email": request.form.get("email", ""),
        "cache_only": request.form.get("cache_only") == "1",
        "csv_name": session.get("csv_name"),
    }


@app.route("/")
def index():
    sd = _session_dir()
    return render_template(
        "index.html",
        prefixes_text=DEFAULT_PREFIX,
        email="",
        cache_only=False,
        csv_name=session.get("csv_name") if (sd / "papers.csv").exists() else None,
    )


@app.route("/test-fetch", methods=["POST"])
def do_test_fetch():
    sd = _session_dir()
    has_csv = _store_csv_if_uploaded(sd)
    state = _form_state()

    if not has_csv:
        return render_template("index.html", error="Please upload the CSV file.", **state)
    prefixes = parse_prefixes(state["prefixes_text"])
    if not prefixes:
        return render_template("index.html", error="At least one DOI prefix is required.", **state)
    if not state["email"]:
        return render_template("index.html", error="Email is required for test fetch.", **state)

    csv_bytes = (sd / "papers.csv").read_bytes()
    cache_path = str(sd / "crossref_cache.json")
    try:
        records = test_search(csv_bytes, prefixes, state["email"], cache_path=cache_path, n=3)
    except Exception as exc:
        return render_template("index.html", error=f"Test fetch failed: {exc}", **state)

    return render_template("index.html", test_records=records, **state)


@app.route("/process", methods=["POST"])
def do_process():
    sd = _session_dir()
    has_csv = _store_csv_if_uploaded(sd)
    state = _form_state()

    # Optional uploaded JSON cache
    cache_upload = request.files.get("cache_file")
    cache_path = str(sd / "crossref_cache.json")
    if cache_upload and cache_upload.filename:
        cache_upload.save(cache_path)

    prefixes = parse_prefixes(state["prefixes_text"])
    cache_only = state["cache_only"]
    email = state["email"] or None

    if not has_csv:
        return render_template("index.html", error="Please upload the CSV file.", **state)
    if not prefixes:
        return render_template("index.html", error="At least one DOI prefix is required.", **state)
    if not cache_only and not email:
        return render_template("index.html",
                               error="Email is required unless 'use cache only' is checked.", **state)

    csv_bytes = (sd / "papers.csv").read_bytes()
    try:
        result = run(csv_bytes, prefixes, email, cache_path=cache_path, cache_only=cache_only)
    except Exception as exc:
        return render_template("index.html", error=f"Processing failed: {exc}", **state)

    # Persist outputs for download
    (sd / "output.csv").write_bytes(result["csv_bytes"])
    (sd / "crossref_cache.json").write_text(result["crossref_json"], encoding="utf-8")

    return render_template(
        "results.html",
        matched=result["matched"],
        unmatched=result["unmatched"],
        table=result["table"],
        row_count=result["row_count"],
        cached_count=result["cached_count"],
        fetched_count=result["fetched_count"],
    )


@app.route("/download-edited", methods=["POST"])
def download_edited():
    """Apply in-browser Link edits (index -> link) onto the stored CSV and return it."""
    sd = _session_dir()
    src = sd / "output.csv"
    if not src.exists():
        return "No processed CSV available", 404

    edits = request.get_json(silent=True) or {}
    edits = {int(k): v for k, v in edits.items()}

    text = src.read_text("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    fieldnames = reader.fieldnames or []
    rows = list(reader)
    for idx, row in enumerate(rows):
        if idx in edits:
            row["Link"] = edits[idx]

    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=fieldnames, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)

    buf = io.BytesIO(out.getvalue().encode("utf-8"))
    return send_file(buf, mimetype="text/csv", as_attachment=True,
                     download_name="papers_with_dois.csv")


@app.route("/download/crossref_cache.json")
def download_json():
    sd = _session_dir()
    path = sd / "crossref_cache.json"
    if not path.exists():
        return "File not yet generated", 404
    return send_file(path, as_attachment=True, download_name="crossref_cache.json")


if __name__ == "__main__":
    app.run(debug=True, port=5055)
