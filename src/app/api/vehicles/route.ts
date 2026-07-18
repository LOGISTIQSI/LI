import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";

  let query = `
    SELECT v.*, c.name AS company_name
    FROM vehicles v
    LEFT JOIN companies c ON v.company_id = c.id
    WHERE 1=1
  `;
  const params: string[] = [];

  if (status && status !== "all") {
    query += " AND v.status = ?";
    params.push(status);
  }

  query += " ORDER BY v.registration_number ASC";

  const vehicles = await db.prepare(query).all(...params);
  return NextResponse.json(vehicles);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const {
    registration_number,
    make,
    model,
    year,
    vin,
    insurance_expiry,
    roadworthiness_expiry,
    permit_number,
    permit_expiry,
  } = body;

  // Basic validation
  if (!registration_number || !make || !model || !year) {
    return NextResponse.json(
      { error: "Registration number, make, model, and year are required" },
      { status: 400 }
    );
  }

  const result = await db
    .prepare(
      `INSERT INTO vehicles (
        company_id, registration_number, vehicle_type, make, model, year, vin,
        registration_expiry, roadworthiness_expiry,
        insurance_type, insurance_expiry,
        cross_border_permit_number, cross_border_permit_expiry,
        gvm, max_payload, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')`
    )
    .run(
      1,
      registration_number.trim().toUpperCase(),
      body.vehicle_type || "Truck",
      make.trim(),
      model.trim(),
      Number(year) || new Date().getFullYear(),
      vin?.trim() || "",
      body.registration_expiry || null,
      roadworthiness_expiry || null,
      body.insurance_type || "Comprehensive",
      insurance_expiry || null,
      permit_number?.trim() || "",
      permit_expiry || null,
      28000,
      22000
    );

  const newVehicle = await db
    .prepare(
      `SELECT v.*, c.name AS company_name
       FROM vehicles v
       LEFT JOIN companies c ON v.company_id = c.id
       WHERE v.id = ?`
    )
    .get(result.lastInsertRowid);

  return NextResponse.json(newVehicle, { status: 201 });
}
