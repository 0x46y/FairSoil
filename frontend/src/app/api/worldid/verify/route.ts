import { NextResponse } from "next/server";

type VerifyPayload = {
  address?: string;
  appId?: string;
  actionId?: string;
  proof?: unknown;
  signal?: unknown;
  nullifierHash?: string;
  merkleRoot?: string;
  verificationLevel?: string;
  credentialType?: string;
  rpContext?: {
    rp_id?: string;
    nonce?: string;
    created_at?: number;
    expires_at?: number;
    signature?: string;
  };
};

type VerifierResponse = {
  verified?: boolean;
  message?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyPayload;
    if (!body.address || !body.appId || !body.actionId) {
      return NextResponse.json(
        { verified: false, message: "Missing address/appId/actionId." },
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

    const response = await fetch(verifierUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: body.address,
        app_id: body.appId,
        action: body.actionId,
        proof: body.proof,
        signal: body.signal,
        nullifier_hash: body.nullifierHash,
        merkle_root: body.merkleRoot,
        verification_level: body.verificationLevel,
        credential_type: body.credentialType,
      }),
      cache: "no-store",
    });

    const result = (await response.json().catch(() => null)) as VerifierResponse | null;
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
        verified: Boolean(result?.verified),
        message: result?.message || "World ID verification completed.",
        mode: "remote",
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { verified: false, message: "Invalid request body." },
      { status: 400 }
    );
  }
}
