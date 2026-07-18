import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { calculateOperationalConfidence } from "@/lib/ai/operational-confidence";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();

    // Resolve numeric shipment ID
    const isNumeric = /^\d+$/.test(params.id);
    const shipment = db
      .prepare(
        `SELECT id FROM shipments WHERE ${isNumeric ? "id = ?" : "shipment_id = ?"}`
      )
      .get(params.id) as { id: number } | undefined;

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    const result = await calculateOperationalConfidence(shipment.id);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Error calculating operational confidence:", err);
    return NextResponse.json(
      { error: "Failed to calculate operational confidence" },
      { status: 500 }
    );
  }
}
