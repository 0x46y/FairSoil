import fs from "node:fs";
import path from "node:path";

const frontendDir = process.cwd();
const envPath = path.join(frontendDir, ".env.local");

const requester = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const worker = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  const out = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    out[key] = value;
  }
  return out;
}

const env = readEnvFile(envPath);

const required = [
  "NEXT_PUBLIC_TOKENA_ADDRESS",
  "NEXT_PUBLIC_TOKENB_ADDRESS",
  "NEXT_PUBLIC_TREASURY_ADDRESS",
  "NEXT_PUBLIC_COVENANT_ADDRESS",
];

const missing = required.filter((key) => !env[key]);

console.log("FairSoil manual wallet E2E");
console.log("");
console.log("Requester / temporary operator wallet:");
console.log(`  ${requester}`);
console.log("Worker wallet:");
console.log(`  ${worker}`);
console.log("");

if (missing.length > 0) {
  console.log("Missing .env.local values:");
  for (const key of missing) console.log(`  - ${key}`);
  console.log("");
  console.log("Fill frontend/.env.local first, then rerun this helper.");
  process.exit(1);
}

console.log("Current contract addresses:");
for (const key of required) {
  console.log(`  ${key}=${env[key]}`);
}

console.log("");
console.log("One-time prep if worker is not verified yet:");
console.log(`  export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`);
console.log(`  cast send ${env.NEXT_PUBLIC_TOKENA_ADDRESS} "setPrimaryAddress(address,bool)" ${worker} true --rpc-url http://127.0.0.1:8545 --private-key $PRIVATE_KEY`);
console.log("");
console.log("Suggested manual smoke flow:");
console.log("  1. Open http://localhost:3000");
console.log(`  2. Connect requester wallet ${requester}`);
console.log("  3. Claim today's bonus and confirm 'Action completed'");
console.log(`  4. Create a work agreement for worker ${worker} with a small reward like 25 SOILB`);
console.log("  5. Confirm the agreement appears in 'Work agreements'");
console.log(`  6. Switch MetaMask to worker wallet ${worker}`);
console.log("  7. Submit work and confirm the status changes to owner review");
console.log(`  8. Switch MetaMask back to requester wallet ${requester}`);
console.log("  9. Approve work and confirm Token B / Integrity / Recent activity update");
console.log("  10. Optionally switch to 'Run FairSoil' and add a manual reward report");
