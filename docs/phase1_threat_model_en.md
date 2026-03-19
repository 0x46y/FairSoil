# Phase1 Threat Model (EN)

This note explains which kinds of malicious behavior FairSoil Phase1 handles relatively well, and which ones remain weak points.

## 1. Context

Phase1 FairSoil is a guarded MVP with the following properties:

- on-chain payments and escrow are relatively transparent
- Treasury reserves and liabilities are observable
- Covenant payout, royalty, and status transitions are auditable
- but **price fairness** and **off-chain collusion** are not automatically guaranteed

So the main Phase1 threat model is less about simple tampering and more about **market opacity, collusion, and evidence framing**.

## 2. Areas where the system is relatively strong

### 2-1. Simple accounting tampering

It is easier to audit:

- who was paid
- how much was escrowed
- how reserves and liabilities moved
- what royalty split was used

This is stronger than a fully opaque off-chain ledger.

### 2-2. Obvious non-payment or double-payment

If flows go through Covenant and Treasury, the following are easier to detect:

- work was approved but not paid
- a finalized amount was paid twice
- status and actual payout diverge

## 3. Areas where the system is still weak

### 3-1. Hidden markup and kickback pricing

Example:

- an intermediary is secretly aligned with a contractor
- hidden referral fees or kickbacks are embedded in the total price
- the user lacks market intuition and cannot detect overpricing

FairSoil helps with transparency of payment flows, but not yet with **whether the quoted price was fair**.

### 3-2. Collusion and reputation rings

Example:

- a group routes work through each other
- low-value transactions are used to farm Integrity
- reputation is inflated through coordinated behavior

This can create the appearance of honest history without genuine public trust.

### 3-3. Evidence framing attacks

Example:

- only selective evidence is presented
- the written explanation shapes the arbiter's perception
- evidence URIs are technically present but hard to interpret

Even with hashes on-chain, **the framing of evidence** still depends heavily on human review.

### 3-4. Market-opacity exploitation

Example:

- ordinary users do not know the fair market range
- nearby providers share the same gray-market practice
- multiple quotes still converge on inflated norms

In such cases, transparency alone does not remove exploitation.

### 3-5. Dependence on temporary operators

Because Phase1 still uses a `Temporary Operator` and `Dispute Arbiter`, it depends on:

- quality of adjudication
- quality of parameter tuning
- quality of emergency intervention

## 4. Typical malicious patterns

### Pattern A: Kickback pricing

- requester and vendor are secretly linked
- the total quote includes undisclosed referral rent
- the user sees only the top-line number

### Pattern B: Reputation ring

- a cluster creates Covenants for each other
- submits and approves looped work
- Integrity is farmed before approaching real users

### Pattern C: Evidence framing attack

- the hash is real, but the story is manipulated
- order, selection, and presentation distort the arbiter's judgment

### Pattern D: Market opacity

- no clear reference range exists
- users cannot compare similar jobs
- overpricing hides behind ambiguity

## 5. What Phase1 should do about it

### 5-1. Add market transparency, not only accounting transparency

Future UI / protocol work should prioritize:

- structured quote breakdowns
- comparable price ranges for similar jobs
- explicit royalty / referral / fee disclosure
- relationship disclosure among requester / creator / template author

### 5-2. Keep dispute focused on evidence, not price intuition

- disputes should not be resolved purely by "too expensive / too cheap"
- the first question should be what the parties actually agreed to
- price fairness should become a separate audit layer

### 5-3. Do not over-trust Integrity

- Integrity should remain a supporting signal
- it should never outrank evidence and timeline
- reputation-ring warnings should never be treated as proof on their own

### 5-4. Heuristic warnings already implemented in Phase1

The Phase1 operator UI now surfaces **review warnings** for the following concentration patterns:

- the same `creator -> worker` pair appears 3 or more times
- the same two addresses appear repeatedly with reversed `creator / worker` roles
- the same requester repeatedly uses templates from the same template author
- the requester is also the template author

These are not proof of collusion. They are heuristics for review priority only.
Legitimate repeat work and small communities can trigger them, so they must be read together with evidence, price ranges, and related-party disclosures.

## 6. Next design tasks

- add price-range references to the Resource Registry
- add expected effort / breakdown / useful-life metadata to Templates
- show warnings for abnormal profit margins or referral rates
- make related-party disclosure and reputation-ring warnings more structured
- build dispute flows that help arbiters focus on evidence instead of wallet size

## 7. Bottom line

- FairSoil is relatively strong at **making money flows visible**.
- It is still weaker at **making price fairness visible** and **detecting collusion**.
- The main Phase1 risks are not simple bookkeeping fraud, but market opacity, evidence framing, and related-party coordination.
