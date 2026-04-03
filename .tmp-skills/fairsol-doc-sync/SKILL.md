---
name: fairsol-doc-sync
description: Use when code or product changes in FairSoil may require synchronized updates to README.md, README_ja.md, source docs, and the generated English/Japanese review bundles.
---

# FairSoil Doc Sync

## Overview

Use this skill whenever FairSoil changes may leave documentation or generated bundles out of sync.

This repo is unusual because product changes often need parallel updates across:

- `README.md`
- `README_ja.md`
- one or more source docs in `docs/`
- generated bundles:
  - `docs/review_bundle_en.md`
  - `docs/review_bundle_ja.md`

The goal is not to rewrite everything. The goal is to update the smallest correct set of docs, keep English and Japanese aligned at the right level, and regenerate bundles when the source set changed.

## When To Use

Use this skill when the user asks to:

- update docs after a feature change
- keep English and Japanese docs in sync
- regenerate the review bundles
- decide whether a change belongs in README, a source doc, the bundle generator, or nowhere
- check whether a code change needs doc updates before closing the task

Typical triggers:

- new UI flow
- changed contract role or dispute logic
- new env vars or deployment steps
- new runbook or checklist
- new source docs that should be included in bundle generation

## Workflow

### 1. Classify the change

Decide which class of change happened:

- product behavior
- operator/deployment workflow
- identity flow
- dispute flow
- docs-only clarification
- bundle generation scope

### 2. Update the right source docs first

Prefer updating source docs, not bundle outputs directly.

Common targets:

- `README.md` / `README_ja.md` for entry-point summaries
- focused docs in `docs/` for detailed specs and notes
- runbooks and checklists for operational changes

### 3. Keep English and Japanese aligned by intent

Do not force sentence-by-sentence identity.

Check that both sides cover the same:

- product meaning
- implementation status
- limitations
- operator steps

### 4. Regenerate bundles only when needed

If a source doc included by the generators changed, run:

- `python scripts/build_review_bundle_en.py`
- `python scripts/build_review_bundle_ja.py`

If a new doc should appear in the bundles, update the generator source list first.

### 5. Report what was intentionally not updated

If a change does not belong in README or does not need both languages, say that explicitly.

## Repo-Specific Rules

- `docs/review_bundle_ja.md` is generated output, not the editing source
- `docs/review_bundle_en.md` is generated output, not the editing source
- `README.md` and `README_ja.md` should stay concise and point to detailed docs
- avoid duplicating long explanations in both README and source specs

## Review Checklist

Before closing, check:

1. does the user-facing meaning match the code?
2. do both languages point to the same source of truth?
3. were bundle generators updated if a new source doc was added?
4. were generated bundles rebuilt if their sources changed?
5. did the final summary clearly say what docs were updated and what was left alone?

## Anti-Patterns

Avoid these:

- editing bundles manually without updating their source docs
- updating Japanese docs but forgetting English, or the reverse, when the change is product-relevant
- putting detailed operational rules only in README
- regenerating bundles without checking whether the generator source list is stale
