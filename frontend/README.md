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
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Local chain setup

In another terminal, run Anvil and deploy contracts from the `contracts` directory:

```bash
anvil
```

```bash
forge script script/Deploy.s.sol --broadcast
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
