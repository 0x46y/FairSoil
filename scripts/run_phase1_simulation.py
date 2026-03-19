#!/usr/bin/env python3
"""Run a coarse Phase1 FairSoil simulation for stability and fairness checks.

Usage:
  python scripts/run_phase1_simulation.py --scenario A
  python scripts/run_phase1_simulation.py --scenario D --days 365 --seed 7
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import random
from dataclasses import dataclass, field
from pathlib import Path
from statistics import median


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT_DIR = REPO_ROOT / "tmp" / "phase1_simulations"
SURVIVAL_BUFFER = 1_000.0
CLAIM_GRACE_DAYS = 30
DEFAULT_DAILY_DECAY = 0.01
CRYSTALLIZATION_FEE_BPS = 2_000
GOVERNANCE_MIN_B = 1.0
GOVERNANCE_MIN_INTEGRITY = 100.0
DEFENSE_QUOTA_MIN_INTEGRITY = 100.0
DEFENSE_QUOTA_PER_MONTH = 2
DEFAULT_DISPUTE_DEPOSIT_RATE = 0.05


@dataclass
class Participant:
    pid: int
    cohort: str
    join_day: int
    a_balance: float
    b_balance: float
    integrity: float
    pending_ubi: list[tuple[int, float]] = field(default_factory=list)
    defense_quota_month: int = -1
    defense_quota_used: int = 0
    used_virtual_stake: int = 0
    disputes_won: int = 0
    disputes_lost: int = 0
    covenant_success: int = 0
    was_active: bool = False
    first_day_with_1b: int | None = None
    first_day_with_governance: int | None = None

    def reset_month_if_needed(self, day: int) -> None:
        month = day // 30
        if self.defense_quota_month != month:
            self.defense_quota_month = month
            self.defense_quota_used = 0


@dataclass
class Covenant:
    reward_b: float
    creator_id: int
    worker_id: int
    funding_token: str
    mode: str
    liability_b: float
    created_day: int
    settle_day: int
    disputed: bool = False
    finalized: bool = False


@dataclass
class Scenario:
    name: str
    participants: int
    newcomer_fraction: float
    newcomer_day: int
    claim_probability: float
    work_rate: float
    dispute_rate: float
    delayed_rate: float
    token_a_funding_rate: float
    appi_base: float
    appi_shock_day: int | None
    appi_shock_factor: float
    skewed_elite_fraction: float
    skewed_elite_b: float
    skewed_elite_integrity: float


@dataclass
class SimulationConfig:
    governance_min_b: float = GOVERNANCE_MIN_B
    governance_min_integrity: float = GOVERNANCE_MIN_INTEGRITY
    defense_quota_min_integrity: float = DEFENSE_QUOTA_MIN_INTEGRITY
    defense_quota_per_month: int = DEFENSE_QUOTA_PER_MONTH
    dispute_deposit_rate: float = DEFAULT_DISPUTE_DEPOSIT_RATE
    dispute_integrity_weight: float = 1.0
    low_balance_worker_bonus: float = 0.0
    high_balance_creator_penalty: float = 0.0
    arbiter_noise_scale: float = 25.0


SCENARIOS: dict[str, Scenario] = {
    "A": Scenario("steady_village", 100, 0.15, 90, 0.65, 0.08, 0.05, 0.20, 0.15, 100.0, None, 1.0, 0.0, 0.0, 0.0),
    "B": Scenario("appi_shock", 100, 0.15, 90, 0.65, 0.08, 0.05, 0.20, 0.15, 100.0, 30, 1.9, 0.0, 0.0, 0.0),
    "C": Scenario("stagnation", 100, 0.15, 120, 0.30, 0.03, 0.03, 0.15, 0.10, 100.0, None, 1.0, 0.0, 0.0, 0.0),
    "D": Scenario("inequality_pressure", 120, 0.25, 120, 0.55, 0.07, 0.05, 0.20, 0.20, 100.0, None, 1.0, 0.10, 25.0, 180.0),
    "E": Scenario("dispute_pressure", 100, 0.20, 75, 0.60, 0.08, 0.20, 0.25, 0.10, 100.0, None, 1.0, 0.0, 0.0, 0.0),
}


class Phase1Simulation:
    def __init__(
        self,
        scenario: Scenario,
        days: int,
        seed: int,
        config: SimulationConfig | None = None,
    ) -> None:
        self.scenario = scenario
        self.days = days
        self.config = config or SimulationConfig()
        self.rng = random.Random(seed)
        self.participants: list[Participant] = []
        self.open_covenants: list[Covenant] = []
        self.daily_rows: list[dict[str, float | int | str]] = []
        self.daily_ubi = 100.0
        self.last_appi = self.scenario.appi_base
        self.a_supply_total = 0.0
        self.a_unclaimed_total = 0.0
        self.a_decay_burn_total = 0.0
        self.b_supply_total = 0.0
        self.b_reserves = 20_000.0
        self.b_liabilities = 0.0
        self.crystallized_a_total = 0.0
        self.crystallized_b_total = 0.0
        self.virtual_stake_usage_total = 0
        self.defense_quota_usage_total = 0
        self.defense_quota_eligible_total = 0
        self.dispute_records: list[tuple[str, bool]] = []
        self._seed_population()

    def _seed_population(self) -> None:
        for pid in range(self.scenario.participants):
            cohort = "mixed"
            participant = Participant(
                pid=pid,
                cohort=cohort,
                join_day=0,
                a_balance=self.rng.uniform(20.0, 120.0),
                b_balance=self.rng.uniform(0.2, 3.0),
                integrity=self.rng.uniform(5.0, 40.0),
            )
            self.participants.append(participant)
            self.a_supply_total += participant.a_balance
            self.b_supply_total += participant.b_balance

        elite_count = int(len(self.participants) * self.scenario.skewed_elite_fraction)
        for participant in self.participants[:elite_count]:
            participant.b_balance += self.scenario.skewed_elite_b
            participant.integrity += self.scenario.skewed_elite_integrity
            self.b_supply_total += self.scenario.skewed_elite_b

    def run(self) -> None:
        for day in range(self.days):
            self._add_newcomers(day)
            appi = self._appi_for_day(day)
            self._apply_appi(appi)
            self._accrue_ubi(day)
            self._apply_a_decay()
            self._process_claims(day)
            self._process_new_covenants(day)
            self._finalize_due_covenants(day)
            self._update_milestones(day)
            self._record_day(day, appi)

    def _add_newcomers(self, day: int) -> None:
        if day != self.scenario.newcomer_day:
            return
        newcomer_count = int(self.scenario.participants * self.scenario.newcomer_fraction)
        start_pid = len(self.participants)
        for offset in range(newcomer_count):
            participant = Participant(
                pid=start_pid + offset,
                cohort="newcomer",
                join_day=day,
                a_balance=self.rng.uniform(0.0, 10.0),
                b_balance=0.0,
                integrity=self.rng.uniform(0.0, 8.0),
            )
            self.participants.append(participant)
            self.a_supply_total += participant.a_balance
            self.b_supply_total += participant.b_balance

    def _appi_for_day(self, day: int) -> float:
        base = self.scenario.appi_base
        wave = 6.0 * math.sin(day / 14.0)
        noise = self.rng.uniform(-2.0, 2.0)
        value = base + wave + noise
        if self.scenario.appi_shock_day is not None and day >= self.scenario.appi_shock_day:
            value *= self.scenario.appi_shock_factor
        return max(10.0, value)

    def _apply_appi(self, appi: float) -> None:
        max_up = self.daily_ubi * 1.05
        max_down = self.daily_ubi * 0.98
        target = appi
        if target > max_up:
            self.daily_ubi = max_up
        elif target < max_down:
            self.daily_ubi = max_down
        else:
            self.daily_ubi = target
        self.last_appi = appi

    def _accrue_ubi(self, day: int) -> None:
        for participant in self.participants:
            if participant.join_day > day:
                continue
            participant.pending_ubi.append((day, self.daily_ubi))
            self.a_unclaimed_total += self.daily_ubi

    def _apply_a_decay(self) -> None:
        for participant in self.participants:
            if participant.a_balance <= SURVIVAL_BUFFER:
                continue
            decayable = participant.a_balance - SURVIVAL_BUFFER
            burned = decayable * DEFAULT_DAILY_DECAY
            participant.a_balance -= burned
            self.a_supply_total -= burned
            self.a_decay_burn_total += burned

    def _process_claims(self, day: int) -> None:
        for participant in self.participants:
            if participant.join_day > day or self.rng.random() > self.scenario.claim_probability:
                continue
            gross = 0.0
            decayed = 0.0
            for accrued_day, amount in participant.pending_ubi:
                age = day - accrued_day
                gross += amount
                if age <= CLAIM_GRACE_DAYS:
                    decayed += amount
                else:
                    extra_days = age - CLAIM_GRACE_DAYS
                    decayed += amount * max(0.0, 1.0 - DEFAULT_DAILY_DECAY * extra_days)
            if gross == 0.0:
                continue
            burned = gross - decayed
            self.a_unclaimed_total -= gross
            self.a_decay_burn_total += burned
            participant.pending_ubi.clear()
            participant.a_balance += decayed
            self.a_supply_total += decayed
            participant.was_active = True

    def _process_new_covenants(self, day: int) -> None:
        participant_count = sum(1 for p in self.participants if p.join_day <= day)
        covenant_count = int(participant_count * self.scenario.work_rate)
        for _ in range(covenant_count):
            creator = self._pick_creator(day)
            worker = self._pick_worker(day, creator.pid if creator else -1)
            if creator is None or worker is None:
                continue
            reward = self.rng.uniform(5.0, 30.0) * self._reward_multiplier()
            delayed = self.rng.random() < self.scenario.delayed_rate
            funding_token = "A" if self.rng.random() < self.scenario.token_a_funding_rate else "B"
            payout_preview = reward if funding_token == "B" else self._preview_crystallization(reward)
            if funding_token == "B":
                if creator.b_balance < reward:
                    continue
                creator.b_balance -= reward
            else:
                if creator.a_balance < reward:
                    continue
                creator.a_balance -= reward
                self.a_supply_total -= reward
            settle_day = day + (self.rng.randint(2, 7) if delayed else self.rng.randint(0, 3))
            covenant = Covenant(
                reward_b=reward,
                creator_id=creator.pid,
                worker_id=worker.pid,
                funding_token=funding_token,
                mode="delayed" if delayed else "escrow",
                liability_b=payout_preview,
                created_day=day,
                settle_day=settle_day,
                disputed=self.rng.random() < self.scenario.dispute_rate,
            )
            self.open_covenants.append(covenant)
            self.b_liabilities += payout_preview

    def _finalize_due_covenants(self, day: int) -> None:
        remaining: list[Covenant] = []
        for covenant in self.open_covenants:
            if covenant.settle_day > day:
                remaining.append(covenant)
                continue
            creator = self.participants[covenant.creator_id]
            worker = self.participants[covenant.worker_id]
            payout_b = covenant.liability_b
            if covenant.disputed:
                payout_b = self._resolve_dispute(covenant, creator, worker)
            if covenant.funding_token == "A":
                if self.b_reserves < payout_b:
                    remaining.append(covenant)
                    continue
                self.b_reserves -= payout_b
                self.crystallized_a_total += covenant.reward_b
                self.crystallized_b_total += payout_b
                self.b_supply_total += payout_b
            else:
                creator_refund = max(0.0, covenant.reward_b - payout_b)
                if creator_refund > 0:
                    creator.b_balance += creator_refund
            worker.b_balance += payout_b
            worker.integrity += self.rng.uniform(2.0, 8.0)
            worker.covenant_success += 1
            worker.was_active = True
            creator.was_active = True
            self.b_liabilities -= covenant.liability_b
        self.open_covenants = remaining

    def _resolve_dispute(self, covenant: Covenant, creator: Participant, worker: Participant) -> float:
        worker_bucket = self._balance_bucket(worker.b_balance)
        deposit = max(1.0, self.config.dispute_deposit_rate * covenant.liability_b)
        self._use_dispute_protection(worker, deposit)
        self._use_dispute_protection(creator, deposit)
        worker_strength = (
            worker.integrity * self.config.dispute_integrity_weight
            + self.rng.uniform(0.0, self.config.arbiter_noise_scale)
        )
        creator_strength = (
            creator.integrity * self.config.dispute_integrity_weight
            + self.rng.uniform(0.0, self.config.arbiter_noise_scale)
        )
        if worker.b_balance < 1.0:
            worker_strength += self.config.low_balance_worker_bonus
        if creator.b_balance >= 10.0:
            creator_strength -= self.config.high_balance_creator_penalty
        bias = 0.0
        if self.scenario.name == "dispute_pressure":
            bias = self.rng.uniform(-5.0, 5.0)
        worker_share_bps = 0.5 + max(-0.25, min(0.25, (worker_strength - creator_strength + bias) / 100.0))
        if worker_share_bps >= 0.5:
            worker.disputes_won += 1
            creator.disputes_lost += 1
            self.dispute_records.append((worker_bucket, True))
        else:
            worker.disputes_lost += 1
            creator.disputes_won += 1
            self.dispute_records.append((worker_bucket, False))
        return covenant.liability_b * worker_share_bps

    def _use_dispute_protection(self, participant: Participant, deposit: float) -> None:
        participant.reset_month_if_needed(self._current_day())
        if (
            participant.integrity >= self.config.defense_quota_min_integrity
            and participant.defense_quota_used < self.config.defense_quota_per_month
        ):
            participant.defense_quota_used += 1
            self.defense_quota_usage_total += 1
            self.defense_quota_eligible_total += 1
            participant.was_active = True
            return
        if participant.integrity >= self.config.defense_quota_min_integrity:
            self.defense_quota_eligible_total += 1
        if participant.b_balance >= deposit:
            participant.b_balance -= deposit
            participant.b_balance += deposit
            return
        participant.used_virtual_stake += 1
        self.virtual_stake_usage_total += 1
        participant.was_active = True

    def _pick_creator(self, day: int) -> Participant | None:
        candidates = [
            p for p in self.participants if p.join_day <= day and (p.b_balance >= 5.0 or p.a_balance >= 5.0)
        ]
        return self.rng.choice(candidates) if candidates else None

    def _pick_worker(self, day: int, exclude_pid: int) -> Participant | None:
        candidates = [p for p in self.participants if p.join_day <= day and p.pid != exclude_pid]
        return self.rng.choice(candidates) if candidates else None

    def _preview_crystallization(self, burned_a: float) -> float:
        return burned_a * (10_000 - CRYSTALLIZATION_FEE_BPS) / 10_000.0

    def _reward_multiplier(self) -> float:
        ratio = self.last_appi / max(self.scenario.appi_base, 1.0)
        return max(0.75, min(2.5, ratio))

    def _current_day(self) -> int:
        return len(self.daily_rows)

    def _update_milestones(self, day: int) -> None:
        for participant in self.participants:
            if participant.join_day > day:
                continue
            if participant.first_day_with_1b is None and participant.b_balance >= 1.0:
                participant.first_day_with_1b = day
            if (
                participant.first_day_with_governance is None
                and (
                    participant.b_balance >= self.config.governance_min_b
                    or participant.integrity >= self.config.governance_min_integrity
                )
            ):
                participant.first_day_with_governance = day

    def _record_day(self, day: int, appi: float) -> None:
        b_balances = [p.b_balance for p in self.participants if p.join_day <= day]
        integrity = [p.integrity for p in self.participants if p.join_day <= day]
        row = {
            "day": day,
            "scenario": self.scenario.name,
            "appi": round(appi, 4),
            "daily_ubi_amount": round(self.daily_ubi, 4),
            "a_supply_total": round(self.a_supply_total, 4),
            "a_unclaimed_total": round(self.a_unclaimed_total, 4),
            "a_decay_burn_total": round(self.a_decay_burn_total, 4),
            "b_supply_total": round(self.b_supply_total, 4),
            "b_reserves": round(self.b_reserves, 4),
            "b_liabilities": round(self.b_liabilities, 4),
            "reserve_coverage_ratio": round(self._reserve_coverage_ratio(), 4),
            "crystallized_a_total": round(self.crystallized_a_total, 4),
            "crystallized_b_total": round(self.crystallized_b_total, 4),
            "top10_b_share": round(self._top_share(b_balances, 10), 4),
            "median_b_balance": round(median(b_balances) if b_balances else 0.0, 4),
            "gini_b": round(self._gini(b_balances), 4),
            "gini_integrity": round(self._gini(integrity), 4),
            "virtual_stake_usage_rate": round(self.virtual_stake_usage_total / max(1, len(self.dispute_records)), 4),
            "defense_quota_usage_rate": round(self.defense_quota_usage_total / max(1, len(self.dispute_records)), 4),
            "defense_quota_eligible_total": self.defense_quota_eligible_total,
        }
        self.daily_rows.append(row)

    def summary(self) -> dict[str, object]:
        final_day = self.days - 1
        active = [p for p in self.participants if p.join_day <= final_day]
        newcomer_days_to_1b = [
            p.first_day_with_1b - p.join_day
            for p in active
            if p.cohort == "newcomer" and p.first_day_with_1b is not None
        ]
        newcomer_days_to_gov = [
            p.first_day_with_governance - p.join_day
            for p in active
            if p.cohort == "newcomer" and p.first_day_with_governance is not None
        ]
        low_balance = [p for p in active if p.b_balance < 1.0]
        recovery_rate = (
            sum(1 for p in low_balance if p.integrity >= 20.0 or p.was_active) / max(1, len(low_balance))
        )
        inactive_reentry_rate = (
            sum(1 for p in active if p.cohort == "newcomer" and p.was_active)
            / max(1, sum(1 for p in active if p.cohort == "newcomer"))
        )
        zero_b_active_ratio = sum(1 for p in active if p.b_balance <= 0.01 and p.was_active) / max(1, len(active))
        newcomer_success_rate = (
            sum(p.covenant_success for p in active if p.cohort == "newcomer")
            / max(1, sum(1 for p in active if p.cohort == "newcomer"))
        )
        summary = {
            "scenario": self.scenario.name,
            "days": self.days,
            "participants_final": len(active),
            "final_daily_ubi_amount": round(self.daily_ubi, 4),
            "final_reserve_coverage_ratio": round(self._reserve_coverage_ratio(), 4),
            "final_top10_b_share": round(self._top_share([p.b_balance for p in active], 10), 4),
            "final_gini_b": round(self._gini([p.b_balance for p in active]), 4),
            "final_gini_integrity": round(self._gini([p.integrity for p in active]), 4),
            "newcomer_time_to_1B_proxy": None if not newcomer_days_to_1b else min(newcomer_days_to_1b),
            "newcomer_time_to_governance_proxy": None if not newcomer_days_to_gov else min(newcomer_days_to_gov),
            "recovery_rate_30d_proxy": round(recovery_rate, 4),
            "inactive_reentry_rate": round(inactive_reentry_rate, 4),
            "zero_B_but_active_ratio": round(zero_b_active_ratio, 4),
            "covenant_success_rate_newcomer": round(newcomer_success_rate, 4),
            "dispute_win_rate_by_balance_bucket": self._dispute_win_rates(),
            "virtual_stake_usage_rate": round(self.virtual_stake_usage_total / max(1, len(self.dispute_records)), 4),
            "defense_quota_usage_rate": round(self.defense_quota_usage_total / max(1, len(self.dispute_records)), 4),
            "defense_quota_eligible_total": self.defense_quota_eligible_total,
            "config_governance_min_b": self.config.governance_min_b,
            "config_governance_min_integrity": self.config.governance_min_integrity,
            "config_defense_quota_min_integrity": self.config.defense_quota_min_integrity,
            "config_defense_quota_per_month": self.config.defense_quota_per_month,
            "config_dispute_deposit_rate": self.config.dispute_deposit_rate,
            "config_dispute_integrity_weight": self.config.dispute_integrity_weight,
            "config_low_balance_worker_bonus": self.config.low_balance_worker_bonus,
            "config_high_balance_creator_penalty": self.config.high_balance_creator_penalty,
            "config_arbiter_noise_scale": self.config.arbiter_noise_scale,
            "warning_flags": self._warning_flags(active),
        }
        return summary

    def write_outputs(self, out_dir: Path) -> tuple[Path, Path]:
        out_dir.mkdir(parents=True, exist_ok=True)
        csv_path = out_dir / f"{self.scenario.name}_daily.csv"
        json_path = out_dir / f"{self.scenario.name}_summary.json"
        with csv_path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(self.daily_rows[0].keys()))
            writer.writeheader()
            writer.writerows(self.daily_rows)
        json_path.write_text(json.dumps(self.summary(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        return csv_path, json_path

    def _reserve_coverage_ratio(self) -> float:
        return self.b_reserves / max(self.b_liabilities, 1.0)

    def _warning_flags(self, active: list[Participant]) -> list[str]:
        flags: list[str] = []
        if self._reserve_coverage_ratio() < 1.0:
            flags.append("reserve_coverage_below_1")
        if self._top_share([p.b_balance for p in active], 10) > 0.65:
            flags.append("top10_b_share_above_65pct")
        if self._gini([p.b_balance for p in active]) > 0.7:
            flags.append("gini_b_above_0_7")
        newcomers = [p for p in active if p.cohort == "newcomer"]
        if newcomers and not any(p.b_balance >= 1.0 for p in newcomers):
            flags.append("newcomers_never_reach_1B")
        return flags

    def _dispute_win_rates(self) -> dict[str, float]:
        buckets: dict[str, list[bool]] = {}
        for bucket, won in self.dispute_records:
            buckets.setdefault(bucket, []).append(won)
        return {bucket: round(sum(wins) / len(wins), 4) for bucket, wins in buckets.items()}

    @staticmethod
    def _top_share(values: list[float], count: int) -> float:
        if not values:
            return 0.0
        total = sum(values)
        if total <= 0:
            return 0.0
        return sum(sorted(values, reverse=True)[:count]) / total

    @staticmethod
    def _gini(values: list[float]) -> float:
        if not values:
            return 0.0
        sorted_values = sorted(max(0.0, value) for value in values)
        total = sum(sorted_values)
        if total == 0.0:
            return 0.0
        weighted = 0.0
        for index, value in enumerate(sorted_values, start=1):
            weighted += index * value
        return (2 * weighted) / (len(sorted_values) * total) - (len(sorted_values) + 1) / len(sorted_values)

    @staticmethod
    def _balance_bucket(balance: float) -> str:
        if balance < 1.0:
            return "lt_1"
        if balance < 10.0:
            return "1_to_10"
        return "gte_10"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run FairSoil Phase1 simulation.")
    parser.add_argument("--scenario", choices=sorted(SCENARIOS.keys()), default="A")
    parser.add_argument("--days", type=int, default=180)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT_DIR)
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


def main() -> None:
    args = parse_args()
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
    simulation = Phase1Simulation(SCENARIOS[args.scenario], args.days, args.seed, config=config)
    simulation.run()
    csv_path, json_path = simulation.write_outputs(args.out_dir)
    print(f"Scenario: {simulation.scenario.name}")
    print(f"CSV: {csv_path}")
    print(f"Summary: {json_path}")
    print(json.dumps(simulation.summary(), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
