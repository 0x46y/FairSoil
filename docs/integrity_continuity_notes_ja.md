# Integrity Continuity Notes（JA）

このメモは、FairSoil の Integrity を「wallet 単位」から「継続した personhood」にどう寄せるかを考えるための設計ノートである。

## 背景

現在の Phase1 では、Integrity は主に address に積まれる。  
これは MVP としては単純だが、長期では次の問題がある。

- address を変えると履歴 continuity が切れやすい
- primary address の再設定時に score をどう扱うかが曖昧
- personhood と privacy の両立が難しい

## 問題設定

やりたいことは次の両立である。

- 同一人物の誠実な履歴を継続的に扱う
- しかし不要に address 間リンクを強くしすぎない

## Phase1 の現状

- score は address 中心
- primary address が verified gate の中心
- person-level continuity はまだ未実装

## 将来の方向

### 1. primary-centered continuity

最小の進化形としては、primary address に score continuity を集約する。  
再認証済みの rebinding を通じて、新しい address に一部または全部を移す。

### 2. subjectHash-centered continuity

より進んだ形では、personhood の subject hash に対して score continuity を持ち、表示や操作時に current address へ投影する。

### 3. privacy-preserving attestation

最終的には、score continuity を ZKP / attestation で証明しつつ、不要な address リンクを避ける方向が望ましい。

## やるべきこと

- rebinding 時の score policy を決める
- address score と person-level score を分けるか決める
- governance / dispute / UBI でどの continuity を参照するか整理する

## やってはいけないこと

- address を変えたら無条件で別人扱いにする
- 逆に、すべての address を常時強くリンクして privacy を壊す
- integrity を唯一の正しさの源泉として扱う
