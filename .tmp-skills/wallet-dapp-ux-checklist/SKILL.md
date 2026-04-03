---
name: wallet-dapp-ux-checklist
description: Use when reviewing or implementing wallet-driven dApp flows such as connect, disconnect, reconnect, chain resets, allowance retries, transaction status UX, local-chain setup, or contract-address/env mismatches.
---

# Wallet dApp UX Checklist

## Overview

Use this skill for frontend flows that depend on a wallet connection, a live RPC, and contract addresses that may change between local and deployed environments.

This skill is for catching the failures that generic React or design guidance tends to miss:

- wallet switched but the dApp still thinks the old account is active
- chain restarted and the frontend still points at stale contract addresses
- approve succeeded but the second transaction failed, leaving the user stuck
- UI says "insufficient balance" or "already verified" without telling the user what to do next
- a local demo requires operator seeding or redeploy, but the screen gives no operational hint

## When To Use

Use this skill when the user asks to:

- review a dApp flow that depends on MetaMask or another injected wallet
- improve wallet connect, disconnect, or account switching UX
- fix retry behavior after `approve`, `transfer`, `claim`, `create`, or `submit`
- review local Anvil / testnet setup friction
- debug contract-read failures that may actually be env or address mismatches
- check whether transaction status, partial success, and fallback paths are explained clearly

Typical targets:

- wallet connect buttons and status panels
- transaction forms that require 1-step or 2-step flows
- allowance-based actions
- identity verification flows
- local-chain developer flows and runbooks

## Review Checklist

### 1. Wallet identity and session state

Check whether the UI makes these states explicit:

- not connected
- connected with address visible
- wrong account for this action
- wallet changed but dApp state has not refreshed
- wrong chain

Look for:

- a clear reconnect path
- explicit account-dependent helper text
- guidance when the user must disconnect and reconnect to refresh app state

### 2. RPC, env, and contract-address drift

Check whether failures caused by stale addresses or chain resets are distinguished from ordinary transaction errors.

Look for:

- missing env messaging
- local-chain restart guidance
- contract read failures that mention likely redeploy/address mismatch causes
- runbooks that say redeploy after Anvil restart and refresh `.env.local`

### 3. Two-step transaction flows

For actions like `approve + create` or `approve + lock`, check whether the UI handles partial success.

Look for:

- allowance re-check before repeating `approve`
- retry path that starts from step 2 when step 1 already succeeded
- transaction labels that distinguish first and second signatures
- success and failure messages that explain which step succeeded and which failed

### 4. Disabled actions must still explain the main action

A disabled button must still tell the user what the main action is.

Prefer:

- `Create Agreement (insufficient balance)`
- `Claim today's bonus (reserves unavailable)`

Avoid:

- replacing the action label entirely with a generic error state
- hiding the action behind unrelated optional settings

### 5. Next-step guidance

Every major wallet-driven flow should explain the next action in plain language.

Look for:

- "Suggested next step"
- retry/fallback panel
- explicit operator fallback wording in local or recovery flows
- guidance after verify, claim, create, submit, approve, and dispute actions

### 6. Local demo ergonomics

Check whether the local/dev flow is realistically operable.

Look for:

- seed or top-up scripts
- mock/operator fallback paths
- guidance for account import into MetaMask
- visible distinction between local mock, staging-like, and production-like modes

### 7. Auditability and supportability

Wallet-driven systems need good records when something goes wrong.

Look for:

- transaction outcome messages
- actor/role visibility in activity logs
- export path for dispute or review records
- enough context to escalate to external review or legal evidence if needed

## Implementation Guidance

When changing UI, prefer these patterns:

- keep the main action visible even when disabled
- keep optional settings visually secondary
- show compact participant-facing summaries and move heavy audit feeds into a separate view
- derive retry behavior from actual on-chain state such as allowance, verification status, or ownership
- explain the most likely operational fix instead of showing a raw revert only

## Anti-Patterns

Avoid these:

- the user must guess whether the dApp sees the right wallet
- a two-step flow always restarts from the first step
- the UI hides the real action behind "optional details"
- raw contract-read failures appear without likely operational causes
- local/test/demo assumptions leak into production wording without a visible mode label

## Deliverable Format

When using this skill, prefer concise findings grouped by:

1. wallet state clarity
2. transaction flow resilience
3. local/demo operability
4. audit and recovery visibility

If implementing changes, explain:

- what failed before
- what user-visible path is now clearer
- what remains intentionally manual
