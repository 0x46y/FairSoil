# FairSoil

FairSoil は、誠実さと正直さが短期的な搾取やコストの外部化よりも報われる「公正な土壌」を育むことを目的とした、分散型ベーシックインカム（UBI）プロトコルです。

## ドキュメント
- 詳細仕様: `docs/spec_ja.md`
- ビジョン詳細: `docs/vision_ja.md`
- Phase2+ ideas: `docs/spec_future.md`
- 外部レビュー用まとめ（全仕様の統合版・マスター）: `docs/review_bundle_ja.md`
  - 再生成: `python scripts/build_review_bundle.py`

## 仕様リンク（章別）
- コアメカニズム: `docs/spec_ja.md#コアメカニズム`
- 会計ルール（0章）: `docs/spec_ja.md#0-会計ルール草案abtreasury`
- 経済・分配: `docs/spec_ja.md#経済分配`
- 知財・貢献: `docs/spec_ja.md#知財貢献`
- 教育・再挑戦: `docs/spec_ja.md#教育再挑戦`
- ガバナンス・監査: `docs/spec_ja.md#ガバナンス監査`
- 運用・安全: `docs/spec_ja.md#運用安全`
- 導入戦略: `docs/spec_ja.md#導入戦略-adoption-path`
- 技術スタック: `docs/spec_ja.md#技術スタック予定`
- 最低要件: `docs/spec_ja.md#最低要件予定`
- 開発環境: `docs/spec_ja.md#開発環境wsl2--foundry`

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
  - 参考: `docs/spec_future.md`

## 今後の検討事項（運用メモ）
- 文脈証拠（マルチメディア）の扱いは「オフチェーン保存＋オンチェーンは **evidenceHashのみ**」を前提とする。
- report/dispute には **evidenceHash** と簡易ステートメントを載せ、evidenceUri はオフチェーンの参照情報として保持する。
- AI要約は判定ではなく「論点整理」の支援としてオフチェーンで提供する。
- 裁定（Resolve）は二段階確定・確認ダイアログ・再審請求（1回）などで誤操作を抑止する。

## オンチェーン最小イベント（ユーザー/紛争の最小）
- `UBIAccrued(user, day, amountA)`
- `Claimed(user, fromDay, toDay, grossA, decayedA)`
- `DecayApplied(scope, amountA)`
- `CovenantCreated(id, templateHash, parties)`
- `IssueReported(covenantId, issueId, evidenceHash)`
- `Resolved(covenantId, issueId, stage, payoutA, payoutB, integrityDelta, finalizedAt)`

## 会計監査イベント（R7の最小）
- `TreasuryIn(from, amount, reason)`
- `TreasuryOutA(to, amount, reason)`
- `TreasuryOutB(to, amount, reason)`
- `LiabilityChanged(deltaA, deltaB, reason)`
- `ReserveSnapshot(reservesA, reservesB)`

## 未受領UBIの参照実装（正しさ優先）
- **台帳モデル:** `unclaimed[day] = amountA` の日次バケットを保持する。
- **請求時処理:** `age = nowDay - day` を基準に減価係数を適用し、合算して請求額を確定する。
- **減価回避の防止:** 請求の分割ではなく「発生日基準」で減価を適用する（仕様3と整合）。
- **最適化は後回し:** まず正確性を優先し、必要に応じてチェックポイント方式で圧縮する。

## オンチェーン/オフチェーン境界（最小定義）
**オンチェーンで確定するもの（最小）**
- 掟ID、状態遷移（Issue/Dispute/Resolve）、支払額、ロック/アンロック、ペナルティ結果、参照ハッシュ

**オフチェーンだが改ざん検知するもの**
- evidenceUri、要約、タイムライン説明文、添付（IPFS等）

**完全にオフチェーン**
- AI要約の生成過程、モデル、プロンプト（必要ならハッシュのみ保持）

## ビジョン（概要）
FairSoil は「誠実さが損にならない」経済基盤を目指す。  
最低限の生存（UBI）を保証し、搾取や外部化にコストを持たせる。  
詳細は `docs/vision_ja.md` を参照。


## コアメカニズム（詳細は docs/spec_ja.md）
- 詳細仕様・数式・運用ルールは `docs/spec_ja.md` に集約。
- README は初見向けの要約とスコープ明確化に集中。
