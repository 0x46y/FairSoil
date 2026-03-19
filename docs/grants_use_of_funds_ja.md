# FairSoil Grants Use of Funds（JA）

このメモは、グラント申請時に「資金が入ったら何に使うか」を短く説明するためのものです。

## 1. 優先順位

### 1) Dispute fairness / external arbiter

目的:
- 低資産層が dispute で不利になる偏りを弱める

使い道:
- external arbiter / jury 接続の interface 設計
- high-value dispute routing
- dispute UI / evidence flow 改善
- resolver socket の実装とテスト

### 2) Identity / Sybil resistance

目的:
- primary address を手動設定から認証フローへ移す

使い道:
- World ID / mock から本接続への移行
- ZK-NFC / verifier flow の接続
- passkey を含む段階的 identity UX

### 3) APPI confidence / oracle hardening

目的:
- APPI の品質と価格操作耐性を上げる

使い道:
- reporter quality / diversity / freshness の強化
- confidence scoring
- shock / oracle failure のテスト追加

### 4) Governance / Phase2 migration prep

目的:
- Temporary Operator 依存を減らす

使い道:
- parameter set の整理
- timelock / governance migration path の実装準備
- factory 化を見据えた deploy/init 整理

## 2. 今はやらないもの

グラントが入っても、Phase1 の段階では次は後回しにする。

- マルチ village の全面展開
- 完全な DAO 化の一気実装
- 派手な UX 全面刷新
- speculative tokenomics の拡張

## 3. なぜこの順番か

FairSoil は、今は「思想を広げる」より「1つの guarded village が壊れず、公平に回る」ことを優先している。

したがって資金は、

- security
- fairness
- identity
- ops migration

に使うのが最も効果が高い。

## 4. 一言版

> 資金は、Phase1 を飾るためではなく、  
> dispute fairness、identity、APPI hardening、Phase2 migration の4点に集中投入する。
