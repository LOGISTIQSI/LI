import { getDb } from "@/lib/db";

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export interface DocumentExpiryResult {
  status: "valid" | "expiring_soon" | "expired";
  daysRemaining: number;
  severity: "info" | "warning" | "critical";
}

export interface ComplianceStatus {
  totalDocs: number;
  validCount: number;
  expiringCount: number;
  expiredCount: number;
  missingCount: number;
  complianceScore: number;
  missingDocuments: { document_type: string; description: string }[];
  alerts: { title: string; severity: string; type: string }[];
}

// ═══════════════════════════════════════════════════════════════════
// Document type definitions
// ═══════════════════════════════════════════════════════════════════

const DOCUMENT_DEFINITIONS: Record<string, string> = {
  driver_license: "Valid driver license for the vehicle class being operated",
  pdp: "Professional Driving Permit (PrDP) required for goods vehicles",
  passport: "Valid passport for cross-border travel",
  medical_certificate: "Current medical fitness certificate",
  dg_endorsement: "Dangerous Goods endorsement on driver license",
  vehicle_registration: "Current vehicle registration / license disc",
  roadworthiness: "Certificate of Roadworthiness (CoR)",
  insurance: "Vehicle insurance certificate",
  cross_border_permit: "Cross-border transport permit for vehicle",
  customs_bond: "Customs bond or guarantee for goods in transit",
  cargo_manifest: "Detailed cargo manifest with HS codes and values",
  dg_permit: "Dangerous goods transport permit",
  export_permit: "Export permit / clearance from origin country",
  import_permit: "Import permit / clearance for destination country",
  yellow_fever_cert: "Yellow Fever vaccination certificate",
  hiv_cert: "HIV/AIDS test certificate (required by some countries)",
  border_documentation: "Border pre-clearance documentation package",
  insurance_cross_border: "Cross-border insurance rider",
};

const ALWAYS_REQUIRED: string[] = [
  "driver_license",
  "pdp",
  "vehicle_registration",
  "roadworthiness",
  "insurance",
  "cargo_manifest",
];

const CROSS_BORDER_REQUIRED: string[] = [
  "passport",
  "medical_certificate",
  "cross_border_permit",
  "customs_bond",
  "export_permit",
  "border_documentation",
  "insurance_cross_border",
];

const DG_REQUIRED: string[] = ["dg_endorsement", "dg_permit"];

const COUNTRY_SPECIFIC: Record<string, string[]> = {
  CD: ["yellow_fever_cert"],
  ZM: ["hiv_cert"],
  MZ: ["yellow_fever_cert"],
  ZW: ["hiv_cert"],
  AO: ["yellow_fever_cert"],
  NA: [],
  BW: [],
  ZA: [],
  TZ: ["yellow_fever_cert"],
};

// ═══════════════════════════════════════════════════════════════════
// checkDocumentExpiry
// ═══════════════════════════════════════════════════════════════════

export function checkDocumentExpiry(doc: {
  expiry_date: string | null;
}): DocumentExpiryResult | null {
  if (!doc.expiry_date) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiry = new Date(doc.expiry_date + "T00:00:00");
  const daysRemaining = Math.floor(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysRemaining <= 0) {
    return { status: "expired", daysRemaining, severity: "critical" };
  }
  if (daysRemaining <= 7) {
    return { status: "expiring_soon", daysRemaining, severity: "warning" };
  }
  if (daysRemaining <= 30) {
    return { status: "expiring_soon", daysRemaining, severity: "info" };
  }
  return { status: "valid", daysRemaining, severity: "info" };
}

// ═══════════════════════════════════════════════════════════════════
// getRequiredDocuments
// ═══════════════════════════════════════════════════════════════════

export function getRequiredDocuments(shipment: {
  origin_country?: string;
  destination_country?: string;
  is_dangerous_goods?: number | boolean;
}): string[] {
  const required = new Set<string>();

  for (const d of ALWAYS_REQUIRED) required.add(d);

  const origin = (shipment.origin_country || "").toUpperCase();
  const dest = (shipment.destination_country || "").toUpperCase();
  const isCrossBorder = origin !== dest;

  if (isCrossBorder) {
    for (const d of CROSS_BORDER_REQUIRED) required.add(d);
    const destReqs = COUNTRY_SPECIFIC[dest] || [];
    for (const d of destReqs) required.add(d);
    const originReqs = COUNTRY_SPECIFIC[origin] || [];
    for (const d of originReqs) required.add(d);
  }

  const isDg = shipment.is_dangerous_goods === 1 || shipment.is_dangerous_goods === true;
  if (isDg) {
    for (const d of DG_REQUIRED) required.add(d);
  }

  return Array.from(required);
}

