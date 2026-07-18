import { getDb } from "@/lib/db";
import { getRequiredDocuments } from "@/lib/ai/compliance";

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export interface FactorResult {
  factor: string;
  label: string;
  weight: number;       // 0–1 (proportion of total)
  rawScore: number;     // 0–100
  weightedScore: number; // rawScore × weight
  details: string[];    // Human-readable breakdown
}

export interface MissionReadinessResult {
  score: number;        // 0–100, capped at 49 if hard gate triggered
  threshold: "green" | "amber" | "red";
  hardGateTriggered: boolean;
  hardGateReason: string | null;
  factors: FactorResult[];
  calculatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function daysUntil(dateStr: string | null): number {
  if (!dateStr) return -999;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(dateStr + "T00:00:00");
  return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Scores an expiry date on a 0–100 scale based on warning zones:
 *   > 30 days → 100
 *   14–30 days → 70
 *   7–14 days → 50
 *   1–7 days → 25
 *   0 or expired → 0
 *   missing (null) → 0
 */
function scoreExpiry(days: number): number {
  if (days <= 0) return 0;
  if (days <= 7) return 25;
  if (days <= 14) return 50;
  if (days <= 30) return 70;
  return 100;
}

function classifyThreshold(score: number): "green" | "amber" | "red" {
  if (score >= 80) return "green";
  if (score >= 50) return "amber";
  return "red";
}

function nowISO(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

// ═══════════════════════════════════════════════════════════════════
// F1: Compliance Document Completeness (30%)
// ═══════════════════════════════════════════════════════════════════

function scoreF1(
  shipment: Record<string, unknown>,
  driverId: number | null,
  vehicleId: number | null
): { rawScore: number; details: string[]; hardGateMissing: string[] } {
  const db = getDb();
  const hardGateMissing: string[] = [];

  const requiredTypes = getRequiredDocuments({
    origin_country: shipment.origin_country as string,
    destination_country: shipment.destination_country as string,
    is_dangerous_goods: shipment.is_dangerous_goods as number,
  });

  // Get all docs linked to this shipment, driver, or vehicle
  const docs = db
    .prepare(
      `SELECT * FROM compliance_documents
       WHERE shipment_id = ? OR driver_id = ? OR vehicle_id = ?`
    )
    .all(shipment.id as number, driverId, vehicleId) as Array<{
    document_type: string;
    status: string;
  }>;

  const docsByType: Record<string, typeof docs> = {};
  for (const doc of docs) {
    if (!docsByType[doc.document_type]) docsByType[doc.document_type] = [];
    docsByType[doc.document_type].push(doc);
  }

  const details: string[] = [];
  let covered = 0;

  for (const reqType of requiredTypes) {
    const typeDocs = docsByType[reqType] || [];
    const hasValid = typeDocs.some(
      (d) => d.status === "valid" || d.status === "expiring_soon" || d.status === "under_review"
    );
    if (hasValid) {
      covered++;
      details.push(`✓ ${reqType.replace(/_/g, " ")}: present and valid`);
    } else {
      details.push(`✗ ${reqType.replace(/_/g, " ")}: missing or expired`);
      hardGateMissing.push(reqType);
    }
  }

  const rawScore = requiredTypes.length > 0
    ? Math.round((covered / requiredTypes.length) * 100)
    : 100;

  return { rawScore, details, hardGateMissing };
}

// ═══════════════════════════════════════════════════════════════════
// F2: Document Expiry Status (20%)
// ═══════════════════════════════════════════════════════════════════

function scoreF2(
  shipmentId: number,
  driverId: number | null,
  vehicleId: number | null
): { rawScore: number; details: string[]; hardGateExpired: boolean } {
  const db = getDb();
  const docs = db
    .prepare(
      `SELECT * FROM compliance_documents
       WHERE (shipment_id = ? OR driver_id = ? OR vehicle_id = ?)
         AND expiry_date IS NOT NULL`
    )
    .all(shipmentId, driverId, vehicleId) as Array<{
    document_type: string;
    expiry_date: string | null;
    status: string;
  }>;

  if (docs.length === 0) {
    return { rawScore: 100, details: ["No dated documents to check"], hardGateExpired: false };
  }

  const details: string[] = [];
  let totalScore = 0;
  let hardGateExpired = false;

  for (const doc of docs) {
    const days = daysUntil(doc.expiry_date);
    const s = scoreExpiry(days);
    totalScore += s;

    const label = doc.document_type.replace(/_/g, " ");
    if (days <= 0) {
      details.push(`✗ ${label}: EXPIRED (${Math.abs(days)} days ago)`);
      hardGateExpired = true;
    } else if (days <= 7) {
      details.push(`⚠ ${label}: expires in ${days} days (critical)`);
    } else if (days <= 14) {
      details.push(`⚠ ${label}: expires in ${days} days (warning)`);
    } else if (days <= 30) {
      details.push(`⚠ ${label}: expires in ${days} days (approaching)`);
    } else {
      details.push(`✓ ${label}: valid (${days} days remaining)`);
    }
  }

  const rawScore = Math.round(totalScore / docs.length);
  return { rawScore, details, hardGateExpired };
}

// ═══════════════════════════════════════════════════════════════════
// F3: Driver Readiness (15%)
// ═══════════════════════════════════════════════════════════════════

function scoreF3(driverId: number | null): { rawScore: number; details: string[]; hardGateExpired: boolean } {
  if (!driverId) {
    return { rawScore: 0, details: ["✗ No driver assigned"], hardGateExpired: false };
  }

  const db = getDb();
  const driver = db.prepare("SELECT * FROM drivers WHERE id = ?").get(driverId) as Record<string, unknown> | undefined;

  if (!driver) {
    return { rawScore: 0, details: ["✗ Driver not found"], hardGateExpired: false };
  }

  const checks: { label: string; days: number; isMandatory: boolean }[] = [
    { label: "License", days: daysUntil(driver.license_expiry as string), isMandatory: true },
    { label: "PDP", days: daysUntil(driver.pdp_expiry as string), isMandatory: true },
    { label: "Medical certificate", days: daysUntil(driver.medical_certificate_expiry as string), isMandatory: true },
    { label: "Passport", days: daysUntil(driver.passport_expiry as string), isMandatory: false },
  ];

  if (driver.dg_endorsement === 1 && driver.dg_expiry) {
    checks.push({ label: "DG endorsement", days: daysUntil(driver.dg_expiry as string), isMandatory: false });
  }

  const details: string[] = [];
  let totalScore = 0;
  let hardGateExpired = false;

  for (const check of checks) {
    const s = scoreExpiry(check.days);
    totalScore += s;

    if (check.days <= 0) {
      details.push(`✗ ${check.label}: EXPIRED`);
      if (check.isMandatory) hardGateExpired = true;
    } else if (check.days <= 14) {
      details.push(`⚠ ${check.label}: expires in ${check.days} days`);
    } else {
      details.push(`✓ ${check.label}: valid (${check.days} days)`);
    }
  }

  const rawScore = Math.round(totalScore / checks.length);
  return { rawScore, details, hardGateExpired };
}

// ═══════════════════════════════════════════════════════════════════
// F4: Vehicle Readiness (15%)
// ═══════════════════════════════════════════════════════════════════

function scoreF4(vehicleId: number | null): { rawScore: number; details: string[]; hardGateExpired: boolean } {
  if (!vehicleId) {
    return { rawScore: 0, details: ["✗ No vehicle assigned"], hardGateExpired: false };
  }

  const db = getDb();
  const vehicle = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(vehicleId) as Record<string, unknown> | undefined;

  if (!vehicle) {
    return { rawScore: 0, details: ["✗ Vehicle not found"], hardGateExpired: false };
  }

  const checks: { label: string; days: number }[] = [
    { label: "Registration", days: daysUntil(vehicle.registration_expiry as string) },
    { label: "Roadworthiness", days: daysUntil(vehicle.roadworthiness_expiry as string) },
    { label: "Insurance", days: daysUntil(vehicle.insurance_expiry as string) },
    { label: "Cross-border permit", days: daysUntil(vehicle.cross_border_permit_expiry as string) },
  ];

  const details: string[] = [];
  let totalScore = 0;
  let hardGateExpired = false;

  for (const check of checks) {
    const s = scoreExpiry(check.days);
    totalScore += s;

    if (check.days <= 0) {
      details.push(`✗ ${check.label}: EXPIRED`);
      hardGateExpired = true;
    } else if (check.days <= 14) {
      details.push(`⚠ ${check.label}: expires in ${check.days} days`);
    } else {
      details.push(`✓ ${check.label}: valid (${check.days} days)`);
    }
  }

  const rawScore = Math.round(totalScore / checks.length);
  return { rawScore, details, hardGateExpired };
}

// ═══════════════════════════════════════════════════════════════════
// F5: Route Readiness (10%)
// ═══════════════════════════════════════════════════════════════════

function scoreF5(shipment: Record<string, unknown>): { rawScore: number; details: string[] } {
  const details: string[] = [];
  let pass = 0;
  let total = 4; // border crossings identified, ETD set, ETA set, at least one border per country entry

  const borders = JSON.parse((shipment.border_crossings as string) || "[]");
  if (borders.length > 0) {
    pass++;
    details.push(`✓ ${borders.length} border crossing(s) identified: ${borders.join(", ")}`);
  } else {
    const isCrossBorder = (shipment.origin_country as string) !== (shipment.destination_country as string);
    if (isCrossBorder) {
      details.push("✗ No border crossings identified for cross-border trip");
    } else {
      details.push("✓ Domestic trip — no border crossings needed");
      pass++;
      total--; // Don't penalize domestic
    }
  }

  if (shipment.departure_scheduled) {
    pass++;
    details.push("✓ ETD scheduled");
  } else {
    details.push("✗ No ETD set");
  }

  if (shipment.eta) {
    pass++;
    details.push("✓ ETA set");
  } else {
    details.push("✗ No ETA set");
  }

  // Check permits per transit country (simplified: if cross-border, border_crossings should exist)
  if (borders.length > 0) {
    pass++;
    details.push("✓ Route documentation captured");
  } else if ((shipment.origin_country as string) === (shipment.destination_country as string)) {
    pass++;
    details.push("✓ Domestic route — no transit permits required");
  } else {
    details.push("✗ Cross-border route missing transit documentation");
  }

  const effectiveTotal = Math.max(total, 1);
  const rawScore = Math.round((pass / effectiveTotal) * 100);
  return { rawScore, details };
}

// ═══════════════════════════════════════════════════════════════════
// F6: Cargo Readiness (10%)
// ═══════════════════════════════════════════════════════════════════

function scoreF6(shipment: Record<string, unknown>): { rawScore: number; details: string[] } {
  const details: string[] = [];
  let pass = 0;
  const total = 5;

  if (shipment.cargo_hs_code && (shipment.cargo_hs_code as string).length > 0) {
    pass++;
    details.push(`✓ HS code: ${shipment.cargo_hs_code}`);
  } else {
    details.push("✗ HS code missing");
  }

  if ((shipment.cargo_value as number) > 0) {
    pass++;
    details.push(`✓ Value declared: $${((shipment.cargo_value as number) / 100).toLocaleString()} USD`);
  } else {
    details.push("✗ Cargo value not declared");
  }

  if (shipment.cargo_description && (shipment.cargo_description as string).length > 0) {
    pass++;
    details.push(`✓ Description: ${(shipment.cargo_description as string).substring(0, 60)}…`);
  } else {
    details.push("✗ Cargo description missing");
  }

  if ((shipment.cargo_weight_kg as number) > 0) {
    pass++;
    details.push(`✓ Weight: ${(shipment.cargo_weight_kg as number).toLocaleString()} kg`);
  } else {
    details.push("✗ Cargo weight not specified");
  }

  if (shipment.is_dangerous_goods) {
    if (shipment.dg_class) {
      pass++;
      details.push(`✓ DG Class ${shipment.dg_class} specified`);
    } else {
      details.push("✗ Dangerous goods declared but no DG class specified");
    }
  } else {
    pass++;
    details.push("✓ Non-DG cargo");
  }

  const rawScore = Math.round((pass / total) * 100);
  return { rawScore, details };
}

// ═══════════════════════════════════════════════════════════════════
// Main: calculateMissionReadiness
// ═══════════════════════════════════════════════════════════════════

export async function calculateMissionReadiness(
  shipmentId: number
): Promise<MissionReadinessResult> {
  const db = getDb();

  const shipment = db
    .prepare("SELECT * FROM shipments WHERE id = ?")
    .get(shipmentId) as Record<string, unknown> | undefined;

  if (!shipment) {
    throw new Error(`Shipment ${shipmentId} not found`);
  }

  const driverId = shipment.driver_id as number | null;
  const vehicleId = shipment.vehicle_id as number | null;

  // ── Run all six factor scorers ──
  const f1 = scoreF1(shipment, driverId, vehicleId);
  const f2 = scoreF2(shipmentId, driverId, vehicleId);
  const f3 = scoreF3(driverId);
  const f4 = scoreF4(vehicleId);
  const f5 = scoreF5(shipment);
  const f6 = scoreF6(shipment);

  // ── Hard gate: if any legally-mandatory doc is expired or missing → cap at 49 ──
  const hardGateTriggered =
    f1.hardGateMissing.length > 0 ||
    f2.hardGateExpired ||
    f3.hardGateExpired ||
    f4.hardGateExpired;

  const hardGateReasons: string[] = [];
  if (f1.hardGateMissing.length > 0) {
    hardGateReasons.push(`Missing mandatory docs: ${f1.hardGateMissing.map(d => d.replace(/_/g, " ")).join(", ")}`);
  }
  if (f2.hardGateExpired) hardGateReasons.push("One or more compliance documents have expired");
  if (f3.hardGateExpired) hardGateReasons.push("Driver has expired mandatory credentials");
  if (f4.hardGateExpired) hardGateReasons.push("Vehicle has expired mandatory credentials");

  // ── Weighted factors ──
  const weights: { factor: string; label: string; weight: number; rawScore: number }[] = [
    { factor: "F1", label: "Compliance Document Completeness", weight: 0.30, rawScore: f1.rawScore },
    { factor: "F2", label: "Document Expiry Status", weight: 0.20, rawScore: f2.rawScore },
    { factor: "F3", label: "Driver Readiness", weight: 0.15, rawScore: f3.rawScore },
    { factor: "F4", label: "Vehicle Readiness", weight: 0.15, rawScore: f4.rawScore },
    { factor: "F5", label: "Route Readiness", weight: 0.10, rawScore: f5.rawScore },
    { factor: "F6", label: "Cargo Readiness", weight: 0.10, rawScore: f6.rawScore },
  ];

  const detailsMap: Record<string, string[]> = {
    F1: f1.details,
    F2: f2.details,
    F3: f3.details,
    F4: f4.details,
    F5: f5.details,
    F6: f6.details,
  };

  const factors: FactorResult[] = weights.map((w) => ({
    factor: w.factor,
    label: w.label,
    weight: w.weight,
    rawScore: w.rawScore,
    weightedScore: Math.round(w.rawScore * w.weight),
    details: detailsMap[w.factor] || [],
  }));

  // Aggregate score from weighted factors
  const rawTotal = factors.reduce((sum, f) => sum + f.weightedScore, 0);
  const score = hardGateTriggered ? Math.min(rawTotal, 49) : rawTotal;

  // Update the shipment record
  const now = nowISO();
  db.prepare(
    `UPDATE shipments SET mission_readiness_score = ?, readiness_calculated_at = ?, updated_at = ? WHERE id = ?`
  ).run(score, now, now, shipmentId);

  // ── Create/update hard gate alert ──
  if (hardGateTriggered && hardGateReasons.length > 0) {
    const hardGateTitle = `Shipment cannot depart — hard gate triggered`;
    const hardGateDesc = `Mission Readiness Score capped at ${score}/100. Reasons: ${hardGateReasons.join("; ")}`;

    // Check for existing unresolved hard gate alert for this shipment
    const existing = db
      .prepare(
        `SELECT id FROM alerts 
         WHERE shipment_id = ? AND alert_type = 'risk' AND title = ? AND is_resolved = 0 
         LIMIT 1`
      )
      .get(shipmentId, hardGateTitle) as { id: number } | undefined;

    if (existing) {
      db.prepare(
        `UPDATE alerts SET severity = 'critical', description = ?, created_at = datetime('now')
         WHERE id = ?`
      ).run(hardGateDesc, existing.id);
    } else {
      db.prepare(
        `INSERT INTO alerts (shipment_id, alert_type, severity, title, description)
         VALUES (?, 'risk', 'critical', ?, ?)`
      ).run(shipmentId, hardGateTitle, hardGateDesc);
    }
  } else {
    // Resolve old hard gate alert if the gate is no longer triggered
    db.prepare(
      `UPDATE alerts SET is_resolved = 1, resolved_at = datetime('now')
       WHERE shipment_id = ? AND alert_type = 'risk' 
         AND title = 'Shipment cannot depart — hard gate triggered' 
         AND is_resolved = 0`
    ).run(shipmentId);
  }

  return {
    score,
    threshold: classifyThreshold(score),
    hardGateTriggered,
    hardGateReason: hardGateReasons.length > 0 ? hardGateReasons.join("; ") : null,
    factors,
    calculatedAt: now,
  };
}
