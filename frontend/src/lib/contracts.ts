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

export const missingEnv =
  !tokenAAddress || !tokenBAddress || !treasuryAddress;
