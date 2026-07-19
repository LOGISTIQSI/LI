import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generateToken } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

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
      "SELECT id, full_name, email FROM users WHERE email = ? AND is_active = 1"
    ).get(email);

    // Always return success — don't reveal if user exists
    if (!user) {
      return NextResponse.json({
        success: true,
        message:
          "If an account with that email exists, a password reset link has been sent to the email address.",
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

    // Build reset link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://platform-lac-zeta-44.vercel.app";
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    const userName = user.full_name || "there";

    // Send password reset email
    const emailResult = await sendEmail({
      to: user.email as string,
      subject: "Reset your LOGISTIQS Intelligence password",
      text: `Hi ${userName},\n\nWe received a request to reset your password for LOGISTIQS Intelligence. Click the link below to set a new password:\n\n${resetLink}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.\n\n— The LOGISTIQS Intelligence Team`,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">LOGISTIQS Intelligence</h2>
        <p>Hi ${userName},</p>
        <p>We received a request to reset your password. Click the button below to set a new password:</p>
        <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">Reset Password</a>
        <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">— The LOGISTIQS Intelligence Team</p>
      </div>`,
    });

    if (!emailResult.success) {
      console.error("Failed to send reset email to:", user.email, emailResult.error);
    }

    return NextResponse.json({
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent to the email address.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
