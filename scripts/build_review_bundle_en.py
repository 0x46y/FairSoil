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
    (
        "docs/phase2_migration_map_en.md",
        REPO_ROOT / "docs" / "phase2_migration_map_en.md",
    ),
    (
        "docs/phase2_parameter_catalog_en.md",
        REPO_ROOT / "docs" / "phase2_parameter_catalog_en.md",
    ),
    (
        "docs/token_a_calibration_notes_en.md",
        REPO_ROOT / "docs" / "token_a_calibration_notes_en.md",
    ),
    (
        "docs/phase1_threat_model_en.md",
        REPO_ROOT / "docs" / "phase1_threat_model_en.md",
    ),
    (
        "docs/market_vocabulary_en.md",
        REPO_ROOT / "docs" / "market_vocabulary_en.md",
    ),
    (
        "docs/phase1_identity_integration_en.md",
        REPO_ROOT / "docs" / "phase1_identity_integration_en.md",
    ),
    (
        "docs/phase1_dispute_fairness_en.md",
        REPO_ROOT / "docs" / "phase1_dispute_fairness_en.md",
    ),
    (
        "docs/phase1_minimal_dispute_spec_en.md",
        REPO_ROOT / "docs" / "phase1_minimal_dispute_spec_en.md",
    ),
    (
        "docs/phase1_requester_protection_spec_en.md",
        REPO_ROOT / "docs" / "phase1_requester_protection_spec_en.md",
    ),
    (
        "docs/phase1_minimal_scope_cutlist_en.md",
        REPO_ROOT / "docs" / "phase1_minimal_scope_cutlist_en.md",
    ),
    (
        "docs/adjudication_antipatterns_en.md",
        REPO_ROOT / "docs" / "adjudication_antipatterns_en.md",
    ),
    (
        "docs/dispute_record_publication_en.md",
        REPO_ROOT / "docs" / "dispute_record_publication_en.md",
    ),
    (
        "docs/external_explanation_notes_en.md",
        REPO_ROOT / "docs" / "external_explanation_notes_en.md",
    ),
    (
        "docs/release_checklist_en.md",
        REPO_ROOT / "docs" / "release_checklist_en.md",
    ),
    (
        "docs/identity_nullifier_scope_en.md",
        REPO_ROOT / "docs" / "identity_nullifier_scope_en.md",
    ),
    (
        "docs/identity_registry_notes_en.md",
        REPO_ROOT / "docs" / "identity_registry_notes_en.md",
    ),
    (
        "docs/integrity_continuity_notes_en.md",
        REPO_ROOT / "docs" / "integrity_continuity_notes_en.md",
    ),
    (
        "docs/grants_onepager_en.md",
        REPO_ROOT / "docs" / "grants_onepager_en.md",
    ),
    (
        "docs/demo_runbook_en.md",
        REPO_ROOT / "docs" / "demo_runbook_en.md",
    ),
    (
        "docs/grants_use_of_funds_en.md",
        REPO_ROOT / "docs" / "grants_use_of_funds_en.md",
    ),
]

HEADER = """# FairSoil Review Bundle (EN)

This file bundles the core documents for external review.  
Note: This is a generated bundle (do not edit). Apply changes to the source documents instead.
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
