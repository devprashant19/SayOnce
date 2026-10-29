import { NextResponse } from "next/server";
import { createSignedDemoSession, verifyDemoSessionToken } from "@/lib/demo-session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  // Check if existing token in header or cookie is still valid
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/sayonce_demo_token=([^;]+)/);
  const existingToken = match ? match[1] : null;

  if (existingToken) {
    const verified = verifyDemoSessionToken(existingToken);
    if (verified.valid && verified.sessionId) {
      return NextResponse.json({
        sessionId: verified.sessionId,
        token: existingToken,
        existing: true,
      });
    }
  }

  // Generate new signed demo session
  const session = createSignedDemoSession();
  const response = NextResponse.json({
    sessionId: session.sessionId,
    token: session.token,
    existing: false,
  });

  // Set cookie for 24 hours
  response.cookies.set("sayonce_demo_token", session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60,
  });

  return response;
}