// ═══════════════════════════════════════════════════════════════════
// Alert helpers
// ═══════════════════════════════════════════════════════════════════

async function upsertAlert(
  db: ReturnType<typeof getDb>,
  params: {
    shipment_id?: number | null;
    driver_id?: number | null;
    vehicle_id?: number | null;
    alert_type: string;
    severity: string;
    title: string;
    description: string;
  }
): Promise<void> {
  const existing = await db
    .prepare(
      `SELECT id FROM alerts
       WHERE alert_type = $1
         AND title = $2
         AND is_resolved = 0
         AND (
           ($3::int IS NOT NULL AND shipment_id = $4) OR
           ($5::int IS NOT NULL AND driver_id = $6) OR
           ($7::int IS NOT NULL AND vehicle_id = $8)
         )
       LIMIT 1`
    )
    .get(
      params.alert_type,
      params.title,
      params.shipment_id,
      params.shipment_id,
      params.driver_id,
      params.driver_id,
      params.vehicle_id,
      params.vehicle_id
    ) as { id: number } | undefined;

  if (existing) {
    await db.prepare(
      `UPDATE alerts SET severity = GREATEST(severity, $1), description = $2, created_at = NOW()
       WHERE id = $3`
    ).run(params.severity, params.description, existing.id);
  } else {
    await db.prepare(
      `INSERT INTO alerts (shipment_id, driver_id, vehicle_id, alert_type, severity, title, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`
    ).run(
      params.shipment_id || null,
      params.driver_id || null,
      params.vehicle_id || null,
      params.alert_type,
      params.severity,
      params.title,
      params.description
    );
  }
}

async function resolveAlertsForEntity(
  db: ReturnType<typeof getDb>,
  entityType: "shipment" | "driver" | "vehicle",
  entityId: number,
  keepTitles: string[]
): Promise<void> {
  const column = `${entityType}_id`;
  if (keepTitles.length === 0) {
    await db.prepare(
      `UPDATE alerts SET is_resolved = 1, resolved_at = NOW()
       WHERE ${column} = $1 AND is_resolved = 0 AND alert_type IN ('compliance', 'expiry')`
    ).run(entityId);
    return;
  }

  // Build NOT IN clause
  const placeholders = keepTitles.map((_, i) => `$${i + 2}`).join(",");
  await db.prepare(
    `UPDATE alerts SET is_resolved = 1, resolved_at = NOW()
     WHERE ${column} = $1
       AND is_resolved = 0
       AND alert_type IN ('compliance', 'expiry')
       AND title NOT IN (${placeholders})`
  ).run(entityId, ...keepTitles);
}

// ═══════════════════════════════════════════════════════════════════
// analyzeShipmentCompliance
// ═══════════════════════════════════════════════════════════════════

