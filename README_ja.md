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
- **導入戦略（入口の軽量化）:** まず未認証でも「見る/試す」を可能にし、認証レベルに応じて権限と受給額を段階解放する。  
  価値観の訴求ではなく、具体的な困りごと（例: 参加証明・地域ボランティア・転売防止チケット）の解決から普及させる。

## 詳細仕様の場所
- イベント一覧、会計監査イベント、未受領UBI参照実装、オン/オフ境界は `docs/spec_ja.md` に集約。

## ビジョン（概要）
FairSoil は「誠実さが損にならない」経済基盤を目指す。  
最低限の生存（UBI）を保証し、搾取や外部化にコストを持たせる。  
詳細は `docs/vision_ja.md` を参照。


## コアメカニズム（詳細は docs/spec_ja.md）
- 詳細仕様・数式・運用ルールは `docs/spec_ja.md` に集約。
- README は初見向けの要約とスコープ明確化に集中。
