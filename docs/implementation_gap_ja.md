# FairSoil 実装ギャップ表（JA）

この表はリポジトリ内の実装（`contracts/src` / `frontend/src`）を基に、`docs/spec_ja.md` の主要項目がどこまで実装済みかを整理したものです。  
更新日: 2026-01-28

## 判定基準
- Implemented: 仕様の主要動作がコードで確認できる
- Partial: 一部のみ実装、または暫定/中央集権的な代替
- Not implemented: 仕様のみでコード上に確認できない

## コアメカニズム
| 項目 | 状態 | 根拠（主な実装） | 注記 |
| --- | --- | --- | --- |
| Token A 減価 | Implemented | `contracts/src/FairSoilTokenA.sol` | 減価は実装済み |
| Survival Buffer（動的） | Partial | `contracts/src/FairSoilTokenA.sol` | バッファは固定値で実装、APPI連動は未実装 |
| UBI（日次/未受領/バッチ） | Implemented | `contracts/src/SoilTreasury.sol` | accrue/claim/未受領減価が実装 |
| 代理設定・自己制限 | Not implemented | なし | 仕様のみ |
| Token B mint/lock/unlock | Implemented | `contracts/src/FairSoilTokenB.sol` | ロック/アンロック実装済み |
| Covenant 基本フロー | Implemented | `contracts/src/Covenant.sol` | 作成/提出/承認/拒否/キャンセル |
| Covenant 紛争/裁定 | Partial | `contracts/src/Covenant.sol` | Dispute/Resolveはあるが裁定者は単一アドレス |
| Integrityスコア加点 | Partial | `contracts/src/SoilTreasury.sol` | 加点/減点の枠はあるが運用・基準は未整備 |

## ID / Sybil耐性
| 項目 | 状態 | 根拠（主な実装） | 注記 |
| --- | --- | --- | --- |
| World ID 連携 | Partial | `frontend/src/app/page.tsx`, `frontend/src/app/api/worldid/verify/route.ts` | UI/モック/検証APIの骨格はあるが、実SDK/検証連携は未接続 |
| Tier1/2/3 | Not implemented | なし | 仕様のみ |
| Primary address | Partial | `contracts/src/FairSoilTokenA.sol`, `frontend/src/app/page.tsx` | Ownerが手動設定する形（UIはあるが実ID連携は未接続） |
| ZK‑NFC（公的ID） | Not implemented | なし | 仕様のみ |

## 会計・Treasury
| 項目 | 状態 | 根拠（主な実装） | 注記 |
| --- | --- | --- | --- |
| Treasury収入/支出記録 | Implemented | `contracts/src/SoilTreasury.sol` | recordFee/Tax/Slashing/ExternalIn 等 |
| Reserves/負債管理 | Implemented | `contracts/src/SoilTreasury.sol` | snapshotReserves/adjustLiabilities |
| canPayOut ガード | Implemented | `contracts/src/SoilTreasury.sol` | A/B で支払可能判定あり |
| Seigniorage ルール | Partial | `contracts/src/SoilTreasury.sol` | 明示ルールは仕様のみ |
| A→B 結晶化 | Implemented | `contracts/src/SoilTreasury.sol` | 率/手数料/ミント処理あり |

## APPI / オラクル
| 項目 | 状態 | 根拠（主な実装） | 注記 |
| --- | --- | --- | --- |
| APPI Oracle | Partial | `contracts/src/APPIOracle.sol` | オンチェーン投稿型のみ |
| APPI反映（UBI調整） | Implemented | `contracts/src/SoilTreasury.sol` | applyAPPI 実装 |
| 外部CPI/TWAP参照 | Not implemented | なし | 仕様のみ |

## Dispute / 紛争運用
| 項目 | 状態 | 根拠（主な実装） | 注記 |
| --- | --- | --- | --- |
| 二段階Resolve | Implemented | `contracts/src/Covenant.sol` | Proposed/Resolvedの遷移あり |
| DAO裁定 | Not implemented | なし | 仕様のみ |
| Dispute悪用対策 | Not implemented | なし | 仕様のみ（運用方針） |

## テンプレート/ロイヤリティ/資源
| 項目 | 状態 | 根拠（主な実装） | 注記 |
| --- | --- | --- | --- |
| ResourceRegistry（Harberger税） | Implemented | `contracts/src/ResourceRegistry.sol`, `frontend/src/app/page.tsx` | 最小MVP（税計算/購入/徴税） |
| CovenantLibrary（テンプレ登録） | Partial | `contracts/src/CovenantLibrary.sol`, `frontend/src/app/page.tsx` | 登録/更新/利用記録のみ。系譜/類似度/ステーキング等は未実装 |
| RoyaltyRouter（ロイヤリティ支払） | Partial | `contracts/src/RoyaltyRouter.sol`, `contracts/src/Covenant.sol` | 最小支払のみ。減衰/上限/再帰配分は未実装 |
| ロイヤリティ減衰 | Not implemented | なし | 仕様のみ（時間経過で減衰しパブリックドメイン化） |
| ロイヤリティ分配キャップ | Not implemented | なし | 仕様のみ（テンプレ/単一タスクの上限設定） |
| 系譜/類似度追跡 | Not implemented | なし | 仕様のみ（テンプレ類似度チェック・フォークタグ） |

## プライバシー/監査/安全
| 項目 | 状態 | 根拠（主な実装） | 注記 |
| --- | --- | --- | --- |
| 監査ログ可視化 | Implemented | `frontend/src/app/page.tsx`, `contracts/src/SoilTreasury.sol` | Covenant/Treasuryイベントの監査トレイル表示・CSV出力あり |
| ZKP/データ最小化 | Not implemented | なし | 仕様のみ |
| サーキットブレーカー | Implemented | `contracts/src/SoilTreasury.sol` | Normal/Limited/Halted |
| マルチシグ/タイムロック | Not implemented | なし | 仕様のみ |

## Phase2+（概要）
Phase2+ に分類される項目（教育支援、資源税、保険/再保険、予測/早期警告など）は現状すべて未実装です。
