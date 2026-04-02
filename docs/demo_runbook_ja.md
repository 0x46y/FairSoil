# FairSoil 3分デモ導線（JA）

このメモは、ハッカソン・グラント面談・壁打ちで **3分以内に FairSoil を見せるための最短導線**です。

## 0. 前提

- ローカル Anvil が起動済み
- コントラクト再デプロイ済み
- `frontend/.env.local` 更新済み
- `npm run dev` でフロント起動済み
- MetaMask は Anvil の deployer / test wallet に接続済み
- 実 World ID ルートを見せるなら `docs/worldid_acceptance_checklist_ja.md` と `frontend/e2e/manual_wallet_runbook.md` を手元に開いておく

## 1. 30秒: 何を作っているか

話すこと:

- FairSoil は「誠実さが損にならない経済圏」を目指す
- `Token A` は daily bonus 用の減価トークン
- `Token B` は work reward / asset 用の非減価トークン
- `Covenant` で agreement / escrow / dispute まで扱う

見せる場所:

- Hero セクション
- `Daily bonus`, `Work rewards`, `Trust score`

## 2. 45秒: 参加者フロー

話すこと:

- participant は verify -> claim bonus -> create agreement という導線
- UI は participant / operator を分けてある

見せる場所:

- `Use FairSoil` タブ
- `Claim today's bonus`
- `Create work agreement`

操作:

1. Wallet 接続
2. `Claim today's bonus`
3. worker / reward / basic fields を入力して agreement を作る

## 3. 45秒: agreement の決済

話すこと:

- requester が reward を escrow する
- worker が submit
- requester が approve
- worker に `Token B` と integrity が入る

見せる場所:

- `Work agreements`
- 対象 row の `Submit work` / `Approve work`

操作:

1. worker で `Submit work`
2. requester で `Approve work`
3. 残高と integrity が変わるのを見せる

## 4. 45秒: dispute フロー

話すこと:

- agreement に issue を出せる
- dispute は 2-step resolve
- Phase1 は resolver / finalizer を分けた暫定運用で、Phase2 は external arbiter を想定
- 資産量ではなく evidence と timeline を優先する方針

見せる場所:

- structured evidence 入力
- dispute track
- Recent activity

操作:

1. worker 側で `Ask for help`
2. requester 側で `Challenge claim`
3. arbiter 側で proposal / finalize

## 5. 30秒: 監査と弱点の自己開示

話すこと:

- Treasury / agreements / dispute の activity を UI で見せる
- 監査ログには「誰が、どの暫定ロールで実行したか」が出る
- シミュレーションで「UBI インフレ」より「dispute fairness」の方が課題だと分かった
- それを docs と UI に自己開示している

見せる場所:

- `Recent activity`
- `Phase 1 MVP` note
- dispute guidance

## 6. 30秒: 何に資金が必要か

話すこと:

- external arbiter / jury 接続
- identity flow の本実装と hardening
- APPI confidence 強化
- governance / factory / parameter set の Phase2 準備

## 7. 3分版の締め

最後に一言:

> FairSoil は、単に UBI を配るプロトコルではなく、  
> 「生活を守る」「仕事を透明化する」「紛争を公正に扱う」を同時にやろうとしている Phase1 MVP です。

## 付録: 詰まったときの代替導線

- もし identity が未接続なら:
  - `primary address` は既存 test wallet で見せる
- もし dispute が長いなら:
  - `Recent activity` と `Work agreements` の状態遷移だけ見せる
- もし時間が2分しかないなら:
  - Hero -> Claim -> Agreement approve -> Recent activity

## 実 World ID を使う場合の補助資料

- 正常系の受け入れ確認は `docs/worldid_acceptance_checklist_ja.md`
- MetaMask を使うローカル手順は `frontend/e2e/manual_wallet_runbook.md`
- staging / mock から production credential へ切り替える日は `frontend/e2e/worldid_production_cutover_checklist.md`
