import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "0", 10);
  const severity = searchParams.get("severity") || "";

  let query = `
    SELECT a.*, s.shipment_id AS shipment_ref
    FROM alerts a
    LEFT JOIN shipments s ON a.shipment_id = s.id
    WHERE a.is_resolved = 0
  `;
  const params: (string | number)[] = [];

  if (severity && severity !== "all") {
    query += " AND a.severity = ?";
    params.push(severity);
  }

  query += " ORDER BY CASE a.severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, a.created_at DESC";

  if (limit > 0) {
    query += " LIMIT ?";
    params.push(limit);
  }

  const alerts = db.prepare(query).all(...params);
  return NextResponse.json(alerts);
}
