import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const db = getDb();

  const isNumeric = /^\d+$/.test(params.id);

  const shipment = await db.prepare(`
    SELECT
      s.*,
      d.id AS driver_table_id,
      u.full_name AS driver_name,
      d.license_number AS driver_license,
      d.license_type AS driver_license_type,
      d.status AS driver_status,
      v.id AS vehicle_table_id,
      v.registration_number AS vehicle_registration,
      v.vehicle_type,
      v.make AS vehicle_make,
      v.model AS vehicle_model,
      lc.name AS logistics_company_name,
      lc.id AS logistics_company_table_id,
      mc.name AS mining_company_name,
      mc.id AS mining_company_table_id
    FROM shipments s
    LEFT JOIN drivers d ON s.driver_id = d.id
    LEFT JOIN users u ON d.user_id = u.id
    LEFT JOIN vehicles v ON s.vehicle_id = v.id
    LEFT JOIN companies lc ON s.logistics_company_id = lc.id
    LEFT JOIN companies mc ON s.company_id = mc.id
    WHERE ${isNumeric ? "s.id = ?" : "s.shipment_id = ?"}
  `).get(params.id);

  if (!shipment) {
    return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
  }

  const events = await db.prepare(`
    SELECT * FROM trip_events
    WHERE shipment_id = ?
    ORDER BY recorded_at DESC
  `).all((shipment as Record<string, unknown>).id);

  const docs = await db.prepare(`
    SELECT * FROM compliance_documents
    WHERE shipment_id = ?
    ORDER BY created_at DESC
  `).all((shipment as Record<string, unknown>).id);

  return NextResponse.json({
    shipment,
    events,
    documents: docs,
  });
}
