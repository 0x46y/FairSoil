# World ID Acceptance Checklist（JA）

実 verifier が使える日に、この checklist を使って Phase1 の World ID bridge が UI を変えずに end-to-end で通るか確認します。

## 事前条件

- `NEXT_PUBLIC_WORLD_ID_APP_ID` が設定されている
- `NEXT_PUBLIC_WORLD_ID_ACTION_ID` が設定されている
- `NEXT_PUBLIC_WORLD_ID_ENVIRONMENT` が対象 (`staging` / `production`) と一致している
- `NEXT_PUBLIC_WORLD_ID_MOCK=false`
- `WORLD_ID_VERIFY_URL` が接続先 verifier relay を指している
- 検証対象の wallet が UI で接続されている
- `setPrimaryAddress` を実行できる operator account が使える

## 送信前の UI 確認

- `Active route` が `World ID (...)` になっている
- `World ID mode` が対象環境ラベルと一致している
- `ZK-NFC mode` が想定どおりの fallback 状態になっている
- wallet 接続時に World ID ボタンが活性化している
- identity card に `Config missing` が出ていない

## 正常系

1. まだ primary になっていない address から開始する
2. `Verify with World ID` を押す
3. World ID の proof 取得フローを完了する
4. アプリが `/api/worldid/verify` 経由で verifier 結果を中継することを確認する
5. その後フロントが `setPrimaryAddress(address,true)` へ進むことを確認する
6. UI の状態が `Verified` に遷移することを確認する
7. fallback 専用メッセージなしで `Primary address registered` が出ることを確認する

## 異常系

- 無効または拒否された proof で `Verification failed` が出る
- verifier 到達不能で `Verifier unreachable` が出る
- env や app/action id 不足で `Config missing` が出る
- 失敗後も retry ボタンが残る
- その環境で意図した fallback が引き続き使える

## 監査と後続確認

- identity card 上でその wallet が verified と見える
- 検証後に gated action が page reload なしでも使える
- recent activity / timeline の role 表示が崩れていない
- 正常系では operator fallback を使っていない
- 成功時のスクリーンショットやログを run record に残している

## 対象外

この checklist では次は扱いません。

- nullifier policy の hardening
- multi-device の re-bind フロー
- Tier 1 / Tier 2 / Tier 3 の本番権限差
- 長期的な IdentityRegistry 設計
