import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";

  let query = `
    SELECT d.*, u.full_name, c.name AS company_name
    FROM drivers d
    LEFT JOIN users u ON d.user_id = u.id
    LEFT JOIN companies c ON d.company_id = c.id
    WHERE 1=1
  `;
  const params: string[] = [];

  if (status && status !== "all") {
    query += " AND d.status = ?";
    params.push(status);
  }

  query += " ORDER BY u.full_name ASC";

  const drivers = await db.prepare(query).all(...params);
  return NextResponse.json(drivers);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const {
    full_name,
    email,
    license_number,
    license_expiry,
    pdp_expiry,
    medical_certificate_expiry,
    passport_number,
    passport_expiry,
    bank_account_holder,
    bank_name,
    bank_account_number,
    bank_account_type,
    bank_branch_code,
  } = body;

  // Basic validation
  if (!full_name || !license_number || !license_expiry) {
    return NextResponse.json(
      { error: "Full name, license number, and license expiry are required" },
      { status: 400 }
    );
  }

  // Optionally create a user account if email is provided
  let userId: number | null = null;
  if (email && email.trim()) {
    const existingUser = await db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email.trim().toLowerCase());
    if (existingUser) {
      userId = existingUser.id as number;
    } else {
      // Create a basic user account for the driver
      const userResult = await db
        .prepare(
          `INSERT INTO users (company_id, email, password_hash, full_name, role, is_active)
           VALUES (?, ?, ?, ?, 'driver', 1)`
        )
        .run(
          1,
          email.trim().toLowerCase(),
          "$2b$10$placeholder_hash_will_be_reset",
          full_name.trim()
        );
      userId = userResult.lastInsertRowid;
    }
  }

  const result = await db
    .prepare(
      `INSERT INTO drivers (
        user_id, company_id, license_number, license_type, license_expiry,
        pdp_number, pdp_expiry, medical_certificate_expiry,
        passport_number, passport_expiry, status,
        bank_account_holder, bank_name, bank_account_number, bank_account_type, bank_branch_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', ?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      1,
      license_number.trim(),
      "Heavy Vehicle",
      license_expiry,
      body.pdp_number || "",
      pdp_expiry || null,
      medical_certificate_expiry || null,
      passport_number?.trim() || "",
      passport_expiry || null,
      bank_account_holder?.trim() || "",
      bank_name?.trim() || "",
      bank_account_number?.trim() || "",
      bank_account_type || "cheque",
      bank_branch_code?.trim() || ""
    );

  const newDriver = await db
    .prepare(
      `SELECT d.*, u.full_name, c.name AS company_name
       FROM drivers d
       LEFT JOIN users u ON d.user_id = u.id
       LEFT JOIN companies c ON d.company_id = c.id
       WHERE d.id = ?`
    )
    .get(result.lastInsertRowid);

  return NextResponse.json(newDriver, { status: 201 });
}
