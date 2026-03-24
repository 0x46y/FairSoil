import { NextResponse } from "next/server";
import { signRequest } from "@worldcoin/idkit/signing";

type SignaturePayload = {
  action?: string;
};

export async function POST(request: Request) {
  try {
    const debugEnabled = process.env.WORLD_ID_DEBUG === "true";
    const body = (await request.json()) as SignaturePayload;
    const action = body.action?.trim();
    const rpId = process.env.WORLD_ID_RP_ID;
    const signingKey = process.env.RP_SIGNING_KEY;
    const environment =
      process.env.NEXT_PUBLIC_WORLD_ID_ENVIRONMENT === "staging" ? "staging" : "production";

    if (!action) {
      return NextResponse.json(
        { message: "Missing action." },
        { status: 400 }
      );
    }

    if (!rpId || !signingKey) {
      return NextResponse.json(
        { message: "World ID RP config missing." },
        { status: 501 }
      );
    }

    if (debugEnabled) {
      console.log("[worldid/rp-signature] issuing RP signature", {
        action,
        environment,
        rpId,
      });
    }

    const { sig, nonce, createdAt, expiresAt } = signRequest(action, signingKey);

    return NextResponse.json(
      {
        rp_id: rpId,
        nonce,
        created_at: createdAt,
        expires_at: expiresAt,
        signature: sig,
      },
      { status: 200 }
    );
  } catch (error) {
    if (process.env.WORLD_ID_DEBUG === "true") {
      console.error("[worldid/rp-signature] failed", error);
    }
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 }
    );
  }
}
