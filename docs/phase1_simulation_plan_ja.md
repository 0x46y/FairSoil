# FairSoil Phase1 シミュレーション設計（JA）

このドキュメントは、Phase1 MVP の経済設計について、次の2つの懸念を検証するための実験計画をまとめたものです。

- UBI / Token A 配布がインフレや支払不能を早め、経済圏を崩壊させないか
- 最低限の生存保証だけが残り、格差固定や「逃げられないディストピア」にならないか

目的は「理論の正しさを断言すること」ではなく、**どの条件で危険になるかを定量的に把握し、Phase1 の運用パラメータを調整できる状態にすること**です。

## 1. 何を証明したいか

Phase1 で最低限確認したいのは、次の4点です。

1. `Token A` の配布と減価が、短期で制御不能な供給膨張を起こさないこと
2. `Treasury` の `Token B` 準備金と負債が、通常フローで破綻しないこと
3. `Token B` と `integrity` が一部の先行者に固定されすぎず、後発参加者にも再起可能性が残ること
4. dispute や governance 参加条件が、無資産層に対して一方的な不利を強制しないこと

## 2. 前提

Phase1 の現行実装は、以下の性質を持つ。

- `Token A` は減価する流通トークン
- `Token B` は減価しない資産トークン
- `A -> B` は自由交換ではなく、`crystallization` でのみ変換される
- `A の burn -> B の mint` は一般ルールとして禁止され、`Covenant` 決済などの明示経路だけが許される
- UBI は `APPI` に連動するが、変化幅は clamp される
- Phase1 は `Temporary Operator` と `Dispute Arbiter` を含む guarded MVP である

したがって、シミュレーション対象は「完全市場」ではなく、**FairSoil 内部のルールで制御される 1 つの村**である。

## 3. 検証観点

### 3-1. インフレ崩壊リスク

見るべき問い:

- `Token A` の供給と未請求 UBI が、減価より速く膨張し続けないか
- `Token B` の払い出しが、Treasury 準備金と crystallization cap を食い潰さないか
- `APPI` の変動や oracle 異常時に、日次配布額が暴走しないか

確認したい現象:

- `dailyUBIAmount` の上昇が段階的であること
- `Token A` 総供給の急膨張がないこと
- `Token B` の `Reserves - Liabilities` が長期間マイナス固定しないこと
- `Circuit Breaker` を入れるべき危険領域が見えること

### 3-2. 格差固定・ディストピア化リスク

見るべき問い:

- 後から参加した人が、work / dispute / governance に現実的に参加できるか
- 高スコア者だけがさらに有利になる複利構造になっていないか
- 資産を持たない人でも、virtual stake や defense quota で最低限の防御が可能か

確認したい現象:

- 上位保有者の集中率が時間とともに単調増加し続けないこと
- 新規参加者でも一定期間で `governance` または `dispute defense` に届くこと
- dispute 勝率が「初期資産量」だけで説明されないこと
- 生存保証が「最低限で黙って耐えろ」にならず、拒否権と再挑戦機会に繋がること

## 4. 主要メトリクス

### 4-1. 経済安定メトリクス

- `A_supply_total`
  `Token A` 総供給
- `A_unclaimed_total`
  未請求 UBI 総量
- `A_decay_burn_total`
  減価で失われた `Token A`
- `dailyUBIAmount`
  1日あたりの基本配布額
- `B_supply_total`
  `Token B` 総供給
- `B_reserves`
  Treasury が保有する `Token B`
- `B_liabilities`
  Covenant / advance 等を含む `Token B` 負債
- `reserve_coverage_ratio`
  `B_reserves / max(B_liabilities, 1)`
- `crystallized_A_total`
  結晶化に使われた `Token A`
- `crystallized_B_total`
  結晶化で払い出された `Token B`
- `appi_volatility`
  APPI の日次変動幅、または週次変動幅

### 4-2. 公平性メトリクス

- `top10_b_share`
  `Token B` 上位10アドレスの保有比率
- `median_b_balance`
  中央参加者の `Token B` 残高
- `newcomer_time_to_1B`
  新規参加者が `1 Token B` に到達する日数
- `newcomer_time_to_governance`
  新規参加者が governance 条件に届く日数
- `gini_b`
  `Token B` 残高のジニ係数
- `gini_integrity`
  integrity のジニ係数
- `dispute_win_rate_by_balance_bucket`
  初期資産帯ごとの dispute 勝率
- `defense_quota_usage_rate`
  defense quota の使用率
- `virtual_stake_usage_rate`
  virtual stake の使用率

### 4-3. 再起可能性メトリクス

- `recovery_rate_30d`
  低残高参加者が30日後に再び活動可能になる割合
- `inactive_reentry_rate`
  一時離脱者の復帰率
- `zero_B_but_active_ratio`
  `Token B` 残高ゼロでも work / claim / dispute に参加できている比率
- `covenant_success_rate_newcomer`
  新規参加者が creator / worker として成立させた Covenant 成功率

## 5. シナリオ設計

Phase1 では、以下の5シナリオを最低限回す。

### Scenario A: 平常村

目的:
- 通常運用での安定性の基準値を取る

条件:
- 参加者 100人
- APPI は緩やかな変動
- 毎日一定数の UBI claim
- 一定割合が Covenant を作成・承認
- dispute は低頻度

見るもの:
- `dailyUBIAmount`
- `reserve_coverage_ratio`
- `top10_b_share`
- `newcomer_time_to_1B`

### Scenario B: 物価上昇ショック

目的:
- APPI 上昇時に UBI と Treasury が暴走しないか確認する

条件:
- 30日目から APPI が急上昇
- clamp を跨ぐ変化を連続で与える

