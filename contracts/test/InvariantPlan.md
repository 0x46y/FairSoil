# Invariant Plan (R1〜R7 Checklist)

目的: FairSoil Phase2 実装で起きやすい会計事故・状態機械事故を、Foundry の invariant / fuzz で早期に潰す。
対象: SoilTreasury / Covenant / TokenA(Flow) / TokenB(Asset)

---

## 0. 前提（テストで固定する読み違い防止）
- [ ] Burn は Treasury の収入ではない（Burn量は Reserves に入らない）
- [ ] Treasury 支払原資は (a) Reserves もしくは (b) Seigniorage のみ
- [ ] A Burn → B Mint は禁止（A→B は結晶化のみ）
- [ ] UBI / Survival Buffer / 異議申立て / 再審 / 退出権はスコアで制限しない

---

## 1. 対象コントラクトと観測ポイント（要埋め）
### 1-1. 対象
- [ ] SoilTreasury: `contracts/src/SoilTreasury.sol`
- [ ] Covenant: `contracts/src/Covenant.sol`
- [ ] TokenA (Flow): `contracts/src/FairSoilTokenA.sol`
- [ ] TokenB (Asset): `contracts/src/FairSoilTokenB.sol`

### 1-2. “監査ログ”として必須イベント（要埋め）
（イベント名は実装に合わせて追記）
- [ ] Treasury 系（現行）:
  - `UBIClaimed(...)`
  - `UBIAccrued(...)`
  - `Claimed(...)`
  - `DecayApplied(...)`
  - `TreasuryOutA(...)`
  - `TreasuryOutB(...)`
  - `TreasuryIn(...)`
  - `DeficitAIssued(...)` (A発行)
  - `AdvanceBIssued(...)` (B前借り)
  - `CrystallizationMinted(...)`
  - `TaskCompleted(...)`
  - `ScoreUpdated(...)`
  - `PayPenaltyApplied(...)`
  - `APPIApplied(...)`, `APPIOracleSet(...)`
  - `CircuitStateSet(...)`
- [ ] Covenant 系（現行）:
  - `CovenantCreated(...)`
  - `CovenantSubmitted(...)`
  - `CovenantApproved(...)`
  - `CovenantRejected(...)`
  - `CovenantCancelled(...)`
  - `EscrowLocked(...)`
  - `EscrowReleased(...)`
  - `IssueReported(...)`
  - `IssueAccepted(...)`
  - `IssueDisputed(...)`
  - `ResolutionProposed(...)`
  - `DisputeResolved(...)`
  - `DisputeResolverSet(...)`
  - `MaliceSlashed(...)`
- [ ] 監査上不足している場合の追加候補:
  - `SeigniorageA(...)`
  - `LiabilityChanged(...)`
  - `ReserveSnapshot(...)`

---

## 2. 状態機械（最小仕様）
- Covenant: `Issue -> {Accept | Dispute} -> Resolve`
- Resolve 二段階確定: `Proposed -> Finalized`
- Appeal は 1 回のみ

### 2-1. 状態列挙（要埋め）
- [ ] enum/定数の一覧:
  - `Open`, `Submitted`, `Approved`, `Rejected`, `Cancelled`, `IssueReported`, `Disputed`, `ResolutionProposed`, `IssueResolved`
- [ ] 状態遷移表（from -> to / 関数 / ガード条件）:
  - `Open -> Submitted` : `submitWork` (worker only)
  - `Submitted -> Approved` : `approveWork` (creator only)
  - `Submitted -> Rejected` : `rejectWork` (creator only)
  - `Open -> Cancelled` : `cancel` (creator only)
  - `Open/Submitted/IssueReported -> IssueReported` : `reportIssue` (worker only)
  - `IssueReported -> IssueResolved` : `acceptIssue` (creator only)
  - `IssueReported/Disputed -> Disputed` : `disputeIssue` (creator only)
  - `Disputed/ResolutionProposed -> ResolutionProposed` : `resolveDispute` (resolver only)
  - `ResolutionProposed -> IssueResolved` : `finalizeResolution` (creator or resolver)

---

## 3. Invariant Checklist（R1〜R7）

---

### R1: 会計の一意性（分類不能な支払は禁止）
**意図:** あらゆる価値移転は「Mint / Treasury支出 / Transfer / Lock/Unlock」のどれかに分類できる。

