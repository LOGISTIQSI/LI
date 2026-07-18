import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getDb();
  const { id } = params;

  const body = await request.json();
  const { payment_status } = body;

  if (!payment_status || !["pending", "approved", "processing", "paid", "failed"].includes(payment_status)) {
    return NextResponse.json(
      { error: "Valid payment_status is required (pending, approved, processing, paid, failed)" },
      { status: 400 }
    );
  }

  const result = await db
    .prepare("UPDATE settlements SET payment_status = ?, updated_at = NOW() WHERE id = ?")
    .run(payment_status, id);

  if (result.changes === 0) {
    return NextResponse.json({ error: "Settlement not found" }, { status: 404 });
  }

  const settlement = await db
    .prepare(
      `SELECT s.*, sh.shipment_id AS shipment_ref,
        COALESCE(u.full_name, 'Unknown') AS driver_name
       FROM settlements s
       JOIN shipments sh ON s.shipment_id = sh.id
       LEFT JOIN users u ON s.driver_id = u.id
       WHERE s.id = ?`
    )
    .get(id);

  return NextResponse.json(settlement);
}
