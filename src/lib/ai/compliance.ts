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
// Document type definitions — what each type means
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

// Always-required documents regardless of trip type
const ALWAYS_REQUIRED: string[] = [
  "driver_license",
  "pdp",
  "vehicle_registration",
  "roadworthiness",
  "insurance",
  "cargo_manifest",
];

// Required for any cross-border trip
const CROSS_BORDER_REQUIRED: string[] = [
  "passport",
  "medical_certificate",
  "cross_border_permit",
  "customs_bond",
  "export_permit",
  "border_documentation",
  "insurance_cross_border",
];

// DG-specific
const DG_REQUIRED: string[] = ["dg_endorsement", "dg_permit"];

// Country-specific requirements
const COUNTRY_SPECIFIC: Record<string, string[]> = {
  CD: ["yellow_fever_cert"], // DRC
  ZM: ["hiv_cert"], // Zambia
  MZ: ["yellow_fever_cert"], // Mozambique
  ZW: ["hiv_cert"], // Zimbabwe
  AO: ["yellow_fever_cert"], // Angola
  NA: [], // Namibia
  BW: [], // Botswana
  ZA: [], // South Africa
  TZ: ["yellow_fever_cert"], // Tanzania
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

  // Always required
  for (const d of ALWAYS_REQUIRED) required.add(d);

  // Check if cross-border
  const origin = (shipment.origin_country || "").toUpperCase();
  const dest = (shipment.destination_country || "").toUpperCase();
  const isCrossBorder = origin !== dest;

  if (isCrossBorder) {
    for (const d of CROSS_BORDER_REQUIRED) required.add(d);

    // Country-specific for destination
    const destReqs = COUNTRY_SPECIFIC[dest] || [];
    for (const d of destReqs) required.add(d);

    // Country-specific for origin
    const originReqs = COUNTRY_SPECIFIC[origin] || [];
    for (const d of originReqs) required.add(d);
  }

  // DG
  const isDg = shipment.is_dangerous_goods === 1 || shipment.is_dangerous_goods === true;
  if (isDg) {
    for (const d of DG_REQUIRED) required.add(d);
  }

  return Array.from(required);
}

// ═══════════════════════════════════════════════════════════════════
// Alert helpers
// ═══════════════════════════════════════════════════════════════════

