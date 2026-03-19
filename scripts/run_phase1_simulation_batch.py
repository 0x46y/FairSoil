#!/usr/bin/env python3
"""Run multiple Phase1 simulations and export a comparison CSV.

Usage:
  python scripts/run_phase1_simulation_batch.py
  python scripts/run_phase1_simulation_batch.py --days 365 --seed 7 --scenarios A B D E
"""
from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

from run_phase1_simulation import (
    DEFAULT_OUT_DIR,
    DEFENSE_QUOTA_MIN_INTEGRITY,
    DEFENSE_QUOTA_PER_MONTH,
    DEFAULT_DISPUTE_DEPOSIT_RATE,
    GOVERNANCE_MIN_B,
    GOVERNANCE_MIN_INTEGRITY,
    Phase1Simulation,
    SCENARIOS,
    SimulationConfig,
)


REPO_ROOT = Path(__file__).resolve().parents[1]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a batch of FairSoil Phase1 simulations.")
    parser.add_argument("--days", type=int, default=180)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT_DIR)
    parser.add_argument("--scenarios", nargs="+", choices=sorted(SCENARIOS.keys()), default=["A", "B", "D", "E"])
    parser.add_argument("--governance-min-b", type=float, default=GOVERNANCE_MIN_B)
    parser.add_argument("--governance-min-integrity", type=float, default=GOVERNANCE_MIN_INTEGRITY)
    parser.add_argument("--defense-quota-min-integrity", type=float, default=DEFENSE_QUOTA_MIN_INTEGRITY)
    parser.add_argument("--defense-quota-per-month", type=int, default=DEFENSE_QUOTA_PER_MONTH)
    parser.add_argument("--dispute-deposit-rate", type=float, default=DEFAULT_DISPUTE_DEPOSIT_RATE)
    parser.add_argument("--dispute-integrity-weight", type=float, default=1.0)
    parser.add_argument("--low-balance-worker-bonus", type=float, default=0.0)
    parser.add_argument("--high-balance-creator-penalty", type=float, default=0.0)
    parser.add_argument("--arbiter-noise-scale", type=float, default=25.0)
    return parser.parse_args()


def flatten_summary(summary: dict[str, object]) -> dict[str, object]:
    flat = dict(summary)
    dispute_rates = flat.pop("dispute_win_rate_by_balance_bucket", {})
    warning_flags = flat.get("warning_flags", [])
    for bucket in ("lt_1", "1_to_10", "gte_10"):
        flat[f"dispute_win_rate_{bucket}"] = dispute_rates.get(bucket)
    flat["warning_flags"] = ",".join(warning_flags) if isinstance(warning_flags, list) else warning_flags
    return flat


def main() -> None:
    args = parse_args()
    args.out_dir.mkdir(parents=True, exist_ok=True)

    flattened: list[dict[str, object]] = []
    raw_summaries: list[dict[str, object]] = []
    config = SimulationConfig(
        governance_min_b=args.governance_min_b,
        governance_min_integrity=args.governance_min_integrity,
        defense_quota_min_integrity=args.defense_quota_min_integrity,
        defense_quota_per_month=args.defense_quota_per_month,
        dispute_deposit_rate=args.dispute_deposit_rate,
        dispute_integrity_weight=args.dispute_integrity_weight,
        low_balance_worker_bonus=args.low_balance_worker_bonus,
        high_balance_creator_penalty=args.high_balance_creator_penalty,
        arbiter_noise_scale=args.arbiter_noise_scale,
    )

    for scenario_key in args.scenarios:
        simulation = Phase1Simulation(SCENARIOS[scenario_key], args.days, args.seed, config=config)
        simulation.run()
        _, json_path = simulation.write_outputs(args.out_dir)
        summary = simulation.summary()
        raw_summaries.append(summary)
        flattened.append(flatten_summary(summary))
        print(f"{scenario_key}: {json_path}")

    fieldnames: list[str] = []
    for row in flattened:
        for key in row.keys():
            if key not in fieldnames:
                fieldnames.append(key)

    comparison_csv = args.out_dir / "phase1_summary_comparison.csv"
    with comparison_csv.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(flattened)

    comparison_json = args.out_dir / "phase1_summary_comparison.json"
    comparison_json.write_text(json.dumps(raw_summaries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Comparison CSV: {comparison_csv}")
    print(f"Comparison JSON: {comparison_json}")


if __name__ == "__main__":
    main()
