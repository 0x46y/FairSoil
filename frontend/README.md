This is the FairSoil MVP dashboard built with [Next.js](https://nextjs.org).

## Getting Started

Install dependencies:

```bash
npm install
```

Set local contract addresses:

```bash
cp .env.example .env.local
```

Fill in the deployed addresses in `.env.local`:

```
NEXT_PUBLIC_TOKENA_ADDRESS=0x...
NEXT_PUBLIC_TOKENB_ADDRESS=0x...
NEXT_PUBLIC_TREASURY_ADDRESS=0x...
NEXT_PUBLIC_COVENANT_ADDRESS=0x...
NEXT_PUBLIC_RESOURCE_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_COVENANT_LIBRARY_ADDRESS=0x...
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
```

For local Phase1 identity testing, you can enable the mock verification routes:

```env
NEXT_PUBLIC_WORLD_ID_MOCK=true
NEXT_PUBLIC_ZKNFC_MOCK=true
```

If you want to use the real World ID widget flow instead of the mock route, set:

```env
NEXT_PUBLIC_WORLD_ID_APP_ID=app_...
NEXT_PUBLIC_WORLD_ID_ENVIRONMENT=production
NEXT_PUBLIC_WORLD_ID_ACTION_ID=verify-fairsoil
NEXT_PUBLIC_WORLD_ID_MOCK=false
WORLD_ID_RP_ID=rp_...
RP_SIGNING_KEY=0x...
```

For World ID v4 widget flow, the frontend now requests an RP signature from
`/api/worldid/rp-signature`, then sends the proof to `/api/worldid/verify`.
That means `WORLD_ID_RP_ID` and `RP_SIGNING_KEY` should be set on the Next.js server
when you want the real World ID widget instead of the mock route.

Notes:

- `RP_SIGNING_KEY` should be the raw private key string, not the whole downloaded JSON file.
- Set `NEXT_PUBLIC_WORLD_ID_ENVIRONMENT=staging` when you want to use the World ID simulator with a staging app, and `production` when you want to use the real World App with a production app.
- `WORLD_ID_VERIFY_URL` is optional in this repo. If it is unset, the server route falls back to `https://developer.world.org/api/v4/verify/${WORLD_ID_RP_ID}`.
- `WORLD_ID_DEBUG=true` enables server-side World ID request logs in the Next.js terminal for local debugging.
- `NEXT_PUBLIC_ZKNFC_VERIFIER_URL` is only needed if you also want the ZK-NFC button.

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## E2E checks

Playwright covers the current participant/operator dashboard split without requiring a connected wallet.

Run the E2E suite against an already running local dev server:

```bash
npm run e2e
```

Run it headed for manual debugging:

```bash
npm run e2e:headed
```

For the real MetaMask-backed flow, use the manual wallet runbook:

```bash
npm run e2e:wallet:guide
```

Detailed steps are in `e2e/manual_wallet_runbook.md`.

For a browser-first World ID staging flow, use the simulator runbook:

```bash
cat e2e/worldid_simulator_runbook.md
```

For the production switch after staging is validated, use:

```bash
cat e2e/worldid_production_cutover_checklist.md
```

If you do not yet have a real World ID, use the mock identity guide:

```bash
npm run identity:mock:guide
```

Detailed steps are in `e2e/mock_identity_runbook.md`.

For demo prep, use the checklist in `e2e/pre_demo_checklist.md`.

GitHub workflow templates are also available:

- `.github/ISSUE_TEMPLATE/demo-readiness.md`
- `.github/pull_request_template.md`

### Local chain setup

In another terminal, run Anvil and deploy contracts from the `contracts` directory:

```bash
anvil
```

```bash
forge script script/Deploy.s.sol:Deploy --rpc-url http://127.0.0.1:8545 --broadcast -vvv
```

Copy the printed contract addresses into `.env.local`.

This project uses `next/font` to load Space Grotesk and Fraunces.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy

Use any Node hosting platform once you point to the correct RPC and contract addresses.