- [ ] R1-1: “支払系関数”を全列挙する（Treasury支払、Covenant決済、UBI請求、結晶化、罰則、手数料等）
  - `SoilTreasury.claimUBI`
  - `SoilTreasury.accrueUBI`
  - `SoilTreasury.claimUnclaimed`
  - `SoilTreasury.emergencyMintA`
  - `SoilTreasury.emergencyAdvanceB`
  - `SoilTreasury.reportTaskCompleted`
  - `SoilTreasury.mintBByCrystallization`
  - `SoilTreasury.penalizeProcessScore`
  - `SoilTreasury.penalizePayScoreWithReason`
  - `SoilTreasury.recordFee`
  - `SoilTreasury.recordTax`
  - `SoilTreasury.recordSlashing`
  - `SoilTreasury.recordExternalIn`
  - `Covenant.submitWork`
  - `Covenant.approveWork`
  - `Covenant.rejectWork`
  - `Covenant.cancel`
  - `Covenant.acceptIssue`
  - `Covenant.resolveDispute`
  - `Covenant.finalizeResolution`
- [ ] R1-2: 列挙した全関数が「許可イベントセット」を必ず発火する（または revert）
  - 許可イベント例: Mint(A/B), Transfer(A/B), Lock/Unlock(A/B), TreasuryOutA/B, TreasuryIn, Burn(A/B)
- [ ] **reason 参照:** 理由定数は `SoilTreasury.REASON_*` を参照する（文字列直書きは禁止）
- [ ] R1-3: “分類不能な支払” が起きる呼び出しは revert する

**invariant案**
- [ ] INV-R1-a: 任意の操作列後、観測されたイベントは許可集合の部分集合である
- [ ] INV-R1-b: Treasury 残高が増えるイベントは `TreasuryIn`（または明示受領）経由のみ

**fuzzシナリオ**
- [ ] FZ-R1-1: ランダムな順序で全支払系関数を叩く（境界値含む）→ 例外があれば最小手順を保存

---

### R2: Treasury 支払制約（Reserves/Seigniorage 以外で支払不可）
**意図:** “Burnしたから払える” を絶対に許さない。Reserves の二重カウントを潰す。

- [ ] R2-1: `Treasury_Out_A` が **Reserves_A + Treasury_In + Seigniorage_A** を超えない
- [ ] R2-2: `Treasury_Out_B` は **Reserves_B** を超えない（B は準備金内のみ）
- [ ] R2-3: Burn が Reserves を増やさない（Burn→Reserves加算が無い）
- [ ] R2-4: Liabilities（未来債務）がある場合、支払が “債務未反映” で過大にならない

**invariant案**
- [ ] INV-R2-a: `Treasury.payA(x)` / `Treasury.payB(x)` 系は、原資不足状態では revert
- [ ] INV-R2-b: `Reserves_A(t+1) = Reserves_A(t) + In + Seigniorage - Out` を（近似でも）常に満たす
  - NOTE: イベントベースの会計再構成 or 直接 state 参照で検証

**fuzzシナリオ**
- [ ] FZ-R2-1: Reserves を枯らして支払要求 → 必ず revert
- [ ] FZ-R2-2: “Burn大量→支払” の順序を生成 → 支払原資扱いが発生しないこと

---

### R3: A Burn → B Mint 禁止（結晶化のみ）
**意図:** A の減価や罰則を “Bの財源” に変換する抜け道を封じる。

- [ ] R3-1: B Mint の発生源を列挙（Covenant承認 / 結晶化 / 他）
  - `SoilTreasury.reportTaskCompleted`
  - `SoilTreasury.emergencyAdvanceB`
  - `SoilTreasury.mintBByCrystallization`
- [ ] R3-2: A Burn の発生源から B Mint に到達する経路が存在しない
- [ ] R3-3: 結晶化以外からの A→B 相当の価値移転が無い（内部Swapや特例ミント含む）

**invariant案**
- [ ] INV-R3-a: `MintB` イベントが発火したら、その tx は (Covenant承認 or 結晶化) のタグ/理由を持つ
- [ ] INV-R3-b: `BurnA` が発火した tx で `MintB` が同時発火しない（例外なし）

**fuzzシナリオ**
- [ ] FZ-R3-1: Burn系関数群をランダムに叩く→ MintBが出たら即 fail

---

### R4: 二重支払禁止（Resolve時の併給は明示上限のみ）
**意図:** 同一 Covenant で複数回の Finalize / 支払 / 巻き戻しを防ぐ。

