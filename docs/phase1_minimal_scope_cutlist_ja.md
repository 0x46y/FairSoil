# Phase1 Minimal Scope Cut List（JA）

このメモは、`docs/phase1_minimal_dispute_spec_ja.md` を前提に、**今の実装から Phase1 最小構成として何を削るか / 薄くするか**を具体化したものです。  
目的は、FairSoil を「全部入りの制度」にしすぎず、**減価通貨 + escrow 付き仕事 + 最小限の dispute** に収束させることです。

## 0. 基本方針

Phase1 で優先するのは次の3点だけです。

1. verify して UBI を受け取れる  
2. reward を escrow 付きで約束し、create -> submit -> approve を回せる  
3. こじれた時に、最小限の issue / challenge / resolve / finalize がある

これを超える要素は、**「便利ではあるが、Phase1 の成立条件ではない」** とみなして優先度を落とす。

## 1. 今すぐ UI から薄くする候補

### 1-1. Template Library の本格運用 UI

**対象ファイル**
- `frontend/src/app/page.tsx`

**薄くする候補**
- `Template ID (optional)`
- `Save template`
- `Record template use`
- `Creator share (bps)`
- template author royalty の詳細表示

**理由**
- work agreement 自体の成立には不要
- 初見ユーザーに「何を入力すれば create できるか」を分かりにくくする
- Phase1 の手動検証でも main flow を何度も邪魔しやすい

**Phase1 の扱い**
- UI では折りたたみの奥に退避、または operator/dev 専用エリアへ移す
- docs では「存在するが Phase1 core flow では使わない」と明記

### 1-2. 市場比較と価格分析の強い表示

**対象ファイル**
- `frontend/src/app/page.tsx`
- `frontend/src/lib/useCovenantReview.ts`

**薄くする候補**
- comparable agreements の強い警告
- market baseline の前面表示
- `scope + urgency + material class + hours band` の比較説明
- review priority のうち価格系のもの

**理由**
- 不透明な相場に対する問題意識としては重要だが、create / submit / approve の core flow に必須ではない
- dispute の重心を「価格の妥当性」へ寄せすぎると、証拠より印象で裁く圧力が強くなる

**Phase1 の扱い**
- operator 向け補助表示にとどめる
- participant 向け main flow では前面に出しすぎない

### 1-3. External adjudication 導線の前面表示

**対象ファイル**
- `frontend/src/components/WorkAgreementRow.tsx`

**薄くする候補**
- `Open external adjudication`
- 高額案件の external routing 前提の強い文言

**理由**
- 実接続がまだない段階で前に出すと、未実装期待を生む
- Phase1 user には「今ここで何ができるか」を見せた方がよい

**Phase1 の扱い**
- docs に残す
- UI では小さな note に落とすか非表示にする

## 2. dispute 入力で簡略化する候補

### 2-1. Resolver review の多段フォーム

**対象ファイル**
- `frontend/src/components/WorkAgreementActionPanel.tsx`
- `frontend/src/lib/useDisputeFormState.ts`

**簡略化する候補**
- `Claim summary`
- `Requester response`
- `Missing evidence / gaps`
- `Arbiter evidence URL`
- structured arbiter note の多段構造

**理由**
- 後から audit しやすい利点はあるが、Phase1 では入力負荷が重い
- 裁定者が丁寧な長文を作れるかどうかに依存しやすい

**Phase1 の扱い**
- 最小入力は `recommended payout + short final note` に縮める
- 追加項目は任意入力に落とす

### 2-2. worker/requester 側の evidence 入力の厚み

**対象ファイル**
- `frontend/src/components/WorkAgreementActionPanel.tsx`
- `frontend/src/lib/evidencePacket.ts`

**簡略化する候補**
- title
- hash
- summary
- context
- requestedOutcome

**理由**
- evidence packet 自体は有用だが、全項目を常に前提にすると手続負荷が増える
- Phase1 では `reason + sourceUrl` で始められる方が重要

**Phase1 の扱い**
- `reason + sourceUrl` を主入力
- 他は「詳細を追加」に退避

## 3. audit / operator で後ろに送る候補

### 3-1. 高度な review priority heuristics

**対象ファイル**
- `frontend/src/lib/useCovenantReview.ts`
- `frontend/src/app/page.tsx`

**後ろに送る候補**
- missing resolver summary の強い警告
- market anomaly
- repeated pair / ring heuristic の前面表示
- 複合的な priority tag

**理由**
- 運用上は有益でも、今の Phase1 では「次に誰が何をするか」より優先度が低い
- ルールが増えすぎると、裁量っぽく見えやすい

**Phase1 の扱い**
- `Needs my action`
- role 表示
- audit trail

これだけ残せば十分

### 3-2. KPI と分析寄りダッシュボードの一部

**対象ファイル**
- `frontend/src/app/page.tsx`

**後ろに送る候補**
- dispute volume の細かい警告
- grouped scope data
- market baselines by scope

**理由**
- デモや分析には useful
- ただし user が「何をすればよいか」を理解する助けには直結しない

## 4. docs では残すが、実装を急がないもの

### 4-1. External arbiter / jury / elected resolver

**対象ドキュメント**
- `docs/spec_future_ja.md`
- `docs/phase2_migration_map_ja.md`
- `docs/adjudication_antipatterns_ja.md`

**理由**
- 方向性としては重要
- ただし Phase1 core flow の成立条件ではない

### 4-2. governance / timelock 移行

**対象ドキュメント**
- `docs/spec_future_ja.md`
- `docs/phase2_migration_map_ja.md`

**理由**
- 将来的には重要
- しかし今は owner/operator の暫定運用を audit しやすくする方が先

## 5. Phase1 で残すべき UI / 機能

削る候補を整理したうえで、Phase1 の main flow として守るべきものは次です。

### participant flow
- verify
- claim
- create agreement
- submit work
- approve / reject / cancel

### dispute flow
- worker issue
- requester accept / challenge
- resolver proposal
- finalizer confirmation

### supporting UX
- role-aware controls
- `Needs my action`
- `Executed by ... as ...`
- short evidence reference
- short reason

## 6. 実装タスクとしての優先順位

### P0

1. create agreement 画面から template / royalty の前面表示をさらに薄くする  
2. worker / requester / resolver 向け dispute 入力を `short reason + url + final note` 中心へ寄せる  
3. `Open external adjudication` を main UI から下げる  

### P1

4. market baseline / comparable agreement の表示を operator 補助表示へ後退させる  
5. review priority tag を絞り、Phase1 では「missing evidence」「needs response」程度にする  

### P2

6. docs を `core flow` と `future structure` にさらに分離する  
7. external arbiter / jury / governance の議論は docs 中心に戻し、UI からは薄くする  

## 7. まとめ

今の FairSoil は、機能としてはかなり進んでいる。  
ただし、Phase1 の成立条件より先の構想が UI に少し滲み始めています。

したがって、次の削り方が自然です。

- **残す:** 減価通貨、escrow、最小 dispute、audit trail  
- **薄くする:** template / royalty / market analysis / advanced review forms  
- **後ろに送る:** external adjudication / jury / governance の実体

Phase1 は「全部入り制度」ではなく、**弱い立場でも一方的に踏み倒されにくい最小経済圏**として完成させるのがよい。
