import { NextResponse } from "next/server";

type VerifyPayload = {
  address?: string;
};

type VerifierResponse = {
  verified?: boolean;
  message?: string;
};

const jsonHeaders = { "Content-Type": "application/json" };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyPayload;
    if (!body.address) {
      return NextResponse.json(
        { verified: false, message: "Missing wallet address." },
        { status: 400 }
      );
    }

    const mockEnabled = process.env.NEXT_PUBLIC_ZKNFC_MOCK === "true";
    if (mockEnabled) {
      return NextResponse.json(
        {
          verified: true,
          message: "ZK-NFC mock verification accepted.",
          mode: "mock",
        },
        { status: 200 }
      );
    }

    const verifierUrl = process.env.NEXT_PUBLIC_ZKNFC_VERIFIER_URL;
    if (!verifierUrl) {
      return NextResponse.json(
        { verified: false, message: "ZK-NFC verifier URL missing." },
        { status: 501 }
      );
    }

    const response = await fetch(verifierUrl, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ address: body.address }),
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
        message: result?.message || "ZK-NFC verification completed.",
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
