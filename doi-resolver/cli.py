"""CLI for testing the pipeline against the example files."""

import argparse
from pathlib import Path

from doi_resolver.pipeline import run, test_search


def main():
    parser = argparse.ArgumentParser(description="DOI resolver CLI (title-search)")
    parser.add_argument("--csv", default="example/DIS_2026_swiss_papers.csv")
    parser.add_argument("--prefix", action="append", default=None,
                        help="DOI prefix; repeat for multiple (default: 10.1145/3800645.)")
    parser.add_argument("--email", required=True)
    parser.add_argument("--cache", default="crossref_cache.json")
    parser.add_argument("--cache-only", action="store_true")
    parser.add_argument("--test", action="store_true", help="Search only the first 3 rows")
    parser.add_argument("--out-csv", default="output.csv")
    args = parser.parse_args()

    prefixes = args.prefix or ["10.1145/3800645."]
    csv_bytes = Path(args.csv).read_bytes()

    if args.test:
        records = test_search(csv_bytes, prefixes, args.email, cache_path=args.cache, n=3)
        for rec in records:
            mark = "✓" if rec.get("matched") else "✗"
            print(f"{mark} {rec.get('csv_title','')}")
            print(f"   -> {rec.get('doi')}  (score {rec.get('score')})")
            print(f"      {rec.get('title','')}\n")
        return

    def progress(done, total):
        print(f"  Searching CrossRef: {done}/{total}", end="\r", flush=True)

    result = run(csv_bytes, prefixes, args.email, cache_path=args.cache,
                 cache_only=args.cache_only, progress_callback=progress)
    print()

    Path(args.out_csv).write_bytes(result["csv_bytes"])
    print(f"Wrote {args.out_csv}")
    print(f"\nRows: {result['row_count']}  cached: {result['cached_count']}  fetched: {result['fetched_count']}")
    print(f"Matched: {len(result['matched'])}  Unmatched: {len(result['unmatched'])}")

    if result["unmatched"]:
        print("\nUnmatched rows:")
        for row in result["unmatched"]:
            print(f"  - {row['title']}\n    {row['reason']}")


if __name__ == "__main__":
    main()
