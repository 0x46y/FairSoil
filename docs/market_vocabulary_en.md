# Market Vocabulary (EN)

This note defines the comparison vocabulary used by Phase1 `Template`, `Covenant`, and `Resource Registry` flows.

The goal is to prevent price baselines from fragmenting due to free-form labels, and to keep range warnings consistent.

## 1. Why this exists

If scope and urgency stay free-form, the same class of work can fragment into labels like:

- `repair`
- `plumbing repair`
- `urgent plumbing`
- `fix pipe`

That breaks comparable ranges.

Phase1 therefore prefers **fixed vocabulary first**, with aliases normalized into standard categories.

## 2. Scope vocabulary

Current standard scopes:

- `general`
- `repair`
- `delivery`
- `audit`
- `tutoring`
- `education-support`
- `care-support`
- `emergency-support`
- `field-ops`

### Operational rule

- Use UI choices first
- Add new scopes only deliberately
- Normalize synonyms into existing scopes when possible

## 3. Material class vocabulary

Current standard material classes:

- `standard`
- `light`
- `specialized`
- `scarce`

### Interpretation

- `standard`
  common tools, consumables, ordinary parts
- `light`
  jobs with unusually low material cost
- `specialized`
  jobs needing specialized parts or equipment
- `scarce`
  regulated, rare, or supply-constrained materials

## 4. Urgency vocabulary

Current standard urgency levels:

- `normal`
- `soon`
- `same-day`
- `emergency`

### Interpretation

- `normal`
  ordinary scheduled work
- `soon`
  accelerated but not critical
- `same-day`
  must be handled on the same day
- `emergency`
  immediate response with high cost of delay

## 5. Hours band

Comparison uses banded time instead of raw hours:

- `0-2h`
- `2-8h`
- `8-24h`
- `24h+`
- `unspecified`

This avoids over-fragmenting the market on tiny differences.

## 6. Current comparison key

Phase1 market baselines are grouped by:

- `scope`
- `urgency`
- `material class`
- `hours band`

So the effective key is:

`scope + urgency + material class + hours band`

## 7. Future extensions

Possible Phase2 dimensions:

- geography / region
- certification level
- equipment class
- regulatory burden
- seasonality

But Phase1 should stay conservative and preserve enough sample size per category.

## 8. Operational guidance

- prefer fixed vocabulary over free text
- handle synonyms through normalization
- use the same table in UI and docs
- avoid adding categories faster than the market can populate them

## 9. Bottom line

- Phase1 prioritizes comparability over expressive labeling
- scope / material / urgency / hours band should stay standardized
- market-baseline quality depends on this shared vocabulary
