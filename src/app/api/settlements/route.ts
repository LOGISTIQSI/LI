import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/settlements — list all settlements with driver details
export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";

  let query = `
    SELECT
      s.*,
      sh.shipment_id AS shipment_ref,
      d.id AS driver_internal_id,
      COALESCE(u.full_name, 'Unknown') AS driver_name,
      d.bank_account_holder,
      d.bank_name,
      d.bank_account_number,
      d.bank_account_type,
      d.bank_branch_code
    FROM settlements s
    JOIN shipments sh ON s.shipment_id = sh.id
    JOIN drivers d ON s.driver_id = d.id
    LEFT JOIN users u ON d.user_id = u.id
  `;

  const params: string[] = [];

  if (status && ["pending", "approved", "processing", "paid", "failed"].includes(status)) {
    query += " WHERE s.payment_status = ?";
    params.push(status);
  }

  query += " ORDER BY s.created_at DESC";

  const settlements = await db.prepare(query).all(...params);
  return NextResponse.json(settlements);
}

// POST /api/settlements — create a settlement for a completed shipment
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const { shipment_id, total_payment_received } = body;

  if (!shipment_id || total_payment_received === undefined) {
    return NextResponse.json(
      { error: "shipment_id and total_payment_received are required" },
      { status: 400 }
    );
  }

  const payment = Number(total_payment_received);
  if (isNaN(payment) || payment <= 0) {
    return NextResponse.json(
      { error: "total_payment_received must be a positive number" },
      { status: 400 }
    );
  }

  // Find shipment by shipment_id (the display ID, not the internal PK)
  const shipment = await db
    .prepare("SELECT id, driver_id, status FROM shipments WHERE shipment_id = ?")
    .get(shipment_id);

  if (!shipment) {
    return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
  }

  if (shipment.status !== "completed") {
    return NextResponse.json(
      { error: "Shipment must be completed before settlement can be created" },
      { status: 400 }
    );
  }

  if (!shipment.driver_id) {
    return NextResponse.json(
      { error: "Shipment has no driver assigned" },
      { status: 400 }
    );
  }

  // Check for duplicate settlement
  const existing = await db
    .prepare("SELECT id FROM settlements WHERE shipment_id = ?")
    .get(shipment.id);

  if (existing) {
    return NextResponse.json(
      { error: "Settlement already exists for this shipment" },
      { status: 409 }
    );
  }

  // Calculate: FlowGrid commission = 5%, driver payable = 95%
  const flowgrid_commission = +(payment * 0.05).toFixed(2);
  const driver_payable = +(payment - flowgrid_commission).toFixed(2);

  const result = await db
    .prepare(
      `INSERT INTO settlements (
        shipment_id, driver_id, total_payment_received,
        flowgrid_commission, driver_payable, payment_status
      ) VALUES (?, ?, ?, ?, ?, 'pending')`
    )
    .run(shipment.id, shipment.driver_id, payment, flowgrid_commission, driver_payable);

  const settlement = await db
    .prepare(
      `SELECT s.*, sh.shipment_id AS shipment_ref,
        COALESCE(u.full_name, 'Unknown') AS driver_name
       FROM settlements s
       JOIN shipments sh ON s.shipment_id = sh.id
       LEFT JOIN users u ON s.driver_id = u.id
       WHERE s.id = ?`
    )
    .get(result.lastInsertRowid);

  return NextResponse.json(settlement, { status: 201 });
}
