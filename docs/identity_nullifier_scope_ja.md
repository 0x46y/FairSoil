# Identity Nullifier Scope（JA）

このメモは、FairSoil で identity nullifier を**何に対して一意に使うのか**を整理するための設計ノートである。

## 背景

World ID や将来の ZK-NFC では、「同一人物であること」を示す証明と、その用途ごとの一意性制約を切り分ける必要がある。

もし nullifier のスコープを分けずに使うと、

- UBI 請求を 1 回しただけで別機能まで潰れる
- 投票用の一意性と受給用の一意性が混ざる
- 利用履歴から不要なリンクが生まれる

といった問題が起こる。

## 基本方針

nullifier は **機能ごと / action ごと / epoch ごと** に分離する。

## 推奨スコープ

### 1. UBI claim nullifier

- 目的: 同一人物による同一期間内の二重受給を防ぐ
- スコープ例:
  - `ubi:day:<dayIndex>`
  - `ubi:epoch:<epochId>`
- 注意:
  - 日次と月次で運用が異なるなら action も分ける
  - 「同一日内 1 回」か「claim window ごと 1 回」かを明確にする

### 2. Governance vote nullifier

- 目的: 1 proposal につき 1 人 1 票を担保する
- スコープ例:
  - `vote:proposal:<proposalId>`
- 注意:
  - proposal ごとに分ける
  - UBI 用 nullifier を流用しない

### 3. Analytics / attendance / proof-of-participation nullifier

- 目的: 集計や参加証明に限定して一意性を使う
- スコープ例:
  - `attendance:event:<eventId>`
  - `analytics:campaign:<campaignId>`
- 注意:
  - 受給・投票と混ぜない
  - 必要最小限にする

## Phase1 の現状

現在の FairSoil は、厳密な用途別 nullifier をコントラクトにはまだ保持していない。  
Phase1 は `setPrimaryAddress` による verified gate が中心であり、nullifier scope の完全実装は Phase2 以降の課題である。

## Phase2 でやるべきこと

- `nullifier domain` を用途ごとに定義する
- UBI / voting / analytics で別 action を使う
- 必要なら on-chain registry または attestation 層で replay 防止を管理する

## やってはいけないこと

- UBI と vote に同じ nullifier domain を使う
- personhood 証明の 1 回分をそのまま複数の制度用途に流用する
- 利用目的をまたいで不要にリンク可能な形で保存する
