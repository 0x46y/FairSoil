# FairSoil Phase2 Parameter Catalog（JA）

このドキュメントは、将来 `Factory` や `multi-village` を導入する前提で、  
**どの値を village ごとの parameter set として切り出すべきか**を整理したものです。

目的は次の2つです。

- Phase1 の「1つの村」前提を、将来 village ごとの差分に拡張しやすくする
- `deploy/init` を「コントラクトを並べる処理」から「parameter set を流し込む処理」へ寄せる

## 1. 基本方針

Phase2 で village を複数作るなら、各 village は少なくとも次の3層を持つ。

- kernel
  共通ロジック。Token / Treasury / Covenant / Registry など
- parameter set
  UBI、clamp、governance、dispute、royalty など village ごとに変わる値
- governance / operations
  誰が parameter を更新できるか

今の Phase1 では kernel と parameter が一部混ざっているため、  
まずは parameter を一覧化して「流し込み可能なもの」と「まだ constant のもの」を分ける。

## 2. Parameter 一覧

### 2-1. Token A / UBI / APPI

| パラメータ | 現在値/初期値 | 現在の扱い | 更新方法 | Phase2 方針 |
| --- | --- | --- | --- | --- |
| `DECAY_RATE_PER_SECOND` | env (`Deploy.s.sol`) | deploy-time | `FairSoilTokenA.initialize` | village ごと初期設定 |
| `SURVIVAL_BUFFER` | `1000e18` | `constant` | 不可 | village parameter 化候補 |
| `dailyUBIAmount` | `100e18` | mutable | `SoilTreasury.setDailyUBIAmount` | village parameter |
| `maxUbiIncreaseBps` | `500` | mutable | `SoilTreasury.setAPPIChangeLimits` | village parameter |
| `maxUbiDecreaseBps` | `200` | mutable | `SoilTreasury.setAPPIChangeLimits` | village parameter |
| `APPI minUniqueReporters` | `5` | mutable | `APPIOracle.setThresholds` | village parameter |
| `APPI minIntegrityScore` | `0` | mutable | `APPIOracle.setThresholds` | village parameter |
| `APPI confidenceBps` | `10000` | mutable | `APPIOracle.setConfidence` | village parameter |
| `APPI maxReportsPerCategory` | `50` | mutable | `APPIOracle.setConfidence` | village parameter |

### 2-2. Treasury / crystallization / governance

| パラメータ | 現在値/初期値 | 現在の扱い | 更新方法 | Phase2 方針 |
| --- | --- | --- | --- | --- |
| `governanceMinTokenB` | `1e18` | mutable | `SoilTreasury.setGovernanceThresholds` | village parameter |
| `governanceMinIntegrity` | `100` | mutable | `SoilTreasury.setGovernanceThresholds` | village parameter |
| `crystallizationRateBps` | `10000` | mutable | `SoilTreasury.setCrystallizationRateBps` | village parameter |
| `crystallizationFeeBps` | `2000` | mutable | `SoilTreasury.setCrystallizationFeeBps` | village parameter |
| `deficitCapA` | `0` | mutable | `SoilTreasury.setDeficitCapA` | village parameter |
| `advanceCapB` | `0` | mutable | `SoilTreasury.setAdvanceCapB` | village parameter |
| `circuitState` | `Normal` | mutable | `SoilTreasury.setCircuitState` | emergency ops, parameter ではなく運用状態 |

### 2-3. Covenant / dispute / jury

