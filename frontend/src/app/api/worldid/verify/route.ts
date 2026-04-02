import { NextResponse } from "next/server";
import type { IDKitResult } from "@worldcoin/idkit";

type VerifyPayload = {
  address?: string;
  appId?: string;
  actionId?: string;
  idkitResponse?: IDKitResult;
  rpContext?: {
    rp_id?: string;
    nonce?: string;
    created_at?: number;
    expires_at?: number;
    signature?: string;
  };
};

type VerifierResponse = {
  success?: boolean;
  verified?: boolean;
  message?: string;
};

const redactAddress = (value?: string) =>
  value ? `${value.slice(0, 6)}...${value.slice(-4)}` : undefined;

const hasOwnString = (value: unknown, key: string) =>
  typeof value === "object" &&
  value !== null &&
  key in value &&
  typeof (value as Record<string, unknown>)[key] === "string";

export async function POST(request: Request) {
  try {
    const debugEnabled = process.env.WORLD_ID_DEBUG === "true";
    const body = (await request.json()) as VerifyPayload;
    if (!body.address || !body.appId || !body.actionId || !body.idkitResponse) {
      return NextResponse.json(
        { verified: false, message: "Missing address/appId/actionId/idkitResponse." },
        { status: 400 }
      );
    }

    const mockEnabled = process.env.NEXT_PUBLIC_WORLD_ID_MOCK === "true";
    if (mockEnabled) {
      return NextResponse.json(
        {
          verified: true,
          message: "World ID mock verification accepted.",
          mode: "mock",
        },
        { status: 200 }
      );
    }

    const rpId = body.rpContext?.rp_id || process.env.WORLD_ID_RP_ID;
    const verifierUrl =
      process.env.WORLD_ID_VERIFY_URL ||
      process.env.NEXT_PUBLIC_WORLD_ID_VERIFY_URL ||
      (rpId ? `https://developer.world.org/api/v4/verify/${rpId}` : undefined);
    if (!verifierUrl) {
      return NextResponse.json(
        { verified: false, message: "World ID verifier not configured." },
        { status: 501 }
      );
    }

    if (debugEnabled) {
      const firstResponse = body.idkitResponse.responses?.[0];
      console.log("[worldid/verify] verifying payload", {
        address: redactAddress(body.address),
        appId: body.appId,
        actionId: body.actionId,
        rpId,
        verifierUrl,
        protocolVersion: body.idkitResponse.protocol_version,
        environment: body.idkitResponse.environment,
        responseCount: body.idkitResponse.responses?.length ?? 0,
        identifier: firstResponse?.identifier,
        hasProof: Boolean(firstResponse?.proof),
        hasNullifierHash: hasOwnString(firstResponse, "nullifier"),
        hasMerkleRoot: hasOwnString(firstResponse, "merkle_root"),
      });
    }

    const response = await fetch(verifierUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body.idkitResponse),
      cache: "no-store",
    });

    const rawText = await response.text();
    let result: VerifierResponse | null = null;
    if (rawText) {
      try {
        result = JSON.parse(rawText) as VerifierResponse | null;
      } catch {
        result = null;
      }
    }
    if (debugEnabled) {
      console.log("[worldid/verify] verifier response", {
        status: response.status,
        success: result?.success,
        verified: result?.verified,
        message: result?.message,
        rawText: rawText || null,
      });
    }
    if (!response.ok) {
      return NextResponse.json(
        {
          verified: false,
          message: result?.message || `Verifier returned ${response.status}.`,
        },
        { status: response.status }
      );
    }

    return NextResponse.json(
      {
        verified: Boolean(result?.verified ?? result?.success),
        message: result?.message || "World ID verification completed.",
        mode: "remote",
      },
      { status: 200 }
    );
  } catch (error) {
    if (process.env.WORLD_ID_DEBUG === "true") {
      console.error("[worldid/verify] failed", error);
    }
    return NextResponse.json(
      { verified: false, message: "Invalid request body." },
      { status: 400 }
    );
  }
}
