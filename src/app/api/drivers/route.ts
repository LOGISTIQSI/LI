import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";

  let query = `
    SELECT d.*, u.full_name, c.name AS company_name
    FROM drivers d
    LEFT JOIN users u ON d.user_id = u.id
    LEFT JOIN companies c ON d.company_id = c.id
    WHERE 1=1
  `;
  const params: string[] = [];

  if (status && status !== "all") {
    query += " AND d.status = ?";
    params.push(status);
  }

  query += " ORDER BY u.full_name ASC";

  const drivers = db.prepare(query).all(...params);
  return NextResponse.json(drivers);
}