export async function analyzeShipmentCompliance(shipmentId: number): Promise<ComplianceStatus> {
  const db = getDb();

  const shipment = await db
    .prepare(
      `SELECT s.*, d.id AS drv_id, v.id AS veh_id
       FROM shipments s
       LEFT JOIN drivers d ON s.driver_id = d.id
       LEFT JOIN vehicles v ON s.vehicle_id = v.id
       WHERE s.id = $1`
    )
    .get(shipmentId) as Record<string, unknown> | undefined;

  if (!shipment) {
    return {
      totalDocs: 0,
      validCount: 0,
      expiringCount: 0,
      expiredCount: 0,
      missingCount: 0,
      complianceScore: 0,
      missingDocuments: [],
      alerts: [],
    };
  }

  const requiredTypes = getRequiredDocuments({
    origin_country: shipment.origin_country as string,
    destination_country: shipment.destination_country as string,
    is_dangerous_goods: shipment.is_dangerous_goods as number,
  });

  const existingDocs = await db
    .prepare(
      `SELECT * FROM compliance_documents
       WHERE shipment_id = $1 OR driver_id = $2 OR vehicle_id = $3`
    )
    .all(shipmentId, shipment.drv_id || null, shipment.veh_id || null) as Array<{
    id: number;
    document_type: string;
    expiry_date: string | null;
    status: string;
    shipment_id: number | null;
    driver_id: number | null;
    vehicle_id: number | null;
  }>;

  const docsByType: Record<string, typeof existingDocs> = {};
  for (const doc of existingDocs) {
    if (!docsByType[doc.document_type]) docsByType[doc.document_type] = [];
    docsByType[doc.document_type].push(doc);
  }

  const activeAlertTitles: string[] = [];

  for (const doc of existingDocs) {
    const check = checkDocumentExpiry(doc);
    let newStatus = doc.status;

    if (check) {
      if (check.status === "expired") newStatus = "expired";
      else if (check.status === "expiring_soon" && doc.status !== "expired") newStatus = "expiring_soon";
      else if (check.status === "valid") newStatus = "valid";
    }

    if (newStatus !== doc.status) {
      await db.prepare(
        `UPDATE compliance_documents SET status = $1, ai_verified = 1, updated_at = NOW() WHERE id = $2`
      ).run(newStatus, doc.id);
      doc.status = newStatus;
    }

    if (check && check.severity !== "info") {
      const entityCol = doc.shipment_id ? "shipment_id" : doc.driver_id ? "driver_id" : "vehicle_id";
      const entityId = doc.shipment_id || doc.driver_id || doc.vehicle_id;
      const title = `${doc.document_type.replace(/_/g, " ")} ${check.status === "expired" ? "EXPIRED" : "expiring in " + check.daysRemaining + " days"}`;
      const desc = `${doc.document_type.replace(/_/g, " ")} document (${doc.document_type}) ${
        check.status === "expired" ? "has EXPIRED" : `expires in ${check.daysRemaining} days`
      }.`;

      await upsertAlert(db, {
        [entityCol]: entityId,
        shipment_id: doc.shipment_id,
        driver_id: doc.driver_id,
        vehicle_id: doc.vehicle_id,
        alert_type: check.status === "expired" ? "expiry" : "compliance",
        severity: check.severity,
        title,
        description: desc,
      });

      activeAlertTitles.push(title);
    }
  }

  // Check for missing required documents
  const missing: { document_type: string; description: string }[] = [];
  for (const reqType of requiredTypes) {
    const docs = docsByType[reqType] || [];
    const hasValid = docs.some(
      (d) => d.status === "valid" || d.status === "expiring_soon" || d.status === "under_review"
    );
    if (!hasValid) {
      const desc = DOCUMENT_DEFINITIONS[reqType] || `Required: ${reqType.replace(/_/g, " ")}`;
      missing.push({ document_type: reqType, description: desc });

      const title = `Missing: ${reqType.replace(/_/g, " ")}`;
      await upsertAlert(db, {
        shipment_id: shipmentId,
        driver_id: (shipment.drv_id as number) || null,
        vehicle_id: (shipment.veh_id as number) || null,
        alert_type: "compliance",
        severity: "critical",
        title,
        description: `Required document "${reqType.replace(/_/g, " ")}" is missing. ${desc}`,
      });
      activeAlertTitles.push(title);
    }
  }

  await resolveAlertsForEntity(db, "shipment", shipmentId, activeAlertTitles);

  const allDocs = existingDocs.filter((d) => d.status !== "missing");
  const validCount = allDocs.filter((d) => d.status === "valid").length;
  const expiringCount = allDocs.filter((d) => d.status === "expiring_soon").length;
  const expiredCount = allDocs.filter((d) => d.status === "expired").length;
  const totalDocs = validCount + expiringCount + expiredCount + missing.length;

  const maxPenalty = requiredTypes.length;
  let penalty = 0;
  penalty += missing.length * 2;
  penalty += expiredCount;
  const complianceScore = Math.max(0, Math.round(100 - (penalty / Math.max(maxPenalty * 2, 1)) * 100));

  return {
    totalDocs,
    validCount,
    expiringCount,
    expiredCount,
    missingCount: missing.length,
    complianceScore,
    missingDocuments: missing,
    alerts: missing.map((m) => ({
      title: `Missing: ${m.document_type}`,
      severity: "critical",
      type: "compliance",
    })),
  };
}
