# FairSoil Release Checklist（JA）

このメモは、FairSoil をローカル実験から外部公開へ進める時の最小チェックリストです。  
FairSoil の公開は、普通の webapp の公開とは違い、**フロントエンド**と**スマートコントラクト**の 2 層を揃えて出す必要があります。

要するに release は、

1. コントラクトを対象チェーンへ deploy する  
2. その address / verifier 設定を frontend に反映する  
3. frontend を hosting へ deploy する  

の 3 段です。

## 1. 対象ネットワークを決める

- どの EVM チェーンに出すかを決める
- gas cost、wallet 対応、World ID との相性を確認する
- Anvil のままでは外部公開にはならない

## 2. deploy 用 env を確定する

最低限、次を確認する。

- deployer private key
- RPC URL
- chain id
- 必要なら `DECAY_RATE_PER_SECOND`
- World ID / ZK-NFC verifier 系の本番 env

本番前に、local/mock/staging の値が残っていないかを見る。

## 3. コントラクトを deploy する

最低限の対象は次です。

- TokenA
- TokenB
- SoilTreasury
- Covenant
- ResourceRegistry
- CovenantLibrary

deploy 後は、各 contract address を必ず記録する。

## 4. 初期 role を設定する

最低限、次の role を確認する。

- treasury owner
- reward operator
- dispute resolver
- dispute finalizer
- identity operator

本番では、deployer 一人に role を寄せすぎないか確認する。

## 5. 初期パラメータを確認する

次のような値が local 用のまま残っていないかを見る。

- daily UBI amount
- circuit breaker / cap
- advance cap
- dispute 関連の閾値
- identity route の前提

## 6. frontend env を更新する

最低限、次を本番値へ更新する。

- `NEXT_PUBLIC_TOKENA_ADDRESS`
- `NEXT_PUBLIC_TOKENB_ADDRESS`
- `NEXT_PUBLIC_TREASURY_ADDRESS`
- `NEXT_PUBLIC_COVENANT_ADDRESS`
- `NEXT_PUBLIC_RESOURCE_REGISTRY_ADDRESS`
- `NEXT_PUBLIC_COVENANT_LIBRARY_ADDRESS`
- World ID / ZK-NFC 関連 env
- 必要なら `NEXT_PUBLIC_EXTERNAL_ADJ_URL`

## 7. frontend build を確認する

公開前に最低限これを通す。

- `npm run lint`
- `npm run build`

そのうえで、preview/local 本番相当 env で address が正しく読まれているか確認する。

## 8. identity の本番前提を確認する

最低限、次を見る。

- World ID route が本番設定になっているか
- verifier 応答が本番前提で正しいか
- `setPrimaryAddress` までの導線が崩れていないか
- mock 設定が残っていないか

## 9. 最小の実機確認をする

公開前に、少なくとも次を一周する。

- connect wallet
- verify
- claim
- create agreement
- submit
- approve
- 必要なら dispute
- simple transfer
- export dispute packet

## 10. frontend を deploy する

Vercel / Cloudflare Pages などへ deploy する。

ここで確認すること:

- production env が正しいか
- preview env と production env が混ざっていないか
- build output が想定の chain/address を読んでいるか

## 11. 公開後チェックをする

公開後は最低限、次を見る。

- explorer で contract address を確認
- UI から read が崩れていないか
- audit trail が見えるか
- wrong address / old address を読んでいないか
- identity route 表示が production 前提になっているか

## 12. runbook と docs を固定する

最低限、次を docs に残す。

- どの chain に出したか
- 各 contract address
- role を誰が持つか
- identity の本番前提
- rollback / emergency 対応
- known limitations

## 13. 現時点の補足

FairSoil の公開は、単なる「web サイトの公開」ではありません。  
実際には、

- **チェーン上の制度を deploy**
- **その制度の入口として frontend を deploy**

することです。

したがって、address や role の固定、identity route の確認、公開後の auditability まで含めて初めて release が成立します。

## 14. まとめ

最短で言うと、公開前に守るべき順番はこれです。

1. contract deploy  
2. role / parameter 確認  
3. frontend env 更新  
4. lint / build  
5. 最小実機確認  
6. hosting deploy  
7. 公開後チェック  

FairSoil は `webapp + contract` の 2 層構成なので、  
どちらかだけ出しても release 完了とはみなさない方が安全です。
