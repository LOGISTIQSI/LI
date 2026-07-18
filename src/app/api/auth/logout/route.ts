import { NextRequest, NextResponse } from "next/server";
import { deleteSession, getExpiredCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("logistiqs_token")?.value;

  if (token) {
    try {
      await deleteSession(token);
    } catch {
      // Token may already be expired
    }
  }

  const response = NextResponse.json({ success: true });
  response.headers.set("Set-Cookie", getExpiredCookie());
  return response;
}
