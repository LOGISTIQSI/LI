import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { calculateMissionReadiness } from "@/lib/ai/mission-readiness";

export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";

  let query = `
    SELECT
      s.*,
      d.id AS driver_table_id,
      u.full_name AS driver_name,
      d.license_number AS driver_license,
      v.registration_number AS vehicle_registration,
      v.vehicle_type,
      lc.name AS logistics_company_name,
      mc.name AS mining_company_name
    FROM shipments s
    LEFT JOIN drivers d ON s.driver_id = d.id
    LEFT JOIN users u ON d.user_id = u.id
    LEFT JOIN vehicles v ON s.vehicle_id = v.id
    LEFT JOIN companies lc ON s.logistics_company_id = lc.id
    LEFT JOIN companies mc ON s.company_id = mc.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (statusFilter && statusFilter !== "all") {
    query += " AND s.status = ?";
    params.push(statusFilter);
  }

  if (search) {
    query += " AND (s.shipment_id LIKE ? OR s.origin LIKE ? OR s.destination LIKE ? OR u.full_name LIKE ?)";
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  query += " ORDER BY s.created_at DESC";

  const shipments = db.prepare(query).all(...params);

  return NextResponse.json(shipments);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  // Generate shipment ID
  const year = new Date().getFullYear();
  const count = db.prepare(
    "SELECT COUNT(*) AS cnt FROM shipments WHERE shipment_id LIKE ?"
  ).get(`SHIP-${year}-%`) as { cnt: number };
  const seq = String((count.cnt + 1)).padStart(5, "0");
  const shipmentId = `SHIP-${year}-${seq}`;

  const now = new Date().toISOString().replace("T", " ").slice(0, 19);

  // Insert with NULL scores — calculated after insert
  const stmt = db.prepare(`
    INSERT INTO shipments (
      shipment_id, company_id, logistics_company_id, driver_id, vehicle_id,
      origin, destination, origin_country, destination_country,
      cargo_type, cargo_description, cargo_hs_code, cargo_value, cargo_weight_kg,
      is_dangerous_goods, dg_class, border_crossings, status,
      departure_scheduled, eta,
      mission_readiness_score, readiness_calculated_at,
      operational_confidence_score, confidence_calculated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready',
      ?, ?, NULL, NULL, NULL, NULL
    )
  `);

  const result = stmt.run(
    shipmentId,
    body.company_id || 1,
    body.logistics_company_id || null,
    body.driver_id || null,
    body.vehicle_id || null,
    body.origin,
    body.destination,
    body.origin_country,
    body.destination_country,
    body.cargo_type,
    body.cargo_description || "",
    body.cargo_hs_code || "",
    Math.round((body.cargo_value || 0) * 100), // convert to cents
    body.cargo_weight_kg || 0,
    body.is_dangerous_goods ? 1 : 0,
    body.dangerous_goods ? body.dg_class : null,
    JSON.stringify(body.border_crossings || []),
    body.departure_scheduled,
    body.eta
  );

  const shipmentNumericId = Number(result.lastInsertRowid);

  // Auto-calculate Mission Readiness Score after creation
  try {
    await calculateMissionReadiness(shipmentNumericId);
  } catch (err) {
    console.error("Failed to calculate mission readiness on creation:", err);
    // Still return the shipment even if MRS calculation fails
  }

  const newShipment = db.prepare("SELECT * FROM shipments WHERE id = ?").get(shipmentNumericId);

  return NextResponse.json(newShipment, { status: 201 });
}
