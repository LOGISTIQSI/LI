import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { checkDocumentExpiry } from "@/lib/ai/compliance";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

// ═══════════════════════════════════════════════════════════════════
// GET /api/documents — List compliance documents
// ═══════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);

  const entityType = searchParams.get("entity_type") || "";
  const entityId = searchParams.get("entity_id") || "";
  const status = searchParams.get("status") || "";
  const documentType = searchParams.get("document_type") || "";
  const search = searchParams.get("search") || "";

  let query = `
    SELECT
      cd.*,
      s.shipment_id AS shipment_ref,
      d.id AS driver_table_id,
      u.full_name AS driver_name,
      v.registration_number AS vehicle_registration
    FROM compliance_documents cd
    LEFT JOIN shipments s ON cd.shipment_id = s.id
    LEFT JOIN drivers d ON cd.driver_id = d.id
    LEFT JOIN users u ON d.user_id = u.id
    LEFT JOIN vehicles v ON cd.vehicle_id = v.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (entityType && entityId) {
    if (entityType === "shipment") {
      query += " AND cd.shipment_id = ?";
      params.push(Number(entityId));
    } else if (entityType === "driver") {
      query += " AND cd.driver_id = ?";
      params.push(Number(entityId));
    } else if (entityType === "vehicle") {
      query += " AND cd.vehicle_id = ?";
      params.push(Number(entityId));
    }
  }

  if (status) {
    query += " AND cd.status = ?";
    params.push(status);
  }

  if (documentType) {
    query += " AND cd.document_type = ?";
    params.push(documentType);
  }

  if (search) {
    query += " AND (cd.document_number LIKE ? OR cd.document_type LIKE ? OR u.full_name LIKE ? OR v.registration_number LIKE ?)";
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  query += " ORDER BY cd.created_at DESC";

  const docs = db.prepare(query).all(...params);
  return NextResponse.json(docs);
}

// ═══════════════════════════════════════════════════════════════════
// POST /api/documents — Upload + create compliance document
// ═══════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  ensureUploadDir();
  const db = getDb();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const documentType = (formData.get("document_type") as string) || "";
  const entityType = (formData.get("entity_type") as string) || "";
  const entityId = formData.get("entity_id") as string;
  const issuingAuthority = (formData.get("issuing_authority") as string) || "";
  const issuedDate = (formData.get("issued_date") as string) || "";
  const expiryDate = (formData.get("expiry_date") as string) || null;
  const documentNumber = (formData.get("document_number") as string) || "";

  if (!documentType || !entityType || !entityId || !documentNumber) {
    return NextResponse.json(
      { error: "document_type, entity_type, entity_id, and document_number are required" },
      { status: 400 }
    );
  }

  // Save file if provided
  let filePath: string | null = null;
  if (file && file.size > 0) {
    const ext = file.name.split(".").pop() || "pdf";
    const uniqueName = `${crypto.randomBytes(8).toString("hex")}.${ext}`;
    filePath = `/uploads/${uniqueName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(UPLOAD_DIR, uniqueName), buffer);
  }

  // Determine shipment_id, driver_id, vehicle_id based on entity_type
  let shipmentId: number | null = null;
  let driverId: number | null = null;
  let vehicleId: number | null = null;

  const numericId = Number(entityId);
  if (entityType === "shipment") shipmentId = numericId;
  else if (entityType === "driver") driverId = numericId;
  else if (entityType === "vehicle") vehicleId = numericId;

  // Run AI analysis (simulated: expiry check)
  const check = checkDocumentExpiry({ expiry_date: expiryDate });
  let aiVerified = 0;
  let aiNotes: string | null = null;
  let status = "valid";

  if (check) {
    aiVerified = 1;
    status = check.status;
    aiNotes = `AI verification: document is ${check.status === "valid" ? "currently valid" : check.status === "expired" ? "EXPIRED" : "expiring in " + check.daysRemaining + " days"}.`;
  }

  // Create the record
  const stmt = db.prepare(`
    INSERT INTO compliance_documents (
      shipment_id, driver_id, vehicle_id, document_type, document_number,
      document_file_path, issuing_authority, issued_date, expiry_date,
      status, ai_verified, ai_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    shipmentId,
    driverId,
    vehicleId,
    documentType,
    documentNumber,
    filePath,
    issuingAuthority,
    issuedDate,
    expiryDate,
    status,
    aiVerified,
    aiNotes
  );

  const created = db
    .prepare("SELECT * FROM compliance_documents WHERE id = ?")
    .get(result.lastInsertRowid);

  return NextResponse.json(
    {
      document: created,
      ai_verification: {
        verified: aiVerified === 1,
        status,
        notes: aiNotes,
        severity: check?.severity || "info",
      },
    },
    { status: 201 }
  );
}
