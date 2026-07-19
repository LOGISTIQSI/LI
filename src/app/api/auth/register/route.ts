import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword, createSession, getSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      registrationType,
      companyName,
      companyType,
      email,
      phone,
      country,
      password,
      fullName,
    } = body;

    // Validate common required fields
    if (!email || !phone || !country || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
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
    const existingUser = await db.prepare(
      "SELECT id FROM users WHERE email = ?"
    ).get(email);

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email is already registered" },
        { status: 409 }
      );
    }

    // Check companies table too
    const existingCompany = await db.prepare(
      "SELECT id FROM companies WHERE email = ?"
    ).get(email);

    if (existingCompany) {
      return NextResponse.json(
        { error: "A company with this email is already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const displayName = fullName || companyName || email;

    // ─── Independent Driver/Operator flow ───
    if (registrationType === "driver") {
      if (!fullName || !fullName.trim()) {
        return NextResponse.json(
          { error: "Full name is required" },
          { status: 400 }
        );
      }

      // Create a minimal company record for the independent driver
      const companyResult = await db.prepare(`
        INSERT INTO companies (name, type, email, phone, country, registration_number, tax_id)
        VALUES (?, 'logistics', ?, ?, ?, ?, ?)
      `).run(
        `Independent: ${fullName.trim()}`,
        email,
        phone,
        country,
        `IND-${Date.now()}`,
        `TAX-${Date.now()}`
      );

      const companyId = companyResult.lastInsertRowid;

      // Create user as driver
      await db.prepare(`
        INSERT INTO users (company_id, email, password_hash, full_name, role, phone)
        VALUES (?, ?, ?, ?, 'driver', ?)
      `).run(companyId, email, passwordHash, displayName, phone);

      // Get the user ID
      const user = await db.prepare(
        "SELECT id FROM users WHERE email = ?"
      ).get(email);

      if (!user) {
        return NextResponse.json(
          { error: "Registration failed — user not created" },
          { status: 500 }
        );
      }

      const userId = Number(user.id);

      // Auto-create a placeholder driver record linked to this user
      // The driver will complete their profile on /drivers/new
      const today = new Date().toISOString().split("T")[0];
      const driverResult = await db.prepare(`
        INSERT INTO drivers (
          user_id, company_id, license_number, license_type, license_expiry,
          pdp_number, pdp_expiry, medical_certificate_expiry,
          passport_number, passport_expiry, status, is_verified
        ) VALUES (?, ?, 'PENDING', 'Heavy Vehicle', ?, 'PENDING', ?, ?, 'PENDING', ?, 'off_duty', 0)
      `).run(
        userId,
        companyId,
        today,
        today,
        today,
        today
      );

      const driverId = driverResult.lastInsertRowid;

      // Create session
      const token = await createSession(userId);

      const response = NextResponse.json(
        {
          success: true,
          message: "Registration successful — complete your driver profile",
          companyId,
          driverId,
          isDriver: true,
        },
        { status: 201 }
      );

      response.headers.set("Set-Cookie", getSessionCookie(token));
      return response;
    }

    // ─── Company registration flow (existing) ───
    if (!companyName || !companyType) {
      return NextResponse.json(
        { error: "Company name and type are required" },
        { status: 400 }
      );
    }

    if (!["mining", "logistics"].includes(companyType)) {
      return NextResponse.json(
        { error: "Company type must be 'mining' or 'logistics'" },
        { status: 400 }
      );
    }

    // Insert company
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

    // Get the user ID
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
