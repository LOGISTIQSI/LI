import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generateToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Find user by email
    const user = await db.prepare(
      "SELECT id FROM users WHERE email = ? AND is_active = 1"
    ).get(email);

    // Always return success — don't reveal if user exists
    if (!user) {
      return NextResponse.json({
        success: true,
        message:
          "If an account with that email exists, a reset link has been generated. Contact support at logistiqs.intelligence@proton.me with your email to complete the reset.",
      });
    }

    // Generate reset token (valid for 1 hour)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Delete any existing reset tokens for this user
    await db.prepare("DELETE FROM password_resets WHERE user_id = ?").run(
      user.id
    );

    // Store new reset token
    await db.prepare(
      "INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)"
    ).run(user.id, token, expiresAt);

    return NextResponse.json({
      success: true,
      message:
        "If an account with that email exists, a reset link has been generated. Contact support at logistiqs.intelligence@proton.me with your email to complete the reset.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
