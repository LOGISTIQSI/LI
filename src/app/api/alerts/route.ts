import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "0", 10);
  const severity = searchParams.get("severity") || "";
  const alertType = searchParams.get("type") || "";
  const resolved = searchParams.get("resolved");
  const unreadOnly = searchParams.get("unread") === "1";
  const countOnly = searchParams.get("count") === "1";

  let query = `
    SELECT a.*, s.shipment_id AS shipment_ref
    FROM alerts a
    LEFT JOIN shipments s ON a.shipment_id = s.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (unreadOnly) {
    query += " AND a.is_resolved = 0";
  } else if (resolved === "1") {
    query += " AND a.is_resolved = 1";
  } else if (resolved === "0") {
    query += " AND a.is_resolved = 0";
  }

  if (severity && severity !== "all") {
    query += " AND a.severity = ?";
    params.push(severity);
  }

  if (alertType && alertType !== "all") {
    query += " AND a.alert_type = ?";
    params.push(alertType);
  }

  if (countOnly) {
    const countQuery = query.replace(
      /SELECT a\.\*, s\.shipment_id AS shipment_ref/,
      "SELECT COUNT(*) as count"
    );
    const result = await db.prepare(countQuery).get(...params) as { count: number };
    return NextResponse.json({ count: result.count });
  }

  query +=
    " ORDER BY CASE a.severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, a.created_at DESC";

  if (limit > 0) {
    query += " LIMIT ?";
    params.push(limit);
  }

  const alerts = await db.prepare(query).all(...params);
  return NextResponse.json(alerts);
}

// PATCH — Bulk resolve alerts
export async function PATCH(request: NextRequest) {
  const db = getDb();
  const body = await request.json();
  const { action, severity } = body;

  const now = new Date().toISOString().replace("T", " ").slice(0, 19);

  if (action === "resolve_all_warnings") {
    const result = await db
      .prepare(
        `UPDATE alerts SET is_resolved = 1, resolved_at = ? 
         WHERE is_resolved = 0 AND severity = 'warning'`
      )
      .run(now);
    return NextResponse.json({ resolved: result.changes });
  }

  if (action === "dismiss_all_info") {
    const result = await db
      .prepare(
        `UPDATE alerts SET is_resolved = 1, resolved_at = ? 
         WHERE is_resolved = 0 AND severity = 'info'`
      )
      .run(now);
    return NextResponse.json({ resolved: result.changes });
  }

  if (action === "mark_all_read") {
    const result = await db
      .prepare(
        `UPDATE alerts SET is_resolved = 1, resolved_at = ? 
         WHERE is_resolved = 0`
      )
      .run(now);
    return NextResponse.json({ resolved: result.changes });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
