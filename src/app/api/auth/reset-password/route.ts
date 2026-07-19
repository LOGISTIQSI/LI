import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: "Reset token and new password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Find valid reset token
    const reset = await db.prepare(
      "SELECT id, user_id, expires_at FROM password_resets WHERE token = ?"
    ).get(token);

    if (!reset) {
      return NextResponse.json(
        { error: "Invalid or expired reset token. Please request a new password reset." },
        { status: 400 }
      );
    }

    const expiresAt = new Date(reset.expires_at as string);
    if (expiresAt < new Date()) {
      // Clean up expired token
      await db.prepare("DELETE FROM password_resets WHERE id = ?").run(reset.id);
      return NextResponse.json(
        { error: "Reset token has expired. Please request a new password reset." },
        { status: 400 }
      );
    }

    // Hash new password and update user
    const passwordHash = await hashPassword(password);
    await db.prepare(
      "UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?"
    ).run(passwordHash, reset.user_id);

    // Delete the reset token
    await db.prepare("DELETE FROM password_resets WHERE id = ?").run(reset.id);

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully. You can now sign in.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
