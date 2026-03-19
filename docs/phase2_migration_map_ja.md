# FairSoil Phase2 Migration Map（JA）

このドキュメントは、**Phase1 の guarded village をどう育てて Phase2 へ移行するか**を整理したものです。  
目的は、今の実装を「作り込みすぎて将来捨てる」のではなく、**再利用するもの / 差し替えるもの / 新設するもの**を分けて見えるようにすることです。

## 1. 結論

Phase1 を丁寧に作り込むこと自体は問題ではない。  
問題になるのは、**Phase1 固有の前提をコアに埋め込んでしまうこと**です。

特に注意すべき固定化は次の3つです。

- 単一の `Temporary Operator` を前提にした設計
- 単一の `Dispute Arbiter` を前提にした裁定設計
- 単一の村（単一 Treasury / 単一 APPI / 単一 Covenant）を前提にした配線

逆に、今の FairSoil には Phase2 に繋がる良い分割もすでにあります。

- `Token A / Token B` の分離
- `SoilTreasury` の独立
- `Covenant` の独立
- `APPIOracle` の独立
- `ResourceRegistry` と `CovenantLibrary` の独立
- `disputeResolver` を差し替え可能にしている点

## 2. Phase1 から Phase2 へ持っていくもの

### 2-1. そのまま残しやすいコア

- `FairSoilTokenA`
  - 役割: UBI / flow / decay
  - Phase2 でもコア概念は維持しやすい
- `FairSoilTokenB`
  - 役割: asset / lock / unlock
  - 各 village 共通の資産概念として残しやすい
- `SoilTreasury`
  - 役割: reserves / liabilities / payout gate
  - 内部 accounting kernel として再利用価値が高い
- `Covenant`
  - 役割: work agreement / escrow / issue / dispute state machine
  - 支払モードや二段階解決は Phase2 でも基礎として使える
- `CovenantLibrary`
  - 役割: template registry
  - village ごとの template economy に流用しやすい
- `ResourceRegistry`
  - 役割: resource tax / ownership transfer
  - Phase2 以降の resource layer に繋がる

### 2-2. コアとして残すが可変化すべきもの

- `APPI` の入力条件
- UBI の clamp 幅
- crystallization rate / fee
- governance threshold
- dispute deposit rate
- defense quota 条件

これらは「定数」ではなく、**village ごとに差し替え可能な parameter set** に寄せるべきです。

## 3. Phase2 で差し替えるもの

### 3-1. Temporary Operator

Phase1:
- 単一ウォレットが `owner` として設定を更新

Phase2:
- `timelock + governance` に移行
- village ごとに parameter proposal / voting / delayed execution を持てるようにする

差し替えの考え方:
- `onlyOwner` をすぐ消すのではなく、`owner` の実体を EOA から timelock に差し替える
- その上に governance module を載せる

### 3-2. Dispute Arbiter

Phase1:
- 単一ロールが `resolve / finalize`

Phase2:
- external arbiter / jury / elected resolver に段階移行

差し替えの考え方:
- `Covenant` の state machine は残す
- `disputeResolver` の中身だけを差し替える
- 高額案件のみ external route、低額案件は internal flow というハイブリッドも可能

### 3-3. 単一 village 前提

Phase1:
- 1つの Treasury / APPI / Covenant を手運用

Phase2:
- village ごとに独立した parameter set と treasury policy を持つ
- village を追加生成できる factory を用意する

差し替えの考え方:
- コントラクト本体を作り直すより、deploy / init / registry の層を追加する

## 4. Phase2 で新設するもの

### 4-1. Village Factory

目的:
- 誰でも自分の経済圏を立ち上げられるようにする

最低限必要なもの:
- Treasury / Covenant / APPI / Library のセットを deploy する factory
- village metadata registry
- village ごとの parameter initialization

例:
- `createVillage(params)`
- `villageOf(id)`
- `villageRegistry`

### 4-2. Parameter Set Registry

目的:
- village ごとの差を contract address ではなく parameter として管理する

対象:
- UBI 初期値
- clamp 幅
- decay
- crystallization fee
- dispute deposit
- governance threshold
- defense quota

これを分離すると、**1つの「公式村」から複数の派生 village を作れる**ようになる。

### 4-3. Governance Layer

目的:
- operator の判断を timelock / proposal / vote へ置き換える

最低限:
- parameter proposal
- vote
- queue
- execute

### 4-4. External Arbiter Layer

目的:
- 資産格差や村内の権力構造から dispute を切り離す

最低限:
- high-value dispute routing
- ruling import
- finalization hook

## 5. 負の消費税 / 再分配ルールとの接続

将来やりたい「負の消費税」や redistributive tax は、今の FairSoil と完全に断絶しているわけではありません。  
むしろ、次の部分が接続点になります。

- `SoilTreasury`
  - 既に収入 / 支出 / reserves / liabilities の考え方がある
- `ResourceRegistry`
  - 既に tax / buy / treasury flow の入口がある
- `Token A`
  - 既に日常流通トークンとして位置付いている

Phase2 以降の発想:

- village 内の消費や取引に応じて tax を Treasury に戻す
- 一定条件の participant に negative tax として再配分する
- UBI と targeted support を village parameter として分ける

つまり、負の消費税は完全新規ではなく、**Treasury の入出金理由と再配分ルールを拡張する話**です。

## 6. 誰でも経済圏を作れる世界に行けるか

答えは `はい。ただし今すぐではない` です。

Phase1:
- 1つの guarded village を壊れず回す

Phase2:
- village ごとの parameter set
- governance / timelock
- external arbiter

Phase3:
- factory で village を量産
- cross-village comparison
- exit / migration / federation

つまり、**今の Phase1 は将来の multi-village economy の原型村**です。

## 7. 今の実装で避けるべきこと

以下を今の Phase1 に強く埋め込むと、後で移行が重くなります。

- UI に owner 固有の概念を直接ベタ書きする
- `dispute arbiter` を唯一の正解として見せる
- village 固有の parameter をコード内に散らす
- factory を想定しない deploy script に閉じる

## 8. 今やるべきこと

Phase2 のために、今の段階で一番価値が高いのは次です。

1. `owner -> timelock/governance` の差し替え点を interface で整理する
2. `disputeResolver -> external arbiter/jury` の差し替え点を保つ
3. parameter 群を一覧化し、 village ごとに持てるよう整理する
4. deploy/init 手順を「単一村専用」から「将来 factory 化可能」な形へ寄せる

関連:
- `docs/phase2_parameter_catalog_ja.md`

## 9. 一枚で言うと

Phase1 は「完成形の国家」ではなく、**安全に回る 1つの実験村**です。  
Phase2 ではその村の kernel を保ったまま、

- operator を governance に
- arbiter を external adjudication に
- single village を factory-based villages に

置き換えていく。

この migration map を守れば、Phase1 を深く作っても、将来の理想に向けて詰みにはなりにくい。
