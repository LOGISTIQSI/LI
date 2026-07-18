import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getDb();
  const { id } = params;

  let body: { is_verified?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.is_verified !== "boolean") {
    return NextResponse.json(
      { error: "is_verified (boolean) is required" },
      { status: 400 }
    );
  }

  const result = await db
    .prepare(`UPDATE drivers SET is_verified = ?, updated_at = NOW() WHERE id = ?`)
    .run(body.is_verified ? 1 : 0, id);

  if (result.changes === 0) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: Number(id),
    is_verified: body.is_verified,
    updated: true,
  });
}
