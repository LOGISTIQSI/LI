import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyPassword, createSession, getSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const db = getDb();

    const user = await db.prepare(
      "SELECT id, company_id, email, password_hash, full_name, role, is_active FROM users WHERE email = ?"
    ).get(email);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: "This account has been deactivated. Please contact support." },
        { status: 403 }
      );
    }

    const isValid = await verifyPassword(password, user.password_hash as string);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Update last login
    await db.prepare(
      "UPDATE users SET last_login = NOW() WHERE id = ?"
    ).run(user.id);

    const token = await createSession(Number(user.id));

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        companyId: user.company_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    });

    response.headers.set("Set-Cookie", getSessionCookie(token));
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
