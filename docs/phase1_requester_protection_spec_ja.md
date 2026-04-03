# Phase1 Requester Protection Spec（JA）

このメモは、FairSoil Phase1 で **worker 側の issue 救済だけが強くなりすぎないための最小仕様** を整理したものです。  
目的は、requester にも最低限の保護を与えつつ、**依頼者の立場を使った圧迫や恣意的な品質攻撃**を制度化しないことです。

## 1. 基本方針

FairSoil の Phase1 では、worker 側の issue は未払い・不当 reject・条件違反に対する救済として重要です。  
ただし、その入口だけが強すぎると、逆に次の偏りが起こり得ます。

- requester が明白な no-show や虚偽提出を受けても、十分な手段を持てない
- 「弱さ」「遅さ」「能力不足」を盾にして、悪意のある不履行が見逃される
- worker 救済の設計が、逆方向の一方的優位になってしまう

そのため、Phase1 では **完全対称の dispute** ではなく、  
`worker issue` に対して、requester 側には **限定的な misconduct report** を持たせるのがよい。

Phase1 の現実的な実装では、これは新しい on-chain state を増やすのではなく、  
**既存の requester challenge UI を misconduct report として再定義する** 形で導入するのが望ましい。

## 2. worker issue と requester report の違い

### worker issue

worker issue は主に次を扱う。

- 未払い
- 不当な reject
- 合意条件違反
- 一方的な条件変更

これは worker を守るための救済手段であり、Phase1 の中心として残す。

### requester misconduct report

requester 側に追加するのは、worker issue と完全対称の「反訴」ではない。  
対象は **能力評価ではなく、手続違反・虚偽・未提出** に限定する。

## 3. Requester misconduct report が扱うもの

Phase1 で扱う対象は、次の4類型に絞る。

### 3-1. No-show

- 合意後、期限までに提出がない
- 連絡や更新もなく、実質的に放棄している

### 3-2. False submission

- 作業未実施なのに、実施済みと偽る
- 明白に虚偽の提出物や説明を出す

### 3-3. Materially incomplete work

- 合意の中心要件を明らかに満たしていない
- 単なる「気に入らない」ではなく、主要部分の未達である

### 3-4. Repeated procedural failure

- 必要な修正応答や説明を繰り返し無視する
- 期限付きの基本手続を守らない

## 4. 扱わないもの

次は Phase1 では扱わない。

- 「なんとなく気に入らない」
- 依頼者の主観的な好み
- worker の性格や能力そのもの
- 遅い、不器用、弱い、といった属性評価
- 最低限の合意は満たしているのに、依頼者の満足だけが足りないケース

FairSoil が裁くのは **人格や能力** ではなく、  
**合意違反と証拠可能な行為** です。

## 5. 入力項目

requester 側の report は、できるだけ軽くする。

### 最小入力

1. `report type`
   - `no-show`
   - `false-submission`
   - `materially-incomplete`
   - `procedural-failure`

2. `short reason`

3. `evidence url` または `evidence hash`

4. `requested outcome`
   - `refund`
   - `integrity penalty review`
   - `cooldown review`

長文の作文や法務的説明は要求しない。  
重要なのは、**第三者が後から最低限の事実関係を追えること**です。

## 6. report の効果

Phase1 の requester protection は、いきなり重い制裁を行う制度にはしない。

### 可能な結果

1. `Refund`
   - escrow の返還

2. `No reward`
   - worker への支払いなし

3. `Integrity penalty review`
   - 明白な虚偽や悪質行為がある場合のみ候補

4. `Cooldown review`
   - 繰り返し悪質なら新規 agreement 制限候補

### Phase1 でやらないこと

- 自動重罰
- 一発 BAN
- 曖昧な quality score 制裁
- 能力不足そのものへの直接ペナルティ

## 7. 手続の位置づけ

requester protection は、`reject` で足りない場合の例外フローとして扱う。

基本の流れは次です。

1. worker submits  
2. requester reviews  
3. requester は次から選ぶ  
   - `approve`
   - `reject`
   - `misconduct report`
4. report が出た場合だけ第三者 review に入る  
5. resolver / finalizer が最終判断する

つまり、requester 側の保護は dispute engine を共有してもよいが、  
意味としては **worker 救済の issue** と **requester 保護の misconduct report** を分けて考える。

## 8. worker issue との非対称性

Phase1 では、これを「完全対称の dispute 制度」にはしない。

理由は次です。

- requester は資金や発注権を持ちやすく、制度を圧力手段として使いやすい
- worker 側は、未払いリスクに対する保護を強く必要とする
- 両者に同じ強さの dispute weapon を渡すと、強い側の圧迫装置になりやすい

したがって、Phase1 の方針は次です。

- `worker issue` は強い救済手段として残す
- `requester report` は、証拠可能な misconduct に限定して持たせる

これは「片方だけ優遇」ではなく、**立場の違いに応じた非対称設計**です。

## 9. Phase1 の安全条件

requester protection を入れるなら、最低限次を守るべきです。

1. report 類型を限定する  
2. 主観評価を排除する  
3. short reason + evidence を必須にする  
4. resolver / finalizer が最終判断する  
5. 自動重罰にしない  

## 10. まとめ

Phase1 の requester protection は、次の一文で表せます。

> **依頼者にも異議申立ての入口は必要だが、それは「worker を気に入らない時の攻撃手段」ではなく、no-show・虚偽・重大な未達を報告する限定的な misconduct report として扱う。**

この設計により、FairSoil は次の2つを同時に守りやすくなる。

1. worker 側が一方的に踏み倒されないこと  
2. requester 側も明白な不履行や虚偽提出から守られること

Phase1 では、この最小限の双方向保護で十分です。
