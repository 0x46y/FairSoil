import { NextResponse } from "next/server";
import { signRequest } from "@worldcoin/idkit/signing";

type SignaturePayload = {
  action?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SignaturePayload;
    const action = body.action?.trim();
    const rpId = process.env.WORLD_ID_RP_ID;
    const signingKey = process.env.RP_SIGNING_KEY;

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
  } catch {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 }
    );
  }
}
