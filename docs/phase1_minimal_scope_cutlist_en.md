# Phase1 Minimal Scope Cut List (EN)

This note turns `docs/phase1_minimal_dispute_spec_en.md` into concrete UI/feature cuts for Phase1.  
The goal is to keep FairSoil focused on **decaying money + escrow-backed work + minimal dispute**, instead of letting every future idea leak into the Phase1 surface.

## 0. Core Phase1 priority

Phase1 only needs three things:

1. users can verify and receive UBI  
2. users can create escrow-backed work agreements and complete `create -> submit -> approve`  
3. if something breaks, a minimal `issue / challenge / resolve / finalize` path exists  

Everything beyond that may be useful, but is not a Phase1 survival condition.

## 1. UI areas to de-emphasize now

### 1-1. Full Template Library workflow

Target:

- `frontend/src/app/page.tsx`

Candidates to move deeper:

- `Template ID (optional)`
- `Save template`
- `Record template use`
- `Creator share (bps)`
- template-author royalty detail

Why:

- not required to complete the work agreement lifecycle
- makes first-time creation harder to parse
- repeatedly distracts from the core flow in manual testing

Phase1 treatment:

- keep behind an expandable section or move to operator/dev-only context
- keep in docs, but not as part of the main participant flow

### 1-2. Strong market comparison and pricing analysis in the main flow

Target:

- `frontend/src/app/page.tsx`
- `frontend/src/lib/useCovenantReview.ts`

Candidates to soften:

- comparable agreement warnings
- front-facing market baseline blocks
- large explanations around `scope + urgency + material class + hours band`
- price-heavy review priority tags

Why:

- important as an integrity concern, but not required for create/submit/approve
- too much pricing emphasis can shift disputes toward vague impression rather than evidence

Phase1 treatment:

- keep as operator assistance
- do not let it dominate participant-facing flow

### 1-3. Front-facing external adjudication path

Target:

- `frontend/src/components/WorkAgreementRow.tsx`

Candidates to soften:

- `Open external adjudication`
- strong wording that implies real high-value routing is already live

Why:

- front-loads expectation around functionality that is not yet connected
- users should primarily understand what they can do now

Phase1 treatment:

- keep in docs
- reduce to a note or hide from the main path

## 2. Dispute inputs to simplify

### 2-1. Resolver review form depth

Target:

- `frontend/src/components/WorkAgreementActionPanel.tsx`
- `frontend/src/lib/useDisputeFormState.ts`

Candidates to simplify:

- `Claim summary`
- `Requester response`
- `Missing evidence / gaps`
- `Arbiter evidence URL`
- heavily structured arbiter note forms

Why:

- useful for auditability, but expensive for Phase1 operators
- can turn adjudication quality into a test of who writes longer notes

Phase1 treatment:

- shrink to `recommended payout + short final note`
- keep extra fields optional

### 2-2. Heavy evidence-packet input for every user

Target:

- `frontend/src/components/WorkAgreementActionPanel.tsx`
- `frontend/src/lib/evidencePacket.ts`

Candidates to soften:

- title
- hash
- summary
- context
- requestedOutcome

Why:

- structured packets help, but requiring every field raises procedural cost
- Phase1 should let users start from `reason + sourceUrl`

Phase1 treatment:

- make `reason + sourceUrl` the main entry
- move additional fields behind “add more detail”

## 3. Audit/operator features to push back

### 3-1. Heavy review heuristics

Target:

- `frontend/src/lib/useCovenantReview.ts`
- `frontend/src/app/page.tsx`

Candidates to reduce:

- strong missing-summary warnings
- market anomaly front-facing warnings
- repeated-pair / ring heuristics in prominent locations
- highly composite priority tags

Why:

- useful operationally, but not more important than showing the next required action
- too many heuristics make the system feel discretionary

Phase1 treatment:

- keep:
  - `Needs my action`
  - role labels
  - audit trail

That is enough.

### 3-2. KPI/dashboard analysis surfaces

Target:

- `frontend/src/app/page.tsx`

Candidates to reduce:

- detailed dispute volume warnings
- grouped scope analytics
- market baselines by scope

Why:

- useful for demos and operator analysis
- not essential for user comprehension of “what do I do next?”

## 4. Keep in docs, but do not rush to build

### 4-1. External arbiter / jury / elected resolver

Docs:

- `docs/spec_future_en.md`
- `docs/phase2_migration_map_en.md`

Why:

- strategically important
- not required for Phase1 core operation

### 4-2. Governance / timelock migration

Docs:

- `docs/spec_future_en.md`
- `docs/phase2_migration_map_en.md`

Why:

- important later
- but today, auditable temporary operation matters more

## 5. What Phase1 should definitely keep

### Participant flow

- verify
- claim
- create agreement
- submit work
- approve / reject / cancel

### Dispute flow

- worker issue
- requester accept / challenge
- resolver proposal
- finalizer confirmation

### Supporting UX

- role-aware controls
- `Needs my action`
- `Executed by ... as ...`
- short evidence reference
- short reason

## 6. Implementation priority

### P0

1. de-emphasize template / royalty UI in agreement creation  
2. simplify worker/requester/resolver dispute forms toward `short reason + url + final note`  
3. move external adjudication out of the main UI path  

### P1

4. demote market baseline / comparable agreement features to operator assistance  
5. reduce review priority tags to a small Phase1 set such as `missing evidence` and `needs response`  

### P2

6. split docs more clearly between `core flow` and `future structure`  
7. keep external arbiter / jury / governance primarily in docs until the core flow is stable  

## 7. Bottom line

FairSoil already contains a lot.  
But some future-leaning ideas are beginning to bleed into the Phase1 surface.

So the natural shape is:

- **keep:** decaying money, escrow, minimal dispute, audit trail  
- **de-emphasize:** template / royalty / market analysis / advanced review forms  
- **push back:** external adjudication / jury / governance as live user-facing features  
