import { NextResponse } from "next/server";

type VerifyPayload = {
  address?: string;
  appId?: string;
  actionId?: string;
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
    // Placeholder: wire to World ID SDK or verification endpoint.
    return NextResponse.json(
      { verified: false, message: "World ID verifier not configured." },
      { status: 501 }
    );
  } catch {
    return NextResponse.json(
      { verified: false, message: "Invalid request body." },
      { status: 400 }
    );
  }
}
