# FairSoil

FairSoil は、誠実さと正直さが短期的な搾取やコストの外部化よりも報われる「公正な土壌」を育むことを目的とした、分散型ベーシックインカム（UBI）プロトコルです。
本README全体の英語版は `README.md` にあります。

## ドキュメント
- 詳細仕様: `docs/spec_ja.md`
- ビジョン詳細: `docs/vision_ja.md`
- Phase2+ ideas: `docs/spec_future_ja.md`
- Phase2 migration map: `docs/phase2_migration_map_ja.md`
- Phase2 parameter catalog: `docs/phase2_parameter_catalog_ja.md`
- Phase1 シミュレーション設計: `docs/phase1_simulation_plan_ja.md`
- Token A 校正メモ: `docs/token_a_calibration_notes_ja.md`
- Phase1 threat model: `docs/phase1_threat_model_ja.md`
- Market vocabulary: `docs/market_vocabulary_ja.md`
- Phase1 identity 連携メモ: `docs/phase1_identity_integration_ja.md`
- Phase1 dispute fairness メモ: `docs/phase1_dispute_fairness_ja.md`
- Phase1 minimal dispute spec: `docs/phase1_minimal_dispute_spec_ja.md`
- Phase1 requester protection spec: `docs/phase1_requester_protection_spec_ja.md`
- Phase1 minimal scope cut list: `docs/phase1_minimal_scope_cutlist_ja.md`
- 裁定制度のアンチパターン整理: `docs/adjudication_antipatterns_ja.md`
- dispute record 公開設計メモ: `docs/dispute_record_publication_ja.md`
- 対外説明で誤解されやすい点の整理: `docs/external_explanation_notes_ja.md`
- Identity nullifier scope メモ: `docs/identity_nullifier_scope_ja.md`
- Identity registry メモ: `docs/identity_registry_notes_ja.md`
- Integrity continuity メモ: `docs/integrity_continuity_notes_ja.md`
- Grants one-pager: `docs/grants_onepager_ja.md`
- 3分デモ導線: `docs/demo_runbook_ja.md`
- Grants use of funds: `docs/grants_use_of_funds_ja.md`
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
- **Reward Operator:** `reportTaskCompleted` は treasury owner から承認済み reward operator に委譲できる。
- **Dispute Resolver / Finalizer:** dispute proposal と finalization は、Phase1 では意図的に別ロールへ分離している。
- **Identity Operator:** identity route は最終的に `setPrimaryAddress` へ収束し、現行 Phase1 ではこれも暫定運営ステップである。
- **位置づけ:** これは完成形の DAO ガバナンスではなく、MVP を安全に回すための移行運用である。
- **将来方針:** Phase2 以降は、Temporary Operator は timelock + governance に、resolver / finalizer 系は外部裁定や選出型の仕組みに段階移行する前提で設計する。

## Phase1 で今できること
- 認証済みアドレスへの Token A 配布、未受領枠の蓄積、一括請求
- Token B を前払いロックする Covenant の作成、提出、承認、キャンセル
- Issue / Dispute / Proposed / Finalized までの最小紛争フロー
- Treasury の準備金・負債・入出金イベントの追跡
- APPI、Resource Registry、Template Library などの MVP 機能確認

## Token A の現在の意味
- 現在の初期値は `100 Token A / 日` で、発生単位は日次である。
- これは現実の最低生活費に校正済みの本番値ではなく、**Phase1 の制度挙動を確認するための初期パラメータ** である。
- 受け取りは日次に限らず、週次や月次のまとめ請求でもよい。
- 将来は `APPI` と `Survival Buffer` を通じて、より現実の生活費感覚へ寄せる。
- 詳細: `docs/token_a_calibration_notes_ja.md`

## Phase1 identity 連携（最小実装）
- `Verify this wallet` から World ID / ZK-NFC / mock の 3 ルートを扱う。
- UI には `Active route`、`World ID mode`、`ZK-NFC mode` を表示し、local/mock/staging/production の状態を一目で見分けられるようにしている。
- 実 verifier が使える日には `docs/worldid_acceptance_checklist_ja.md` で World ID の rollout を確認する。
- 現在の最小実装は「route が success を返したら `setPrimaryAddress` を送る」構成である。
- local では `NEXT_PUBLIC_WORLD_ID_MOCK=true` と `NEXT_PUBLIC_ZKNFC_MOCK=true` で確認できる。
- 推奨 env パターンは `local mock`、`staging-like`、`production-like` の 3 つに整理している。
- 詳細: `docs/phase1_identity_integration_ja.md`

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

## Phase1 dispute の位置づけ
- Phase1 の dispute は、FairSoil 全体の中心機能ではなく、`Token A / Token B / escrow 付き work agreement` を補助する**例外処理**として置いている。
- 目標は「完全な自動裁判」ではなく、**一方的な踏み倒しや長引かせで弱い側が潰れにくい最小手続**を提供することにある。
- したがって README では dispute を重い制度として説明しすぎず、Phase1 では「軽い review と最終確定の仕組み」として扱う。

## Phase1 dispute の原則
- 裁定結果は wallet size ではなく `evidence / timeline / procedure` を主軸に判断する。
- integrity は補助指標であり、証拠より強い根拠として扱わない。
- defense quota は「争えるようにする」ための補助であって、自動勝利補正ではない。
- requester 側保護は完全対称の dispute ではなく、**限定的な misconduct report** として扱う。
- 裁定ログは `Executed by ... as ...` と evidence 参照を残し、後から検証しやすくする。
- Phase1 の internal review は既定路線だが、**重い案件は将来 external adjudication に逃がせる socket** を維持する。