| パラメータ | 現在値/初期値 | 現在の扱い | 更新方法 | Phase2 方針 |
| --- | --- | --- | --- | --- |
| `disputeResolver` | deployer | mutable | `Covenant.setDisputeResolver` | village-specific resolver socket |
| `royaltyRouter` | deploy時接続 | mutable | `Covenant.setRoyaltyRouter` | village-specific plugin |
| `ISSUE_INTEGRITY_POINTS` | `20` | `constant` | 不可 | parameter 化候補 |
| `ISSUE_DEPOSIT_BPS` | `500` | `constant` | 不可 | parameter 化候補 |
| `COOLDOWN_DURATION` | `7 days` | `constant` | 不可 | parameter 化候補 |
| `DEFENSE_QUOTA_MIN_INTEGRITY` | `100` | `constant` | 不可 | parameter 化候補 |
| `DEFENSE_QUOTA_PER_MONTH` | `2` | `constant` | 不可 | parameter 化候補 |
| `SPAM_GUARD_MAX_EXPONENT` | `8` | `constant` | 不可 | parameter 化候補 |
| `JURY_SIZE` | `9` | `constant` | 不可 | parameter 化候補 |
| `JURY_EXPERT_SLOTS` | `3` | `constant` | 不可 | parameter 化候補 |
| `JURY_EXPERT_MIN_INTEGRITY` | `200` | `constant` | 不可 | parameter 化候補 |

### 2-4. Library / royalty / resource

| パラメータ | 現在値/初期値 | 現在の扱い | 更新方法 | Phase2 方針 |
| --- | --- | --- | --- | --- |
| `maxRoyaltyBps` | `1000` | mutable | `CovenantLibrary.setRoyaltyCaps` | village parameter |
| `maxRoyaltyAmount` | `50e18` | mutable | `CovenantLibrary.setRoyaltyCaps` | village parameter |
| `ROYALTY_DECAY_DURATION` | `730 days` | `constant` | 不可 | parameter 化候補 |

## 3. 今すぐ parameter set 化できるもの

現状のコードでも、次はすぐ village parameter として扱える。

- `DECAY_RATE_PER_SECOND`
- `dailyUBIAmount`
- `maxUbiIncreaseBps`
- `maxUbiDecreaseBps`
- `APPI` thresholds / confidence
- `governanceMinTokenB`
- `governanceMinIntegrity`
- `crystallizationRateBps`
- `crystallizationFeeBps`
- `deficitCapA`
- `advanceCapB`
- `disputeResolver`
- `royaltyRouter`
- `maxRoyaltyBps`
- `maxRoyaltyAmount`

これらは **Phase1 の単一村でも env / init script から流し込み可能** にしておくべきです。

## 4. まだ parameter 化されていない重要定数

Phase2 を見据えると、次の `constant` は将来 parameter 化の対象です。

- `SURVIVAL_BUFFER`
- `ISSUE_INTEGRITY_POINTS`
- `ISSUE_DEPOSIT_BPS`
- `COOLDOWN_DURATION`
- `DEFENSE_QUOTA_MIN_INTEGRITY`
- `DEFENSE_QUOTA_PER_MONTH`
- `SPAM_GUARD_MAX_EXPONENT`
- `JURY_SIZE`
- `JURY_EXPERT_SLOTS`
- `JURY_EXPERT_MIN_INTEGRITY`
- `ROYALTY_DECAY_DURATION`

ただし、これらを Phase1 で全部 mutable にする必要はありません。  
今は docs に一覧化し、Phase2 の設計時に「本当に village ごとに変えるか」を判断できれば十分です。

## 5. Phase1 の推奨 deploy/init 形

今の Phase1 では、次の2段で考えるのがよい。

1. deploy
   - TokenA / TokenB / Treasury / Covenant / Registry / Library / Router を並べる
2. init
   - village parameter を env / script から流し込む

この分離をしておくと、Phase2 では

- `deploy` -> `Factory.createVillage()`
- `init` -> `initializeVillage(params)`

へ自然に移行できる。

## 6. 今後の実装順

1. Phase1 の `redeploy.sh` を parameter override 対応にする
2. init 可能な値を env 変数で流し込めるようにする
3. `constant` の中で Phase2 で動かしたいものを docs で管理する
4. Phase2 で `VillageFactory` と `VillageParameterSet` を導入する
