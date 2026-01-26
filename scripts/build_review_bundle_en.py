#!/usr/bin/env python3
"""Build docs/review_bundle_en.md by concatenating source docs.

Usage:
  python scripts/build_review_bundle_en.py
"""
from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = REPO_ROOT / "docs" / "review_bundle_en.md"

SOURCES = [
    ("README.md", REPO_ROOT / "README.md"),
    ("docs/spec_en.md", REPO_ROOT / "docs" / "spec_en.md"),
    ("docs/vision_en.md", REPO_ROOT / "docs" / "vision_en.md"),
    ("docs/spec_future_en.md", REPO_ROOT / "docs" / "spec_future_en.md"),
]

HEADER = """# FairSoil Review Bundle (EN)

This file bundles the core documents for external review.  
Note: This is a generated bundle. The sources are README.md / docs/spec_en.md / docs/vision_en.md / docs/spec_future_en.md.
"""


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8").rstrip()


def main() -> None:
    parts = [HEADER, "\n---\n"]
    for label, path in SOURCES:
        parts.append(f"\n## Source: {label}\n\n")
        parts.append(read_text(path))
        parts.append("\n\n---\n")

    OUT_PATH.write_text("".join(parts).rstrip() + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
