# Phase1 Minimal Dispute Spec（JA）

このメモは、FairSoil の Phase1 dispute を**複雑にしすぎず成立させる最小仕様**として整理したものです。  
目的は、完全な裁判制度を再現することではなく、**仕事の踏み倒し・長期引き延ばし・低資産者の泣き寝入り**を減らすための最小防衛線を定義することです。

関連:
- requester 側の最小保護: `docs/phase1_requester_protection_spec_ja.md`
- Scope を削る候補: `docs/phase1_minimal_scope_cutlist_ja.md`
- 公開しやすい dispute record 設計: `docs/dispute_record_publication_ja.md`

## 1. 位置づけ

Phase1 の dispute は、FairSoil 全体の中心ではなく、次のコアを補助するための仕組みです。

- Token A による最低限の生活・交渉拒否権
- Token B による労働報酬の蓄積
- escrow 付きの work agreement

したがって、dispute は「完全な正義の自動化」ではなく、**escrow だけでは吸収できない揉め事を軽く処理するための例外系**として扱う。

## 2. Phase1 で残すもの

Phase1 では、次だけを dispute の必須機能として残す。

1. worker が issue を出せる  
2. requester が accept または challenge を選べる  
3. 第三者が proposal を出せる  
4. 別ロールが finalization できる  
5. evidence URL / hash / short reason を残せる  
6. audit trail に「誰が、どの role で、何をしたか」が残る

これで十分です。  
まず必要なのは、「揉めた時に何も手段がない状態」を避けることであり、法廷級の制度完成ではありません。

補足として、Phase1 の requester challenge は、完全対称の反訴ではなく  
**限定的な misconduct report として再定義する** のがよい。  
詳細は `docs/phase1_requester_protection_spec_ja.md` を参照。

## 3. Phase1 で削る・後ろに送るもの

以下は重要だが、Phase1 の必須条件ではない。

### 3-1. 裁定制度の高度化

- external arbiter / jury の本接続
- elected resolver
- resolver 候補プールの高度選出
- DAO 裁定

### 3-2. dispute UI の過剰な構造化

- 長い arbiter review フォーム
- 細分化された summary / gap / context 項目の必須化
- 小額案件にも重い review checklist を要求すること

### 3-3. 自動化しすぎた公平性補正

- 低資産側への一律有利補正
- 複雑な reputation 数式で勝率を調整する設計
- 「誰が弱者か」をオンチェーンの算術で完全判定する発想

これらは複雑さを増やしやすく、制度への不信や悪用余地を生む。  
Phase1 では、**簡素な手続 + role 分離 + 証拠中心**で十分です。

## 4. Phase1 の最小入力

dispute に必要な入力は、原則として次で足ります。

### worker 側

- claim %（0〜100）
- short reason
- evidence URL または evidence hash

### requester 側

- accept または challenge
- challenge する場合の short reason
- 必要なら evidence URL

### resolver / finalizer 側

- 推奨 payout %
- 最終メモ（短くてよい）

長文の作文や法務的な表現は必須にしない。  
重要なのは、**第三者が後から見て流れを追えるだけの最小情報**です。

## 5. 期限ルール

Phase1 の dispute は、**時間を武器にできないこと**が重要です。  
そのため、最低限次の期限設計を持つべきです。

1. worker issue 期限  
2. requester response 期限  
3. resolver proposal 期限  
4. finalizer confirm 期限

期限切れ時は、何もしないまま無限に止まるのではなく、**default outcome** を用意する。

例:

- requester が期限内に反応しない  
  -> worker claim の範囲で自動採用、または resolver review へ自動遷移
- resolver が長期間未対応  
  -> simple split / refund rule を暫定適用
- finalizer が未対応  
  -> proposal を自動確定、または上位フローへ移送

Phase1 では完全な自動化は不要だが、**放置が最も得になる設計**は避ける。

## 6. 小額案件と高額案件を分ける

Phase1 では、すべての案件を同じ重さで扱わない。

### 小額案件

- 短い理由
- 少ない入力
- 短い期限
- 軽い hold

### 高額案件

- 追加 evidence
- 追加 review
- 将来の external adjudication に接続可能

この分離がないと、低額 dispute でも「勝っても大損」になりやすい。

## 7. “勝っても大損” を防ぐ最低限ルール

Phase1 の dispute は、結論の正しさだけでなく、**争うコストの上限**を意識する。

### 7-1. 入力負担を小さくする

- 長文必須にしない
- URL と短い理由で始められるようにする
- 小額案件では特に軽い入力にとどめる

### 7-2. 再審や蒸し返しを制限する

- 再審回数は 1 回まで
- 同一争点の無限再提出を認めない

### 7-3. challenge に小さなコストを持たせる

- ただし低資産者を締め出さない水準にする
- defense quota や軽減枠は維持する

### 7-4. 不必要な長期凍結を避ける

- escrow は dispute のために全期間無制限で止めない
- hold する範囲と期間を明確にする

## 8. 裁定基準

Phase1 では、次を裁定の主軸とする。

1. 提出証拠  
2. 手順整合性  
3. 時系列  
4. 明らかな悪意履歴  
5. integrity（補助）

`wallet size` は裁定結果の根拠に使わない。  
資産差は spam 対策や担保設計に影響しても、**正しさの根拠そのものにはしない**。

## 9. 第三者性の最小条件

Phase1 の時点で完全な陪審制度は不要です。  
ただし最低限、次は守るべきです。

1. resolver と finalizer を分ける  
2. できるだけ当事者と利害関係を持つ人を外す  
3. role 行使を audit trail に残す  
4. 裁定理由を短くても残す

第三者性は「外部っぽい名前を付けること」ではなく、**当事者・運営・裁定者の癒着を見えやすくし、抑えること**から始める。

## 10. まとめ

Phase1 の最小 dispute は、次の一文で表せます。

> **証拠つきで異議を出せて、相手が応答できて、最後に role 分離された第三者が短い理由付きで終わらせる。**

これ以上の複雑な裁定制度は、Phase1 では必須ではない。  
先に守るべきなのは、次の3点です。

1. 一方的な踏み倒しを防ぐ  
2. 争いを長引かせるだけで得をしにくくする  
3. 正しい側が dispute するだけで潰れないようにする

FairSoil の Phase1 は、この最小防衛線を越えれば十分です。
