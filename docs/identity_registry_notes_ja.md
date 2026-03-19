# Identity Registry Notes（JA）

このメモは、Phase2 以降で必要になる `IdentityRegistry` / attestation router 的な抽象化層についての設計ノートである。

## 背景

FairSoil は Phase1 で

- World ID
- ZK-NFC
- mock verification

を同じ UI 導線に寄せている。  
しかし現状は、最終的に `setPrimaryAddress` へ集約するだけで、**どの認証ルートを通ったか**を on-chain で一般化していない。

## なぜ必要か

認証ルートが増えると、次の問題が出る。

- verifier source ごとの違いを UI や operator 運用に埋め込んでしまう
- どのルートがどの権限を与えるのか曖昧になる
- 将来、attestation / revoke / expiry を一元管理しにくい

## 役割

IdentityRegistry 的な層は最低限、次を担う。

- `address` がどの verifier route で認証されたかを保持
- 認証レベル（Tier / strength / credential type）を保持
- expiry / revoke を管理
- primary address 更新の根拠を記録

## 最小インターフェース案

- `attestIdentity(address user, bytes32 routeId, bytes32 subjectHash, uint64 expiresAt, bytes metadata)`
- `revokeIdentity(address user, bytes32 routeId, bytes32 reason)`
- `isVerified(address user) -> bool`
- `verificationLevel(address user) -> uint8`
- `verificationRoute(address user) -> bytes32`

## routeId の例

- `WORLD_ID`
- `ZK_NFC_PASSPORT`
- `ZK_NFC_MNC`
- `MOCK_OPERATOR`

## Phase1 との関係

Phase1 ではこの registry をまだ実装しなくてよい。  
ただし、UI と route をこの将来像を壊さない形で作るべきである。

今の route が同一オリジン API を経由しているのは、その意味では良い土台である。

## Phase2 でやるべきこと

- `setPrimaryAddress` 直結から、registry / attestation を経由する形に寄せる
- verifier source ごとの policy を registry に集約する
- revoke / expiry / upgrade path を同じ層で扱う
