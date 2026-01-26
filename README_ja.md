# FairSoil

FairSoil は、誠実さと正直さが短期的な搾取やコストの外部化よりも報われる「公正な土壌」を育むことを目的とした、分散型ベーシックインカム（UBI）プロトコルです。
本README全体の英語版は `README.md` にあります。

## ドキュメント
- 詳細仕様: `docs/spec_ja.md`
- ビジョン詳細: `docs/vision_ja.md`
- Phase2+ ideas: `docs/spec_future_ja.md`
- 外部レビュー用まとめ（全仕様の統合版・マスター）: `docs/review_bundle_ja.md`
  - 再生成: `python scripts/build_review_bundle_ja.py`

## 仕様リンク
- 詳細仕様（目次）: `docs/spec_ja.md`
- 会計ルール（0章）: `docs/spec_ja.md#0-会計ルール草案abtreasury`
- ガバナンス・監査: `docs/spec_ja.md#ガバナンス監査`

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

## 今後の検討事項（運用メモ）
- 文脈証拠（マルチメディア）の扱いは「オフチェーン保存＋オンチェーンは **evidenceHashのみ**」を前提とする。
- report/dispute には **evidenceHash** と簡易ステートメントを載せ、evidenceUri はオフチェーンの参照情報として保持する。
- AI要約は判定ではなく「論点整理」の支援としてオフチェーンで提供する。
- 裁定（Resolve）は二段階確定・確認ダイアログ・再審請求（1回）などで誤操作を抑止する。

## 詳細仕様の場所
- イベント一覧、会計監査イベント、未受領UBI参照実装、オン/オフ境界は `docs/spec_ja.md` に集約。

## ビジョン（概要）
FairSoil は「誠実さが損にならない」経済基盤を目指す。  
最低限の生存（UBI）を保証し、搾取や外部化にコストを持たせる。  
詳細は `docs/vision_ja.md` を参照。


## コアメカニズム（詳細は docs/spec_ja.md）
- 詳細仕様・数式・運用ルールは `docs/spec_ja.md` に集約。
- README は初見向けの要約とスコープ明確化に集中。
