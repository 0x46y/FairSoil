# Market Vocabulary（JA）

このメモは、Phase1 の `Template` / `Covenant` / `Resource Registry` で使う比較用 vocabulary を固定するための資料です。

目的は、自由入力の揺れによって比較基準が壊れることを防ぎ、価格レンジや異常値警告を安定化させることです。

## 1. なぜ必要か

もし scope や urgency を自由入力にすると、同じ種類の案件でも:

- `repair`
- `plumbing repair`
- `urgent plumbing`
- `fix pipe`

のように分散し、比較レンジが割れてしまう。

Phase1 では、まず **固定 vocabulary を優先** し、必要なら後で alias を足す。

## 2. Scope vocabulary

現在の標準 scope は以下です。

- `general`
- `repair`
- `delivery`
- `audit`
- `tutoring`
- `education-support`
- `care-support`
- `emergency-support`
- `field-ops`

### 運用ルール

- 基本は UI の選択肢から選ぶ
- 新しい scope を増やすのは operator / maintainer 判断で行う
- 同義語は内部で既存 scope に正規化する

## 3. Material class vocabulary

標準 material class は以下です。

- `standard`
- `light`
- `specialized`
- `scarce`

### 解釈

- `standard`
  一般的な工具・消耗品・通常部材
- `light`
  材料コストが特に低い案件
- `specialized`
  専門部材や特殊機材が必要
- `scarce`
  規制対象、希少品、供給制約が強い

## 4. Urgency vocabulary

標準 urgency は以下です。

- `normal`
- `soon`
- `same-day`
- `emergency`

### 解釈

- `normal`
  通常の予定作業
- `soon`
  早め対応だが緊急ではない
- `same-day`
  当日対応が必要
- `emergency`
  放置コストが高く即応が必要

## 5. Hours band

比較時は、自由な時間数そのものではなく、次の band に丸める。

- `0-2h`
- `2-8h`
- `8-24h`
- `24h+`
- `unspecified`

これにより、細かすぎる差でマーケットが分断されるのを防ぐ。

## 6. 現在の比較キー

Phase1 の market baseline は、次の4軸で作る。

- `scope`
- `urgency`
- `material class`
- `hours band`

つまり比較キーは:

`scope + urgency + material class + hours band`

である。

## 7. 将来の拡張候補

Phase2 以降で追加を検討する軸:

- geography / region
- certification level
- equipment class
- regulatory burden
- seasonality

ただし、Phase1 では vocabulary を増やしすぎず、比較母数を確保することを優先する。

## 8. 運用方針

- まずは固定 vocabulary を守る
- alias は内部正規化で吸収する
- UI と docs の両方で同じ表を使う
- 比較不能な自由入力を増やさない

## 9. 要点

- Phase1 では自由記述より比較可能性を優先する
- scope / material / urgency / hours band は固定語彙で扱う
- market baseline の一貫性は、この vocabulary に依存する
