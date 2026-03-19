import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");

function parseEnv(text) {
  const result = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    result[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return result;
}

const env = fs.existsSync(envPath) ? parseEnv(fs.readFileSync(envPath, "utf8")) : {};

console.log("FairSoil mock identity guide");
console.log("");
console.log("Recommended .env.local flags:");
console.log(`  NEXT_PUBLIC_WORLD_ID_MOCK=${env.NEXT_PUBLIC_WORLD_ID_MOCK || "true"}`);
console.log(`  NEXT_PUBLIC_ZKNFC_MOCK=${env.NEXT_PUBLIC_ZKNFC_MOCK || "true"}`);
console.log("");
console.log("If they are missing, add these lines to frontend/.env.local:");
console.log("  NEXT_PUBLIC_WORLD_ID_MOCK=true");
console.log("  NEXT_PUBLIC_ZKNFC_MOCK=true");
console.log("");
console.log("Minimal local test flow:");
console.log("  1. Restart the frontend after saving .env.local");
console.log("  2. Open http://localhost:3000");
console.log("  3. Connect the requester/operator wallet in MetaMask");
console.log("  4. In 'Step 1: Verify this wallet', click 'Verify (mock)'");
console.log("  5. Approve the wallet transaction");
console.log("  6. Confirm 'Verification status' changes to 'Verified'");
console.log("  7. Click 'Claim today's bonus'");
console.log("  8. Confirm 'Action completed' appears");
console.log("");
console.log("Expected outcome:");
console.log("  - primary address gets set");
console.log("  - verification card shows 'Verified'");
console.log("  - daily bonus flow becomes usable");