見るもの:
- `dailyUBIAmount` の追従速度
- `A_supply_total`
- `B_reserves`
- `Circuit Breaker` 発動が必要な閾値

### Scenario C: 需要低迷 + claim 偏り

目的:
- UBI が蓄積されるが work が少ない停滞局面を確認する

条件:
- 一部参加者だけがまめに claim
- Covenant は低頻度
- APPI は横ばい

見るもの:
- `A_unclaimed_total`
- `A_decay_burn_total`
- `median_b_balance`
- `inactive_reentry_rate`

### Scenario D: 格差拡大型

目的:
- 先行参加者や高 integrity 層に複利優位が偏りすぎないかを見る

条件:
- 初期に一部参加者へ大きな `Token B` / integrity を配る
- 後発参加者を時差投入する
- 高スコア者の Covenant 成功率を高める

見るもの:
- `gini_b`
- `gini_integrity`
- `top10_b_share`
- `newcomer_time_to_governance`
- `covenant_success_rate_newcomer`

### Scenario E: dispute 圧力

目的:
- 紛争コストが弱者を排除しないかを確認する

条件:
- dispute 頻度を高める
- 一部は悪意、残りは通常の認識差にする
- 低資産層と高資産層を混ぜる

見るもの:
- `dispute_win_rate_by_balance_bucket`
- `defense_quota_usage_rate`
- `virtual_stake_usage_rate`
- `recovery_rate_30d`

## 6. Stop/Go 基準

Phase1 では、以下を「危険信号」として扱う。

### Go に近い状態

- `reserve_coverage_ratio >= 1.1` を大半の期間で維持
- `dailyUBIAmount` の変化が clamp 内で収まる
- `top10_b_share` が時間とともに急拡大しない
- 新規参加者が一定期間内に `1 Token B` か governance 条件のどちらかへ届く
- 低資産層でも dispute に参加し、防御できる

### Warning

- `reserve_coverage_ratio < 1.0` が継続
- `gini_b` と `gini_integrity` が連続して悪化
- newcomer が `governance` や dispute defense にほぼ到達できない
- APPI ショック時に UBI 調整が止まらない

### Stop

- `Token B` 支払能力が継続的に枯渇する
- newcomer の参加成功率が極端に低い
- dispute が資産保有量だけでほぼ決まる
- Circuit Breaker 相当の介入なしに持続不能

## 7. 最小実装案

Phase1 では、いきなり精密な経済モデルを作らず、次の3段階で進める。

### 実行用の最小スクリプト

最初の実行形として、`scripts/run_phase1_simulation.py` を用意する。  
これは**厳密なオンチェーン再現ではなく、危険信号を早めに見るための近似シミュレーター**である。

例:

```bash
python scripts/run_phase1_simulation.py --scenario A
python scripts/run_phase1_simulation.py --scenario D --days 365 --seed 7
python scripts/run_phase1_simulation_batch.py --days 180 --seed 42 --scenarios A B D E
python scripts/run_phase1_parameter_sweep.py --scenario D --days 180 --seed 42
```

出力:

- `tmp/phase1_simulations/<scenario>_daily.csv`
- `tmp/phase1_simulations/<scenario>_summary.json`
- `tmp/phase1_simulations/phase1_summary_comparison.csv`
- `tmp/phase1_simulations/phase1_summary_comparison.json`
- `tmp/phase1_simulations/<scenario>_parameter_sweep.csv`
- `tmp/phase1_simulations/<scenario>_parameter_sweep.json`

この段階では次を優先する。

- メトリクスの傾向を見る
- 危険シナリオを再現する
- Stop/Go 基準に触れる条件を把握する

逆に、この段階ではまだ次は保証しない。

- 実コントラクト状態との完全一致
- 現実市場価格との一致
- 法制度・人間行動の精密再現

### Step 1: オフチェーン集計

- Foundry テストかローカル script で日次イベントを擬似生成
- CSV / JSON に以下を出す
  - day
  - appi
  - dailyUBIAmount
  - A_supply_total
  - B_reserves
  - B_liabilities
  - top10_b_share

### Step 2: プレイヤーモデル追加

参加者を4類型に分ける。

- claimant
  claim はするが work は少ない
- worker
  work をこなして `Token B` を増やす
- requester
  Covenant を作る
- challenger
  dispute を起こしやすい

この割合を変えながら 180日 / 365日 を回す。

### Step 3: 介入実験

以下のパラメータを変えて感度を見る。

- `dailyUBIAmount` 初期値
- APPI clamp 幅
- `crystallizationFeeBps`
- governance 閾値
- defense quota 条件
- dispute deposit 率

## 8. Phase1 で先に見るべきレポート

最初のレポートは、複雑にしすぎず以下の3枚で十分です。

1. 安定性ダッシュボード
   - `dailyUBIAmount`
   - `A_supply_total`
   - `B_reserves`
   - `reserve_coverage_ratio`

2. 公平性ダッシュボード
   - `top10_b_share`
   - `gini_b`
   - `gini_integrity`
   - `newcomer_time_to_1B`

3. dispute / 再起ダッシュボード
   - `dispute_win_rate_by_balance_bucket`
   - `defense_quota_usage_rate`
   - `recovery_rate_30d`

## 9. この設計の位置づけ

このシミュレーション設計は、「FairSoil は絶対に崩壊しない」と証明するものではありません。  
むしろ、**どの条件で危うくなるかを先に見つけ、Phase1 の guarded village として安全に回せる範囲を絞るためのもの**です。

したがって、Phase1 のゴールは次の通りです。

- 1つの村を長期間壊れず回す
- 物価ショックと停滞局面に耐える
- newcomer が再起できることを確認する
- 格差固定が見えたら、パラメータやルールを調整する

Factory 展開や完全 DAO 化は、その後の段階でよい。
