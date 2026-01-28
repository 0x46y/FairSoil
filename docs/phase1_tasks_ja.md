# Phase1 実装タスク分解（JA）

この一覧は「最短でPhase1を固める」順に並べたタスクです。  
実装対象は最小でOK、Phase2+は除外します。

## 1) ID連携の最小実装（最優先）
- **目的:** primary address を手動ではなく“認証フロー”で更新できる状態にする
- **対象:** `contracts/src/FairSoilTokenA.sol`, `frontend/src/app/page.tsx`
- **タスク:**
  - 認証完了後に `setPrimaryAddress(address,true)` を叩く最小フローを作成
  - フロントに「認証済み」表示（最低限のUX）
  - テスト用の“簡易認証モック”を用意（本番SDK前提でもOK）
- **完了条件:** フロントからprimary登録→UBI請求が通る

## 2) 裁定の外部委任ルート確定（実装最小）
- **目的:** disputeResolver を外部/代理運用に差し替え可能な状態にする
- **対象:** `contracts/src/Covenant.sol`, `frontend/src/app/page.tsx`
- **タスク:**
  - `disputeResolver` を運用ロールで差し替える手順をドキュメント化
  - UIに「外部裁定待ち」文言を表示（高額案件想定）
  - 高額案件のみ外部裁定に振る運用ルールを明文化
- **完了条件:** disputeResolver差し替えで運用可能と説明できる

## 3) 監査・可視化の最低限
- **目的:** Treasury/UBI/Disputeが“見える”状態にする
- **対象:** `frontend/src/app/page.tsx`（or 簡易ダッシュボード）
- **タスク:**
  - Treasuryの主要イベント（In/Out/ReserveSnapshot）表示
  - Covenantの状態遷移ログ表示
  - Liabilities/Reserves/収支の数値パネル追加
  - UBI未受領/請求状況の可視化（最低限）
- **完了条件:** 監査的に「今どうなっているか」がUIで見える

## 4) APPI運用フローの最小化
- **目的:** APPIが“動く”ことを証明できる
- **対象:** `contracts/src/APPIOracle.sol`, `contracts/src/SoilTreasury.sol`
- **タスク:**
  - 価格報告→median→applyAPPI の一連テスト
  - 異常値時の手動固定/停止手順をドキュメント化
  - 簡易シミュレーション（1カテゴリのみでも可）
- **UI確認:** 日次インデックスの表示と applyAPPI の反映をUIで確認する
- **完了条件:** APPI反映でUBIが変動することを確認

## 5) Dispute悪用対策の運用反映
- **目的:** 少額での悪用・乱用を抑止
- **対象:** `docs/spec_ja.md`, `frontend/src/app/page.tsx`
- **タスク:**
  - 自動保留/48hウィンドウ/返金上限の運用フローを明文化
  - UIに“自動保留”や“返金上限”の注記を追加
  - 低額案件の扱いルールを運用に追加
- **完了条件:** Dispute乱用対策がUI/運用の両方で説明できる

## 仕上げ（まとめ）
- **最終確認:** README / spec / review_bundle 再生成
- **デモ:** Phase1の一連フロー（認証→UBI→Covenant→Dispute→Resolve）を再現
