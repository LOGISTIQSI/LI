import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword, createSession, getSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyName,
      companyType,
      email,
      phone,
      country,
      password,
      fullName,
    } = body;

    // Validate required fields
    if (!companyName || !companyType || !email || !phone || !country || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (!["mining", "logistics"].includes(companyType)) {
      return NextResponse.json(
        { error: "Company type must be 'mining' or 'logistics'" },
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

    // Check if email is already registered
    const existing = await db.prepare(
      "SELECT id FROM companies WHERE email = ?"
    ).get(email);

    if (existing) {
      return NextResponse.json(
        { error: "A company with this email is already registered" },
        { status: 409 }
      );
    }

    // Check if user email exists
    const existingUser = await db.prepare(
      "SELECT id FROM users WHERE email = ?"
    ).get(email);

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email is already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const displayName = fullName || companyName;

    // Insert company — use placeholder values for required fields not on the form
    const companyResult = await db.prepare(`
      INSERT INTO companies (name, type, email, phone, country, registration_number, tax_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      companyName,
      companyType,
      email,
      phone,
      country,
      `REG-${Date.now()}`,
      `TAX-${Date.now()}`
    );

    const companyId = companyResult.lastInsertRowid;

    // Insert user as admin
    await db.prepare(`
      INSERT INTO users (company_id, email, password_hash, full_name, role, phone)
      VALUES (?, ?, ?, ?, 'admin', ?)
    `).run(companyId, email, passwordHash, displayName, phone);

    // Create a session so the user is logged in immediately
    // We need the user ID — query for it
    const user = await db.prepare(
      "SELECT id FROM users WHERE email = ?"
    ).get(email);

    if (!user) {
      return NextResponse.json(
        { error: "Registration failed — user not created" },
        { status: 500 }
      );
    }

    const token = await createSession(Number(user.id));

    const response = NextResponse.json(
      {
        success: true,
        message: "Registration successful",
        companyId,
      },
      { status: 201 }
    );

    response.headers.set("Set-Cookie", getSessionCookie(token));
    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