- [ ] R4-1: 同一 covenantId の `ResolveFinalized` は 1 回しか起きない
- [ ] R4-2: Finalize 後に再度支払が発生しない（reentrancy / 再実行含む）
- [ ] R4-3: 併給がある場合、A/B の支払合計が明示上限に収まる

**invariant案**
- [ ] INV-R4-a: covenantId ごとの `finalizedCount <= 1`
- [ ] INV-R4-b: covenantId ごとの “総支払額A/B” が上限を超えない

**fuzzシナリオ**
- [ ] FZ-R4-1: Finalize を二度叩く / 途中で Appeal を挟む / 同一入力を並列で叩く → 二重支払が無い

---

### R5: ロック/流通量分離（Locked B は Circulating から除外）
**意図:** “ロック分まで流通量に含めた” 指標や上限計算の誤りを防ぐ。

- [ ] R5-1: `Circulating_B = Total_B - Locked_B` が常に成り立つ
- [ ] R5-2: Lock/Unlock の状態が Covenant の遷移と一致する（どの遷移で増減するか明確）
- [ ] R5-3: Locked_B を使った支払や Transfer ができない（保全）

**invariant案**
- [ ] INV-R5-a: `lockedB[address] <= balanceB[address]`
- [ ] INV-R5-b: `sumLockedB <= totalSupplyB`
- [ ] INV-R5-c: lock中のBは transfer できない（または transfer可能でも circulating計算から除外が破綻しない）

**fuzzシナリオ**
- [ ] FZ-R5-1: lock/unlock をランダムに繰り返す → Circulating が負にならない/一致する

---

### R6: DeficitCap_A / AdvanceCap_B 上限制約
**意図:** “例外経路だけ cap が抜ける” を潰す。

- [ ] R6-1: A 支出（赤字許容）に cap が全経路で適用される
- [ ] R6-2: B 前借り（Advance）に cap が全経路で適用される
- [ ] R6-3: cap 変更があるなら、変更のガード（タイムロック/権限/上限）が守られる

**invariant案**
- [ ] INV-R6-a: 任意操作列で `outA_over_cap == false`
- [ ] INV-R6-b: 任意操作列で `advanceB_over_cap == false`

**fuzzシナリオ**
- [ ] FZ-R6-1: 緊急関数/管理者関数/例外関数を混ぜて cap 超過を狙う → 超えない

---

### R7: 監査ログの完全性（主要指標が再構成可能）
**意図:** 後から検証できること。イベント不足で「正しいか分からない」状態を防ぐ。

- [ ] R7-1: In/Out/Seigniorage/Liabilities/Reserves の変化が追跡できるイベントが揃っている
- [ ] R7-2: Covenant の状態遷移がイベントだけで再構成できる
- [ ] R7-3: 監査ログの欠落（支払は発生したのに Out イベントが無い等）が起きない

**invariant案**
- [ ] INV-R7-a: 支払が起きた tx では必ず対応イベント（OutA/OutB/Transfer等）が発火する
- [ ] INV-R7-b: 重大操作（cap変更/停止/復帰/アップグレード等）があるなら必ずイベントが出る

**fuzzシナリオ**
- [ ] FZ-R7-1: 全操作をランダム生成→ “ログ欠落” が起きたら fail（txレベルで検知）

---

## 4. 実装メモ（テストハーネス設計）
- [ ] Handler を分割する（TreasuryHandler / CovenantHandler / UbiHandler / CrystalizeHandler）
- [ ] 役割アドレスを固定で用意（admin / userA..N / attacker / oracle / relayer）
- [ ] 時間操作（warp）を使う場合、UBI/減価/再審期限の境界を重点的に踏む
- [ ] reentrancy を疑う関数は attacker コントラクト経由で叩く

---

## 5. TODO（現状ギャップの明示）
- [ ] TokenB Lock が未実装なら、R5 を Pending にして “保留理由/再開条件” を書く
- [ ] 未受領UBI が仕様のみなら、R?（UBI関連）のテストは設計のみ先に書く
- [ ] Resolve 不可逆の invariant が TODO なら、R4 とセットで最優先に実装する

---

## 6. 期待する成果物（CIでの合格条件）
- [ ] `forge test` で invariant/fuzz が安定して走る（一定回数/一定時間）
- [ ] 失敗時は最小再現シード/操作列が出力される
- [ ] R1〜R7 のどれが落ちたかがログで分かる
