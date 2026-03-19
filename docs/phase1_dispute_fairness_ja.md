# Phase1 Dispute Fairness（JA）

このメモは、FairSoil Phase1 の dispute fairness 方針を整理したものです。  
特に「低資産層が dispute で不利にならないか」という懸念に対する暫定原則を明文化する。

## 背景

Phase1 の近似シミュレーションでは、次が観測された。

- UBI そのものによる即時のインフレ崩壊は強く出ていない
- 一方で low-balance 参加者は dispute で不利になりやすい
- deposit 緩和だけでは偏りは十分に改善しない
- 裁定ロジックの独立性や external arbiter 方向の方が効く

## Phase1 の基本原則

### 1. 裁定は資産量を直接の優劣に使わない

裁定結果は、どちらが多くの Token B を持っているかで決めない。  
資産差は spam 防止や deposit 設計には使っても、勝敗そのものの根拠にはしない。

### 2. まず証拠と時系列を見る

裁定の主軸は次の順で考える。

1. evidence / evidenceUri / evidenceHash
2. 手順整合性
3. 時系列
4. 悪意履歴や cooldown 状況
5. integrity（補助的）

### 3. integrity は補助指標であり、絶対的な正しさではない

integrity は参考にはなるが、共謀や相互評価ポンジを完全には防げない。  
したがって Phase1 の arbiter は、integrity を「証拠より強い根拠」として扱わない。

### 4. defense quota は参入補助であって、勝率補正ではない

defense quota や virtual stake は「低資産層でも dispute を始められる」ための仕組みであり、  
自動的にその側を勝たせるものではない。

## Phase1 の実務ルール

- arbiter は wallet size を判断理由に書かない
- arbiter は evidence と timeline を first-class input として扱う
- 高額案件は可能なら外部裁定へ回す
- UI でも「wallet size ではなく evidence と timeline を見る」と明示する

### Arbiter の最小レビュー記録

Phase1 の arbiter は、proposal 前に少なくとも次の 4 項目を残す。

1. `Claim summary`
   worker が何を求めているか。支払割合や争点を短く要約する。
2. `Requester response`
   requester の反論・反証・手続上の主張を短く要約する。
3. `Missing evidence / gaps`
   まだ不足している証拠、時系列の欠落、矛盾点を書く。
4. `Recommended payout`
   最終的に worker に何 % 支払う提案かを明示する。

これは free text の感想ではなく、後から第三者が「何を見てその proposal に至ったか」を追跡できる最小記録である。

## Phase2 への接続

Phase1 の manual arbiter は暫定運用であり、将来は次へ移行する。

- external arbiter / jury
- elected arbiter
- high-value disputes only routing

## やらないこと

- 低資産側に一律ボーナスをオンチェーンで直接ハードコードする
- 単純に deposit を下げるだけで「公平になった」と見なす

## Phase1 として十分な到達点

- UI 上で裁定原則が明示されている
- arbiter 運用メモが残っている
- シミュレーションで偏りを継続監視している
- external adjudication に差し替える socket を壊していない
