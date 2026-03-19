# FairSoil

FairSoil は、誠実さと正直さが短期的な搾取やコストの外部化よりも報われる「公正な土壌」を育むことを目的とした、分散型ベーシックインカム（UBI）プロトコルです。
本README全体の英語版は `README.md` にあります。

## ドキュメント
- 詳細仕様: `docs/spec_ja.md`
- ビジョン詳細: `docs/vision_ja.md`
- Phase2+ ideas: `docs/spec_future_ja.md`
- Phase1 シミュレーション設計: `docs/phase1_simulation_plan_ja.md`
- コントラクトのテスト整理: `contracts/TESTING.md`
- 外部レビュー用まとめ（全仕様の統合版・マスター）: `docs/review_bundle_ja.md`
  - 再生成: `python scripts/build_review_bundle_ja.py`

## 仕様リンク
- 詳細仕様（目次）: `docs/spec_ja.md`
- 会計ルール（0章）: `docs/spec_ja.md`
- ガバナンス・監査: `docs/spec_ja.md`

## MVPマイルストーン（Phase 1）
- 達成日: 2026/01/14
- 完了内容: Token A（減衰）、Token B（資産）、Soil Treasury（金庫）、Covenant（掟）の全結合テストを完了。
- 実証結果: Covenantの承認により、報酬支払いと誠実スコア加算が自動的に発生することを確認。

## Scope（Phase1 / Phase2+）
**✅ Phase1(MVP) scope（現行コントラクトに存在する範囲）**
- SoilTreasury（cap / circuit / oracle連携 / UBI台帳 / Liabilities/Reserves）
- TokenA/TokenB（減価/ロック/循環量）
- Covenant（支払モード・2段階Resolve）

**🟡 Phase2+ ideas（思想/将来案。実装対象外）**
- APPIのconfidence強化、予測市場/QF/RPGF等の制度設計
- 追加インセンティブ/ガバナンス拡張（詳細は別ドキュメントへ）
  - 参考: `docs/spec_future_ja.md`

## Phase1 の運営ロール（暫定）
- **Temporary Operator:** Phase1 では、コントラクトを初期設定し、Treasury や APPI などのシステム設定を更新する暫定運営ロールを置く。
- **Dispute Arbiter:** 紛争時には、単一アドレスまたは限定ロールの裁定者が二段階 Resolve を進める。
- **位置づけ:** これは完成形の DAO ガバナンスではなく、MVP を安全に回すための移行運用である。
- **将来方針:** Phase2 以降は、Temporary Operator は timelock + governance に、Dispute Arbiter は外部裁定や選出型の仕組みに段階移行する前提で設計する。

## Phase1 で今できること
- 認証済みアドレスへの Token A 配布、未受領枠の蓄積、一括請求
- Token B を前払いロックする Covenant の作成、提出、承認、キャンセル
- Issue / Dispute / Proposed / Finalized までの最小紛争フロー
- Treasury の準備金・負債・入出金イベントの追跡
- APPI、Resource Registry、Template Library などの MVP 機能確認

## Phase1 でまだやらないこと
- 完全な DAO ガバナンスへの移行
- 外部裁定を前提にした本格運用
- 本番向けの UX、法制度対応、無停止アップグレード運用
- マルチ経済圏の Factory 展開

## テストの現状
- Foundry では `FairSoilMVP`, `Covenant`, `CovenantEscrowFlow`, `CircuitBreaker`, `SoilTreasuryUnclaimedUBI`, `ResourceRegistry`, `CovenantLibrary`, `APPIIntegration`, `Invariant` 系など、Phase1 の主要領域に対するテストを用意している。
- 現在の優先順位は「新しい構想を広げること」より、「この1つの村を壊れず回すこと」である。
- UI 側も、まずは participant / operator の役割分離、平易な言葉、主要フローの確認導線を優先する。
- 次段階として、経済崩壊と格差固定の懸念を確認するためのシミュレーション設計を `docs/phase1_simulation_plan_ja.md` に整理している。
- 最小の近似実行として `python scripts/run_phase1_simulation.py --scenario A` を用意している。
- 4シナリオ比較は `python scripts/run_phase1_simulation_batch.py --days 180 --seed 42 --scenarios A B D E` で出力できる。
- パラメータ sweep は `python scripts/run_phase1_parameter_sweep.py --scenario D --days 180 --seed 42` で比較できる。