function upsertAlert(
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
): void {
  // Check for existing unresolved alert of same type for same entity
  const existing = db
    .prepare(
      `SELECT id FROM alerts
       WHERE alert_type = ?
         AND title = ?
         AND is_resolved = 0
         AND (
           (? IS NOT NULL AND shipment_id = ?) OR
           (? IS NOT NULL AND driver_id = ?) OR
           (? IS NOT NULL AND vehicle_id = ?)
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
    // Update severity if it escalated
    db.prepare(
      `UPDATE alerts SET severity = MAX(severity, ?), description = ?, created_at = datetime('now')
       WHERE id = ?`
    ).run(params.severity, params.description, existing.id);
  } else {
    db.prepare(
      `INSERT INTO alerts (shipment_id, driver_id, vehicle_id, alert_type, severity, title, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
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

function resolveAlertsForEntity(
  db: ReturnType<typeof getDb>,
  entityType: "shipment" | "driver" | "vehicle",
  entityId: number,
  keepTitles: string[]
): void {
  const column = `${entityType}_id`;
  // Resolve alerts that are no longer relevant
  if (keepTitles.length === 0) {
    db.prepare(
      `UPDATE alerts SET is_resolved = 1, resolved_at = datetime('now')
       WHERE ${column} = ? AND is_resolved = 0 AND alert_type IN ('compliance', 'expiry')`
    ).run(entityId);
    return;
  }

  const placeholders = keepTitles.map(() => "?").join(",");
  db.prepare(
    `UPDATE alerts SET is_resolved = 1, resolved_at = datetime('now')
     WHERE ${column} = ?
       AND is_resolved = 0
       AND alert_type IN ('compliance', 'expiry')
       AND title NOT IN (${placeholders})`
  ).run(entityId, ...keepTitles);
}

// ═══════════════════════════════════════════════════════════════════
// analyzeShipmentCompliance
// ═══════════════════════════════════════════════════════════════════

export function analyzeShipmentCompliance(shipmentId: number): ComplianceStatus {
  const db = getDb();

  // Fetch shipment info
  const shipment = db
    .prepare(
      `SELECT s.*, d.id AS drv_id, v.id AS veh_id
       FROM shipments s
       LEFT JOIN drivers d ON s.driver_id = d.id
       LEFT JOIN vehicles v ON s.vehicle_id = v.id
       WHERE s.id = ?`
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

  // Determine required document types
  const requiredTypes = getRequiredDocuments({
    origin_country: shipment.origin_country as string,
    destination_country: shipment.destination_country as string,
    is_dangerous_goods: shipment.is_dangerous_goods as number,
  });

  // Fetch existing documents linked to this shipment, driver, or vehicle
  const existingDocs = db
    .prepare(
      `SELECT * FROM compliance_documents
       WHERE shipment_id = ? OR driver_id = ? OR vehicle_id = ?`
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

  // Group existing docs by type
  const docsByType: Record<string, typeof existingDocs> = {};
  for (const doc of existingDocs) {
    if (!docsByType[doc.document_type]) docsByType[doc.document_type] = [];
    docsByType[doc.document_type].push(doc);
  }

  const activeAlertTitles: string[] = [];

  // Update document statuses based on expiry
  const updateStmt = db.prepare(
    `UPDATE compliance_documents SET status = ?, ai_verified = 1, updated_at = datetime('now') WHERE id = ?`
  );

  for (const doc of existingDocs) {
    const check = checkDocumentExpiry(doc);
    let newStatus = doc.status;

    if (check) {
      if (check.status === "expired") newStatus = "expired";
      else if (check.status === "expiring_soon" && doc.status !== "expired") newStatus = "expiring_soon";
      else if (check.status === "valid") newStatus = "valid";
    }

    if (newStatus !== doc.status) {
      updateStmt.run(newStatus, doc.id);
      doc.status = newStatus;
    }

    // Create alerts for critical/warning
    if (check && check.severity !== "info") {
      const entityId = doc.shipment_id || doc.driver_id || doc.vehicle_id;
      const entityCol = doc.shipment_id ? "shipment_id" : doc.driver_id ? "driver_id" : "vehicle_id";
      const title = `${doc.document_type.replace(/_/g, " ")} ${check.status === "expired" ? "EXPIRED" : "expiring in " + check.daysRemaining + " days"}`;
      const desc = `${doc.document_type.replace(/_/g, " ")} document (${doc.document_type}) ${
        check.status === "expired" ? "has EXPIRED" : `expires in ${check.daysRemaining} days`
      }.`;

      upsertAlert(db, {
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
    // Consider it "covered" if at least one non-expired document exists
    const hasValid = docs.some(
      (d) => d.status === "valid" || d.status === "expiring_soon" || d.status === "under_review"
    );
    if (!hasValid) {
      const desc = DOCUMENT_DEFINITIONS[reqType] || `Required: ${reqType.replace(/_/g, " ")}`;
      missing.push({ document_type: reqType, description: desc });

      // Create alert for missing documents
      const title = `Missing: ${reqType.replace(/_/g, " ")}`;
      upsertAlert(db, {
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

  // Resolve alerts that are no longer relevant
  resolveAlertsForEntity(db, "shipment", shipmentId, activeAlertTitles);

  // Calculate stats
  const allDocs = existingDocs.filter((d) => d.status !== "missing");
  const validCount = allDocs.filter((d) => d.status === "valid").length;
  const expiringCount = allDocs.filter((d) => d.status === "expiring_soon").length;
  const expiredCount = allDocs.filter((d) => d.status === "expired").length;
  const totalDocs = validCount + expiringCount + expiredCount + missing.length;

  // Compliance score: penalize based on missing and expired
  const maxPenalty = requiredTypes.length;
  let penalty = 0;
  penalty += missing.length * 2; // Missing docs are a heavy penalty
  penalty += expiredCount; // Expired docs
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
