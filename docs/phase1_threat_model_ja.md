# Phase1 Threat Model（JA）

このメモは、Phase1 の FairSoil がどのような悪意に比較的強く、どのような悪意にはまだ弱いかを整理するための補助資料です。

## 1. 前提

Phase1 の FairSoil は、次の性質を持つ guarded MVP です。

- on-chain の資金移動と escrow は比較的透明
- Treasury の reserve / liability は追跡しやすい
- Covenant の payout、royalty、status 遷移は監査しやすい
- ただし、**価格の妥当性** や **オフチェーンの共謀** までは自動で保証しない

したがって、Phase1 の threat model は「単純な改ざん」よりも、**相場の非対称性・談合・文脈偽装** を重視する。

## 2. 比較的強い領域

### 2-1. 単純な会計改ざん

- 誰にいくら払ったか
- escrow に何が入っているか
- reserve / liability がどう動いたか
- royalty split が何 % か

これらは on-chain で監査しやすく、完全な密室会計よりは強い。

### 2-2. 露骨な未払い・二重払い

Covenant と Treasury を通る限り、

- 承認したのに払っていない
- 既に確定した金額を別経路で二重払いしている
- status と実際の送金結果が食い違っている

といった露骨な不整合は検出しやすい。

## 3. まだ弱い領域

### 3-1. 価格の妥当性を装った中抜き

例:

- 仲介者が施工会社や下請けと裏でつながっている
- 見えない紹介料や kickback を総額に上乗せしている
- 顧客は相場感がなく、過大請求に気づけない

FairSoil は「支払額の透明化」には効くが、**その価格が妥当か** までは自動で保証しない。

### 3-2. 談合・相互評価ポンジ

例:

- 複数アカウントで仕事を回し合う
- 意味の薄い取引で Integrity を積み上げる
- 実績や reputation を談合で膨らませる

これにより、honest reputation の見かけを人工的に作る余地がある。

### 3-3. 証拠の文脈偽装

例:

- 一部だけ切り出した証拠を出す
- 本文説明で印象操作する
- 相手が理解しにくい形で evidence URI を出す

evidence hash を残しても、**何をどう説明するか** の部分はまだ人間判断に依存する。

### 3-4. 相場感の非対称性

例:

- 一般ユーザーはそのカテゴリの適正価格を知らない
- 周囲の業者も同じグレーな慣行を共有している
- 合い見積もりを取っても、全員が高値を前提にしている

この場合、透明性だけでは搾取が消えない。

### 3-5. 暫定運営ロールへの依存

Phase1 は `Temporary Operator` と `Dispute Arbiter` を置く guarded MVP なので、

- 裁定の品質
- parameter 調整の妥当性
- 緊急停止の判断

はまだ人間運用に依存する。

## 4. 典型的な悪意パターン

### Pattern A: Kickback pricing

- requester と vendor が裏で結びつく
- 総額に非開示の紹介料を含める
- user には総額しか見えず、実原価との差が分からない

### Pattern B: Reputation ring

- 仲間内で Covenant を作り合う
- submit / approve を回して Integrity を積み上げる
- 後で本物の利用者に対して「高信頼」に見せる

### Pattern C: Evidence framing attack

- hash 自体は本物だが、説明・切り出し・順序で印象を操作する
- arbiter が忙しいと、見た目上もっともらしい側が有利になる

### Pattern D: Market opacity

- 相場データが不足している
- 類似案件の中央値が見えない
- user が「高いのか普通なのか」を判断できない

## 5. Phase1 で取るべき対策

### 5-1. accounting transparency に加えて market transparency を入れる

将来の UI / protocol では、次を優先する。

- 見積もり内訳の構造化
- 類似案件の価格レンジ表示
- royalty / referral / fee の明示
- requester / creator / template author の関係開示

### 5-2. dispute では価格より証拠を主軸にする

- 「高い / 安い」だけで裁定しない
- まず契約時に何が合意されていたかを見る
- 価格の妥当性は別レイヤーで監査する

### 5-3. Integrity を過信しない

- Integrity は補助信号に留める
- 証拠と timeline より強く扱わない
- ring activity の warning は出しても、単独で有罪認定に使わない

### 5-4. Phase1 で実装済みの heuristic warnings

Phase1 の operator UI では、次の集中パターンを **要レビュー警告** として表示する。

- 同じ `creator -> worker` ペアが 3 回以上繰り返される
- 同じ 2 アドレスが `creator / worker` を入れ替えて繰り返し登場する
- 同じ requester が同じ template author の template を偏って使う
- requester 自身が template author でもある

これらは **談合の証明** ではなく、review の優先順位を上げるための heuristic に過ぎない。
正当な継続取引や小規模コミュニティでも発火し得るため、必ず evidence・price range・related-party disclosure と合わせて読む。

## 6. 次段階の設計課題

- Resource Registry に価格レンジ参照を持たせる
- Template に想定工数 / 内訳 / 耐用年数などのメタデータを持たせる
- 異常利益率や異常紹介料の warning を UI に出す
- 関連当事者 disclosure と reputation ring warning をより構造化する
- external arbiter / jury が価格ではなく証拠中心で見られる導線を作る

## 7. 要点

- FairSoil は **金の流れの透明化** には比較的強い。
- しかし、**価格の妥当性の透明化** と **談合の検知** はまだ弱い。
- Phase1 の主要リスクは、単純な帳簿改ざんよりも、相場の不透明さ・文脈偽装・関係者の共謀である。
