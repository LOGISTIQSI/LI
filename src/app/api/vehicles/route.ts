import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const vehicles = db.prepare(`
    SELECT *
    FROM vehicles
    WHERE status IN ('available', 'on_trip')
    ORDER BY registration_number ASC
  `).all();

  return NextResponse.json(vehicles);
}
