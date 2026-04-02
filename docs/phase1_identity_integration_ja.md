# Phase1 Identity Integration（JA）

このメモは、FairSoil Phase1 の identity 連携を「何が実装済みで、何が mock で、何を本番 verifier に差し替えるのか」という観点で整理したものです。

## 現在の Phase1 実装

Phase1 のフロントは、`Step 1: Verify this wallet` から次の 3 ルートを扱います。

1. World ID
2. ZK-NFC
3. Temporary operator による mock primary 登録

共通の最終到達点は `setPrimaryAddress(address,true)` です。  
つまり、Phase1 の identity 連携は「外部 verifier が success を返したら、owner/operator が primary address を更新する」最小構成です。

現在の UI では次も表示します。

- `Active route`
- `World ID mode`
- `ZK-NFC mode`

これにより、local mock / staging 風設定 / production 風設定のどれで見ているかを、環境変数を開かなくても把握できます。

## フロントから見た流れ

1. ユーザーが `Verify this wallet` を押す
2. フロントが同一オリジン API route に POST する
3. route が mock success か、外部 verifier endpoint へ中継する
4. `verified: true` を受けたら `setPrimaryAddress` を送る
5. UI 上の `Verification status` が `Verified` に変わる

## 現在の route

- World ID: `frontend/src/app/api/worldid/verify/route.ts`
- ZK-NFC: `frontend/src/app/api/zknfc/verify/route.ts`

## 環境変数

### ローカル mock

```env
NEXT_PUBLIC_WORLD_ID_MOCK=true
NEXT_PUBLIC_ZKNFC_MOCK=true
```

完全ローカルのデモ用としては次が分かりやすいです。

```env
NEXT_PUBLIC_WORLD_ID_ENVIRONMENT=staging
NEXT_PUBLIC_WORLD_ID_MOCK=true
NEXT_PUBLIC_ZKNFC_MOCK=true
```

### 外部 verifier 接続

```env
NEXT_PUBLIC_WORLD_ID_APP_ID=...
NEXT_PUBLIC_WORLD_ID_ACTION_ID=...
WORLD_ID_VERIFY_URL=https://...
NEXT_PUBLIC_ZKNFC_VERIFIER_URL=https://...
```

補足:
- `WORLD_ID_VERIFY_URL` は server-side route から使う前提
- `NEXT_PUBLIC_WORLD_ID_VERIFY_URL` も fallback として読めるが、可能なら server-side env を優先する
- ZK-NFC 側は現状 `NEXT_PUBLIC_ZKNFC_VERIFIER_URL` を route が中継する
- `NEXT_PUBLIC_WORLD_ID_ENVIRONMENT` は UI 上の `World ID mode` 表示 (`staging` / `production`) にも使う

## 本番 verifier に差し替えるときの要件

### World ID

最低限、route は次の入力を外部 verifier に渡せる形であるべきです。

- wallet address
- app id
- action id
- proof
- signal
- nullifier hash

Phase1 の現在 UI は proof 取得 UI そのものをまだ持っていないため、実 verifier を厳密に使うなら次段で SDK 接続が必要です。  
今の route は「server-side verifier へ橋をかける土台」です。

### ZK-NFC

最低限、route は次を verifier へ渡せればよいです。

- wallet address
- 必要なら proof payload / signed attestation

こちらも Phase1 では「同一オリジン route に寄せる」ことを優先しており、完全な proof UI まではまだ未実装です。

## Phase1 として十分な到達点

Phase1 では次が満たされれば十分です。

- mock route で primary address 登録まで通る
- 実 verifier endpoint がある場合は route 差し替えで同じ UI から使える
- UI 上で `Verified / Not verified yet` が分かる
- UI 上でどの identity route が有効か分かる
- 検証後に UBI claim へ進める

## まだ未実装のもの

- World ID SDK を用いた proof 取得 UI
- ZK-NFC proof 生成 UI
- Tier 1 / Tier 2 / Tier 3 の権限差の本格反映
- nullifier separation の実運用
- device binding / re-bind フロー
- 最終デプロイ先に対する本番 World ID live verification の完全確認

## 方針

Phase1 では「完全な identity stack」ではなく、

- UI から verify を押せる
- route を mock / remote で差し替えられる
- 最終的に primary address が更新される

という最小の一貫フローを重視する。
