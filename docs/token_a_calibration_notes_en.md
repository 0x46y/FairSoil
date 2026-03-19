# Token A Calibration Note (Phase1)

This note explains how to interpret the current `Token A` daily amount and how FairSoil may later calibrate it toward real-world living-cost intuition.

## What it means right now

- The current initial `dailyUBIAmount` is `100 Token A / day`.
- This is a **Phase1 starting parameter for testing the system's behavior**, not a value already calibrated to real minimum living costs.
- Issuance is daily, but claiming can still happen in weekly or monthly batches.

## Why it is not yet tied to real prices

Phase1 is primarily trying to verify that:

- UBI issuance and decay do not break the system quickly
- Treasury and Covenant accounting remain consistent
- disputes do not become structurally unfair to weaker users
- participants can understand the UI and main flows

So the current approach is to **validate the mechanism first and calibrate the absolute amount later**.

## Future calibration direction

Over time, `Token A` is expected to move closer to real living-cost intuition through:

1. `APPI`
   an internal purchasing-power index that adjusts daily distribution levels
2. `Survival Buffer`
   a floor that preserves minimum living space even under decay
3. `Village-specific baseline`
   parameterized starting levels for different villages or local conditions

## What the next stage would need

To calibrate `Token A` more realistically, the project will likely need:

- a minimum food basket
- a minimum housing-burden proxy
- baseline communication and mobility costs
- region-sensitive APPI baselines

## Bottom line

- `100 Token A / day` is not yet a real-world subsistence guarantee.
- It is a Phase1 starting value used to test whether the mechanism behaves safely.
- More realistic price calibration is expected later through `APPI` and `Survival Buffer`.