## Phase1 dispute で今わかっていること
- 近似シミュレーションでは、UBI そのものによる即時のインフレ崩壊はまだ強く観測されていない。
- 一方で、**低資産層が dispute で不利になりやすい**という偏りは確認されている。
- deposit を軽くするだけでは偏りは十分に改善せず、**裁定ロジックの独立性**や **外部裁定への接続**の方が効く可能性が高い。
- 別の主要リスクとして、**価格の妥当性を装った中抜き、相場の不透明さ、談合的な reputation farming** がある。詳細: `docs/phase1_threat_model_ja.md`
- この価格比較を壊さないため、Phase1 では scope / material / urgency / hours band に固定 vocabulary を使う。詳細: `docs/market_vocabulary_ja.md`
- operator UI では、繰り返しペア・相互役割ペア・template author への偏りなどの **reputation ring heuristic warning** を表示する。ただしこれは証拠ではなく、要レビュー候補の表示に留める。
- operator UI では、証拠不足・resolver summary 欠落・価格乖離も **review priority tag** として表示し、先に見るべき案件を前に出す。
- operator UI には **Needs my action** キューと role-aware controls を置き、requester / worker / reward operator / resolver / finalizer ごとの次アクションを追いやすくしている。

## Phase1 dispute で今はやらないこと
- 完全対称の双方向 dispute engine
- 陪審・ランダム選出・外部裁定を前提にした重い制度
- dispute だけで公平性を完成させること
- SNS や世論をそのまま裁定の代替にすること

## Phase1 dispute の詳細メモ
- fairness 方針: `docs/phase1_dispute_fairness_ja.md`
- 最小仕様: `docs/phase1_minimal_dispute_spec_ja.md`
- requester 保護: `docs/phase1_requester_protection_spec_ja.md`
- dispute record 公開設計: `docs/dispute_record_publication_ja.md`
- 避けたいアンチパターン: `docs/adjudication_antipatterns_ja.md`
- UI/機能の cut list: `docs/phase1_minimal_scope_cutlist_ja.md`
- 対外説明の言い換え: `docs/external_explanation_notes_ja.md`

## アイデンティティ（実験型の中身、普及型の入口）
- **Tier 1:** メール / SNS など軽量な参加（閲覧・お試し用）
- **Tier 2:** Passkey（端末生体/顔）で少額の権限を段階開放
- **Tier 3:** World ID もしくは ZK‑NFC（公的IDのNFC証明。例: パスポートIC/マイナンバー等）でフル受給
- **Nullifier 分離:** UBI/投票/統計で用途別に一意性を分離
- **端末バインディング:** 盗難耐性を高め、端末変更時は再認証で再バインド
- **再認証の条件:** 端末変更・プライマリアドレスの再バインド・高リスク操作（前払い枠の拡張等）のみで要求する（毎回の提示は不要）

## Identity の未解決論点
- nullifier は UBI / voting / analytics で用途別に分ける必要がある。詳細: `docs/identity_nullifier_scope_ja.md`
- World ID / ZK-NFC / mock を将来まとめるため、Phase2 では IdentityRegistry 的な層が必要になる。詳細: `docs/identity_registry_notes_ja.md`
- Integrity は現在 address 中心であり、personhood continuity は未完成である。詳細: `docs/integrity_continuity_notes_ja.md`

## 今後の検討事項（運用メモ）
- 文脈証拠（マルチメディア）の扱いは「オフチェーン保存＋オンチェーンは **evidenceHashのみ**」を前提とする。
- report/dispute には **evidenceHash** と簡易ステートメントを載せ、evidenceUri はオフチェーンの参照情報として保持する。
- AI要約は判定ではなく「論点整理」の支援としてオフチェーンで提供する。
- 裁定（Resolve）は二段階確定・確認ダイアログ・再審請求（1回）などで誤操作を抑止する。
- **外部裁定のプラグイン方針:** disputeResolver は外部裁定（Kleros 等）を接続できる“ソケット”とし、初期は最小運用（単一アドレス/限定ロール）で回す。高額案件のみ外部裁定へ切り替える前提で設計する。
- **導入戦略（入口の軽量化）:** まず未認証でも「見る/試す」を可能にし、認証レベルに応じて権限と受給額を段階解放する。  
  価値観の訴求ではなく、具体的な困りごと（例: 参加証明・地域ボランティア・転売防止チケット）の解決から普及させる。

## dispute の段階移行イメージ
- **Phase1:** internal review を前提にした最小 dispute。evidence / timeline / procedure を重視し、requester 側保護は限定的な misconduct report として扱う。
- **Phase2:** バーチャル・ステーク、defense quota、高額案件の external routing など、弱者保護と第三者性を強める。
- **長期:** hybrid jury、elected resolver、timelock + governance への段階移行を検討する。
- 詳細な将来案は `docs/spec_future_ja.md` と `docs/phase2_migration_map_ja.md` に分離している。

## 詳細仕様の場所
- イベント一覧、会計監査イベント、未受領UBI参照実装、オン/オフ境界は `docs/spec_ja.md` に集約。

## ビジョン（概要）
FairSoil は「誠実さが損にならない」経済基盤を目指す。  
最低限の生存（UBI）を保証し、搾取や外部化にコストを持たせる。  
詳細は `docs/vision_ja.md` を参照。


## コアメカニズム（詳細は docs/spec_ja.md）
- 詳細仕様・数式・運用ルールは `docs/spec_ja.md` に集約。
- README は初見向けの要約とスコープ明確化に集中。
