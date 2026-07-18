import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const drivers = db.prepare(`
    SELECT d.*, u.full_name
    FROM drivers d
    LEFT JOIN users u ON d.user_id = u.id
    WHERE d.status IN ('available', 'on_trip')
    ORDER BY u.full_name ASC
  `).all();

  return NextResponse.json(drivers);
}
