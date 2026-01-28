import type { Address } from "viem";

export const tokenAAddress = process.env.NEXT_PUBLIC_TOKENA_ADDRESS as
  | Address
  | undefined;
export const tokenBAddress = process.env.NEXT_PUBLIC_TOKENB_ADDRESS as
  | Address
  | undefined;
export const treasuryAddress = process.env.NEXT_PUBLIC_TREASURY_ADDRESS as
  | Address
  | undefined;
export const covenantAddress = process.env.NEXT_PUBLIC_COVENANT_ADDRESS as
  | Address
  | undefined;
export const resourceRegistryAddress = process.env
  .NEXT_PUBLIC_RESOURCE_REGISTRY_ADDRESS as Address | undefined;
export const covenantLibraryAddress = process.env
  .NEXT_PUBLIC_COVENANT_LIBRARY_ADDRESS as Address | undefined;
export const worldIdAppId = process.env.NEXT_PUBLIC_WORLD_ID_APP_ID;
export const worldIdActionId = process.env.NEXT_PUBLIC_WORLD_ID_ACTION_ID;
export const worldIdMock = process.env.NEXT_PUBLIC_WORLD_ID_MOCK === "true";
export const zknfcVerifierUrl = process.env.NEXT_PUBLIC_ZKNFC_VERIFIER_URL;
export const zknfcMock = process.env.NEXT_PUBLIC_ZKNFC_MOCK === "true";
export const externalAdjudicationUrl = process.env.NEXT_PUBLIC_EXTERNAL_ADJ_URL;
export const auditDisputeThreshold = Number.parseInt(
  process.env.NEXT_PUBLIC_AUDIT_DISPUTE_THRESHOLD || "5",
  10
);
export const auditTreasuryThreshold = Number.parseInt(
  process.env.NEXT_PUBLIC_AUDIT_TREASURY_THRESHOLD || "20",
  10
);
export const auditReserveThresholdA = Number.parseFloat(
  process.env.NEXT_PUBLIC_AUDIT_RESERVE_A_THRESHOLD || "100"
);
export const auditReserveThresholdB = Number.parseFloat(
  process.env.NEXT_PUBLIC_AUDIT_RESERVE_B_THRESHOLD || "100"
);
export const auditWindowHours = Number.parseInt(
  process.env.NEXT_PUBLIC_AUDIT_WINDOW_HOURS || "24",
  10
);

export const missingEnv =
  !tokenAAddress || !tokenBAddress || !treasuryAddress || !covenantAddress;
