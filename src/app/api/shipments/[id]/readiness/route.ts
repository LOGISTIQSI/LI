import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { calculateMissionReadiness } from "@/lib/ai/mission-readiness";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();

    const isNumeric = /^\d+$/.test(params.id);
    const shipment = await db
      .prepare(
        `SELECT id FROM shipments WHERE ${isNumeric ? "id = ?" : "shipment_id = ?"}`
      )
      .get(params.id) as { id: number } | undefined;

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    const result = await calculateMissionReadiness(shipment.id);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Error calculating mission readiness:", err);
    return NextResponse.json(
      { error: "Failed to calculate mission readiness" },
      { status: 500 }
    );
  }
}
