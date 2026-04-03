# FairSoil Release Checklist (EN)

This note is the minimum checklist for moving FairSoil from local experimentation to external release.  
Unlike a plain web app, FairSoil has to ship **both the frontend** and the **smart-contract layer** together.

In practice, release means:

1. deploy contracts to the target chain  
2. update frontend env with the deployed addresses and verifier settings  
3. deploy the frontend to hosting  

## 1. Choose the target network

- decide which EVM chain FairSoil will run on
- check gas cost, wallet compatibility, and World ID fit
- Anvil is only for local development, not public release

## 2. Lock down deploy env

At minimum confirm:

- deployer private key
- RPC URL
- chain id
- optional `DECAY_RATE_PER_SECOND`
- production World ID / ZK-NFC verifier values

Before release, make sure no local/mock/staging values are leaking into production assumptions.

## 3. Deploy contracts

Minimum contract set:

- TokenA
- TokenB
- SoilTreasury
- Covenant
- ResourceRegistry
- CovenantLibrary

After deployment, record every contract address.

## 4. Configure initial roles

At minimum confirm:

- treasury owner
- reward operator
- dispute resolver
- dispute finalizer
- identity operator

Make sure production does not leave too much authority concentrated in a single deployer wallet.

## 5. Confirm initial parameters

Check that no local-only values remain for:

- daily UBI amount
- circuit breaker / caps
- advance caps
- dispute-related thresholds
- identity route assumptions

## 6. Update frontend env

At minimum update:

- `NEXT_PUBLIC_TOKENA_ADDRESS`
- `NEXT_PUBLIC_TOKENB_ADDRESS`
- `NEXT_PUBLIC_TREASURY_ADDRESS`
- `NEXT_PUBLIC_COVENANT_ADDRESS`
- `NEXT_PUBLIC_RESOURCE_REGISTRY_ADDRESS`
- `NEXT_PUBLIC_COVENANT_LIBRARY_ADDRESS`
- World ID / ZK-NFC related env
- optional `NEXT_PUBLIC_EXTERNAL_ADJ_URL`

## 7. Validate frontend build

Before release, at minimum run:

- `npm run lint`
- `npm run build`

Then confirm that preview/local production-like env is reading the correct addresses.

## 8. Validate production identity assumptions

At minimum verify:

- World ID route is using production settings
- verifier responses match production assumptions
- the flow reaches `setPrimaryAddress`
- no mock settings remain active

## 9. Run the minimum manual flow

Before public release, walk through at least:

- connect wallet
- verify
- claim
- create agreement
- submit
- approve
- dispute if needed
- simple transfer
- export dispute packet

## 10. Deploy the frontend

Deploy the web layer to Vercel / Cloudflare Pages / similar hosting.

Check:

- production env is correct
- preview env and production env are not mixed
- build output points to the intended chain and addresses

## 11. Post-release verification

After release, at minimum confirm:

- contract addresses on the explorer
- frontend reads are working
- audit trail is visible
- no stale/incorrect address is being read
- identity route labels reflect production assumptions

## 12. Freeze runbook and docs

Document at minimum:

- target chain
- all released contract addresses
- current role holders
- production identity assumptions
- rollback / emergency path
- known limitations

## 13. Current practical reminder

Releasing FairSoil is not just “publishing a website.”  
It is:

- deploying the institutional logic on-chain
- then deploying the frontend as the entry point into that logic

So release is only complete when addresses, roles, identity routing, and auditability are all aligned.

## 14. Bottom line

The safest order is:

1. contract deploy  
2. role / parameter confirmation  
3. frontend env update  
4. lint / build  
5. minimum manual flow  
6. hosting deploy  
7. post-release verification  

FairSoil should be treated as a **webapp + contract** release, not a frontend-only release.
