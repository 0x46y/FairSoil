#!/usr/bin/env python3
"""Sweep a few Phase1 simulation parameters and export comparison tables.

Usage:
  python scripts/run_phase1_parameter_sweep.py --scenario D
  python scripts/run_phase1_parameter_sweep.py --scenario E --days 365 --seed 7
"""
from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

from run_phase1_simulation import DEFAULT_OUT_DIR, Phase1Simulation, SCENARIOS, SimulationConfig
from run_phase1_simulation_batch import flatten_summary


PRESETS = [
    {
        "label": "baseline",
        "governance_min_b": 1.0,
        "governance_min_integrity": 100.0,
        "defense_quota_min_integrity": 100.0,
        "defense_quota_per_month": 2,
        "dispute_deposit_rate": 0.05,
        "dispute_integrity_weight": 1.0,
        "low_balance_worker_bonus": 0.0,
        "high_balance_creator_penalty": 0.0,
        "arbiter_noise_scale": 25.0,
    },
    {
        "label": "lighter_disputes",
        "governance_min_b": 1.0,
        "governance_min_integrity": 100.0,
        "defense_quota_min_integrity": 100.0,
        "defense_quota_per_month": 2,
        "dispute_deposit_rate": 0.02,
        "dispute_integrity_weight": 1.0,
        "low_balance_worker_bonus": 0.0,
        "high_balance_creator_penalty": 0.0,
        "arbiter_noise_scale": 25.0,
    },
    {
        "label": "easier_defense_quota",
        "governance_min_b": 1.0,
        "governance_min_integrity": 100.0,
        "defense_quota_min_integrity": 60.0,
        "defense_quota_per_month": 4,
        "dispute_deposit_rate": 0.05,
        "dispute_integrity_weight": 1.0,
        "low_balance_worker_bonus": 0.0,
        "high_balance_creator_penalty": 0.0,
        "arbiter_noise_scale": 25.0,
    },
    {
        "label": "combined_relief",
        "governance_min_b": 0.5,
        "governance_min_integrity": 80.0,
        "defense_quota_min_integrity": 60.0,
        "defense_quota_per_month": 4,
        "dispute_deposit_rate": 0.02,
        "dispute_integrity_weight": 1.0,
        "low_balance_worker_bonus": 0.0,
        "high_balance_creator_penalty": 0.0,
        "arbiter_noise_scale": 25.0,
    },
    {
        "label": "softer_balance_bias",
        "governance_min_b": 1.0,
        "governance_min_integrity": 100.0,
        "defense_quota_min_integrity": 60.0,
        "defense_quota_per_month": 4,
        "dispute_deposit_rate": 0.05,
        "dispute_integrity_weight": 0.6,
        "low_balance_worker_bonus": 6.0,
        "high_balance_creator_penalty": 4.0,
        "arbiter_noise_scale": 30.0,
    },
    {
        "label": "external_arbiter_style",
        "governance_min_b": 0.5,
        "governance_min_integrity": 80.0,
        "defense_quota_min_integrity": 50.0,
        "defense_quota_per_month": 4,
        "dispute_deposit_rate": 0.02,
        "dispute_integrity_weight": 0.35,
        "low_balance_worker_bonus": 10.0,
        "high_balance_creator_penalty": 6.0,
        "arbiter_noise_scale": 35.0,
    },
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sweep FairSoil Phase1 simulation parameters.")
    parser.add_argument("--scenario", choices=["B", "D", "E"], default="D")
    parser.add_argument("--days", type=int, default=180)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT_DIR)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    args.out_dir.mkdir(parents=True, exist_ok=True)

    flattened_rows: list[dict[str, object]] = []
    raw_summaries: list[dict[str, object]] = []

    for preset in PRESETS:
        config = SimulationConfig(
            governance_min_b=preset["governance_min_b"],
            governance_min_integrity=preset["governance_min_integrity"],
            defense_quota_min_integrity=preset["defense_quota_min_integrity"],
            defense_quota_per_month=preset["defense_quota_per_month"],
            dispute_deposit_rate=preset["dispute_deposit_rate"],
            dispute_integrity_weight=preset["dispute_integrity_weight"],
            low_balance_worker_bonus=preset["low_balance_worker_bonus"],
            high_balance_creator_penalty=preset["high_balance_creator_penalty"],
            arbiter_noise_scale=preset["arbiter_noise_scale"],
        )
        simulation = Phase1Simulation(SCENARIOS[args.scenario], args.days, args.seed, config=config)
        simulation.run()
        summary = simulation.summary()
        summary["sweep_label"] = preset["label"]
        raw_summaries.append(summary)

        row = flatten_summary(summary)
        row["sweep_label"] = preset["label"]
        flattened_rows.append(row)
        print(
            f'{preset["label"]}: lt_1={row.get("dispute_win_rate_lt_1")} '
            f'quota={row.get("defense_quota_usage_rate")} '
            f'gini_b={row.get("final_gini_b")}'
        )

    fieldnames: list[str] = []
    for row in flattened_rows:
        for key in row.keys():
            if key not in fieldnames:
                fieldnames.append(key)

    csv_path = args.out_dir / f"{SCENARIOS[args.scenario].name}_parameter_sweep.csv"
    with csv_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(flattened_rows)

    json_path = args.out_dir / f"{SCENARIOS[args.scenario].name}_parameter_sweep.json"
    json_path.write_text(json.dumps(raw_summaries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Sweep CSV: {csv_path}")
    print(f"Sweep JSON: {json_path}")


if __name__ == "__main__":
    main()
