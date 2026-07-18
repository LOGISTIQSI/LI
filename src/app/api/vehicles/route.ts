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