## Phase1 で見えた課題（自己開示）
- 近似シミュレーションでは、UBI そのものによる即時のインフレ崩壊はまだ強く観測されていない。
- 一方で、**低資産層が dispute で不利になりやすい**という偏りは確認されている。
- deposit を軽くするだけでは偏りは十分に改善せず、**裁定ロジックの独立性**や **外部裁定への接続**の方が効く可能性が高い。
- したがって Phase1 の dispute arbiter は、資産量ではなく証拠と文脈を優先して判断する暫定運用とし、Phase2 では外部陪審・外部裁定へ段階移行する。
- この評価はまだ近似シミュレーション段階であり、今後も実測とテストで更新する。

## アイデンティティ（実験型の中身、普及型の入口）
- **Tier 1:** メール / SNS など軽量な参加（閲覧・お試し用）
- **Tier 2:** Passkey（端末生体/顔）で少額の権限を段階開放
- **Tier 3:** World ID もしくは ZK‑NFC（公的IDのNFC証明。例: パスポートIC/マイナンバー等）でフル受給
- **Nullifier 分離:** UBI/投票/統計で用途別に一意性を分離
- **端末バインディング:** 盗難耐性を高め、端末変更時は再認証で再バインド
- **再認証の条件:** 端末変更・プライマリアドレスの再バインド・高リスク操作（前払い枠の拡張等）のみで要求する（毎回の提示は不要）

## 今後の検討事項（運用メモ）
- 文脈証拠（マルチメディア）の扱いは「オフチェーン保存＋オンチェーンは **evidenceHashのみ**」を前提とする。
- report/dispute には **evidenceHash** と簡易ステートメントを載せ、evidenceUri はオフチェーンの参照情報として保持する。
- AI要約は判定ではなく「論点整理」の支援としてオフチェーンで提供する。
- 裁定（Resolve）は二段階確定・確認ダイアログ・再審請求（1回）などで誤操作を抑止する。
- **外部裁定のプラグイン方針:** disputeResolver は外部裁定（Kleros 等）を接続できる“ソケット”とし、初期は最小運用（単一アドレス/限定ロール）で回す。高額案件のみ外部裁定へ切り替える前提で設計する。
- **裁定基準の方針:** dispute の結論は「どちらが金を持っているか」ではなく、提出された証拠・手順整合性・文脈説明を主軸に判断する。資産差は spam 防止の経済条件には使っても、裁定結果の有利不利には直接使わない。
- **導入戦略（入口の軽量化）:** まず未認証でも「見る/試す」を可能にし、認証レベルに応じて権限と受給額を段階解放する。  
  価値観の訴求ではなく、具体的な困りごと（例: 参加証明・地域ボランティア・転売防止チケット）の解決から普及させる。

## 段階的・包括的紛争解決プロトコル（ロードマップ）
**Phase A（最小防衛 - 現行実装ターゲット）**
- 相互預託（Mutual Staking）: 作業者/依頼者が紛争を提起する際、報酬額の 5% を Token B で預託する。
- 悪意ベースのスラッシング: 悪意（Malice）判定された場合のみ預託金を没収。誠実な敗訴は返還。
- 悪意ベースのクールダウン: 悪意認定された者に一定期間の新規契約制限を付与。

**Phase B（弱者保護と参入障壁の緩和 - 設計済）**
- バーチャル・ステーク: 資産が少ないユーザーは Token B の代わりに誠実スコアを担保にできる。
- ディフェンス・クォータ: 高スコア保持者に、資産をリスクにさらさない免責枠を付与する。

**Phase C（専門知と民主性の統合 - 将来設計）**
- ハイブリッド陪審制: 専門家バッジ保持者と一般ユーザーを混合抽出する。
- 指数関数的スパムガード: 不当な敗訴を繰り返す者に提起コストを累進的に課す。
- AI法務官の論点整理: 証拠・規約整合性の論点整理を陪審へ提示する。

## 詳細仕様の場所
- イベント一覧、会計監査イベント、未受領UBI参照実装、オン/オフ境界は `docs/spec_ja.md` に集約。

## ビジョン（概要）
FairSoil は「誠実さが損にならない」経済基盤を目指す。  
最低限の生存（UBI）を保証し、搾取や外部化にコストを持たせる。  
詳細は `docs/vision_ja.md` を参照。


## コアメカニズム（詳細は docs/spec_ja.md）
- 詳細仕様・数式・運用ルールは `docs/spec_ja.md` に集約。
- README は初見向けの要約とスコープ明確化に集中。
