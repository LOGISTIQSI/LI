import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// PATCH — Resolve an alert
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getDb();
  const id = parseInt(params.id, 10);

  if (isNaN(id)) {
    return NextResponse.json(
      { error: "Invalid alert ID" },
      { status: 400 }
    );
  }

  const alert = await db.prepare("SELECT * FROM alerts WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;

  if (!alert) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  const body = await request.json();
  const { is_resolved, resolution_notes } = body;

  const now = new Date().toISOString().replace("T", " ").slice(0, 19);

  if (is_resolved) {
    await db.prepare(
      `UPDATE alerts SET is_resolved = 1, resolved_at = ?, resolution_notes = ? WHERE id = ?`
    ).run(now, resolution_notes || null, id);
  } else {
    // Allow un-resolving too
    await db.prepare(
      `UPDATE alerts SET is_resolved = 0, resolved_at = NULL, resolution_notes = NULL WHERE id = ?`
    ).run(id);
  }

  const updated = await db.prepare("SELECT * FROM alerts WHERE id = ?").get(id);
  return NextResponse.json(updated);
}
