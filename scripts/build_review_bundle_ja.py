#!/usr/bin/env python3
"""Build docs/review_bundle_ja.md by concatenating source docs.

Usage:
  python scripts/build_review_bundle_ja.py
"""
from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = REPO_ROOT / "docs" / "review_bundle_ja.md"

SOURCES = [
    ("README_ja.md", REPO_ROOT / "README_ja.md"),
    ("docs/spec_ja.md", REPO_ROOT / "docs" / "spec_ja.md"),
    ("docs/vision_ja.md", REPO_ROOT / "docs" / "vision_ja.md"),
    ("docs/spec_future_ja.md", REPO_ROOT / "docs" / "spec_future_ja.md"),
]

HEADER = """# FairSoil Review Bundle (JA)

このファイルは日本語レビュー用の主要文書まとめです。  
注意: これは結合生成物です。正本は各ドキュメント（README_ja.md / docs/spec_ja.md / docs/vision_ja.md / docs/spec_future_ja.md）を参照してください。
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
