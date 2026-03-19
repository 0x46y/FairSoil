# FairSoil Grants One-Pager（JA）

## 1. 一言でいうと

FairSoil は、**「誠実さが損にならない経済圏」**を目指す、分散型 UBI + work agreement + dispute resolution の Phase1 MVP です。

Token を2種類に分けています。

- `Token A`: 日常流通と最低限の生存を支える、減価する flow token
- `Token B`: 仕事・貢献・信頼の蓄積を表す、減価しない asset token

狙いは、単にお金を配ることではなく、

- 不当に厳しい仕事を断っても生存が脅かされないこと
- 仕事の合意と支払いを透明にすること
- dispute で資産格差がそのまま正義にならないこと

を同時に実現することです。

## 2. 何が新しいか

### UBI を「減価する Token A」で設計

単純な配布型ではなく、`Token A` は減価し、`APPI` に連動して調整されます。  
これにより、ただ貯め込むのではなく、近い生活圏で流れる設計を取っています。

### 資産は `Token B` に分離

長期的な価値保存は `Token B` 側に分け、`Token A -> Token B` は自由交換ではなく `crystallization` に限定しています。  
これにより、よくある「配布トークンがそのまま投機資産になる」構造を避けます。

### Work agreement と dispute を同じ kernel で扱う

`Covenant` により、

- 作業合意
- escrow
- submission
- approve / reject
- issue / dispute / proposed / finalized

までを一つの state machine で扱います。

### 「低資産層が dispute で負けやすい」問題を自己開示している

Phase1 の近似シミュレーションでは、UBI の即時インフレ崩壊よりも、  
**低資産層が dispute で不利になりやすい**偏りの方が主要課題と出ました。

この結果を隠さず、

- docs に自己開示
- UI にガイダンス追加
- Phase2 では external arbiter / jury へ接続

という形で正面から扱っています。

## 3. 今あるもの

Phase1 では次が動作しています。

- Token A / Token B / Treasury / Covenant の基本連結
- UBI claim
- Token B escrow work agreement
- issue / dispute / two-step resolve
- APPI 反映
- Resource Registry / Template Library / Royalty Router の MVP
- フロントの participant / operator 分離
- Foundry テスト、integrated tests、近似シミュレーション

## 4. 何を検証しているか

現在は新機能追加より、**1つの guarded village が壊れず回るか**の検証を優先しています。

具体的には次を見ています。

- UBI / APPI / Treasury の安定性
- reserves / liabilities のカバー率
- newcomer が再起できるか
- dispute が資産格差だけで決まっていないか

## 5. 何にグラントを使うか

優先度は次です。

1. dispute fairness の改善
   external arbiter / jury 接続の設計と実装
2. identity flow の本実装
   World ID / ZK-NFC / passkey 系の接続
3. APPI confidence の強化
   価格操作耐性、報告品質の改善
4. Phase2 migration
   governance / timelock / parameter set / factory 化の準備

## 6. なぜ Public Goods と相性が良いか

FairSoil は、単なるトークン経済ではなく、

- anti-extraction
- pro-worker dispute fairness
- programmable public support
- reusable template / resource / governance primitives

を扱うため、Public Goods や QF / RPGF 系の文脈と相性が良いです。

## 7. 今のスタンス

FairSoil は「全部できている」とは言いません。  
今は Phase1 の guarded village を動かしながら、

- 何が既に動くか
- 何がまだ弱いか
- 何を Phase2 で差し替えるか

を明示して進めています。
