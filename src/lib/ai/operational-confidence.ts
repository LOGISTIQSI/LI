import { getDb } from "@/lib/db";
import { checkDocumentExpiry } from "@/lib/ai/compliance";

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export interface OCSFactorResult {
  factor: string;
  label: string;
  weight: number;
  rawScore: number;
  weightedScore: number;
  details: string[];
}

export interface OperationalConfidenceResult {
  score: number;
  threshold: "on_track" | "at_risk" | "critical";
  factors: OCSFactorResult[];
  calculatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function nowISO(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

const BORDER_WAIT_HOURS: Record<string, number> = {
  "Beitbridge": 4.2,
  "Kazungula": 1.8,
  "Kasumbalesa": 3.0,
  "Chirundu": 2.5,
  "Katima Mulilo": 1.5,
  "Ramatlabama": 2.0,
  "Lebombo": 2.5,
  "Nakonde": 3.0,
  "default": 2.0,
};

// ═══════════════════════════════════════════════════════════════════
// O1: Route Adherence (25%)
// ═══════════════════════════════════════════════════════════════════

async function scoreO1(
  shipmentId: number,
  _shipment: Record<string, unknown>
): Promise<{ rawScore: number; details: string[] }> {
  const db = getDb();

  const events = await db
    .prepare(
      `SELECT * FROM trip_events
       WHERE shipment_id = $1 AND latitude IS NOT NULL AND longitude IS NOT NULL
       ORDER BY recorded_at DESC
       LIMIT 10`
    )
    .all(shipmentId) as Array<{ latitude: number; longitude: number; recorded_at: string }>;

  if (events.length < 2) {
    return { rawScore: 1.0, details: ["Insufficient GPS data for route adherence check (using neutral default)"] };
  }

  const details: string[] = [];
  let totalDeviationKm = 0;

  for (let i = 1; i < events.length; i++) {
    const dist = haversineKm(
      events[i - 1].latitude, events[i - 1].longitude,
      events[i].latitude, events[i].longitude
    );
    totalDeviationKm += dist;
  }

  const avgPointDist = totalDeviationKm / (events.length - 1);

  if (avgPointDist > 50) {
    details.push(`⚠ Large gaps in GPS tracking (avg ${Math.round(avgPointDist)}km between points) — possible route deviation`);
    return { rawScore: 0.6, details };
  }

  details.push(`✓ Route tracking consistent (avg ${Math.round(avgPointDist * 10) / 10}km between recent GPS points)`);
  return { rawScore: 1.0, details };
}

// ═══════════════════════════════════════════════════════════════════
// O2: Speed Compliance (10%)
// ═══════════════════════════════════════════════════════════════════

async function scoreO2(shipmentId: number): Promise<{ rawScore: number; details: string[] }> {
  const db = getDb();

  const events = await db
    .prepare(
      `SELECT speed_kmh, recorded_at FROM trip_events
       WHERE shipment_id = $1 AND speed_kmh IS NOT NULL
       ORDER BY recorded_at DESC
       LIMIT 10`
    )
    .all(shipmentId) as Array<{ speed_kmh: number }>;

  if (events.length === 0) {
    return { rawScore: 1.0, details: ["No recent speed data available (using neutral default)"] };
  }

  const speeds = events.map((e) => e.speed_kmh);
  const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;

  const details: string[] = [];

  if (avgSpeed < 5) {
    details.push(`⚠ Vehicle appears stopped (avg ${Math.round(avgSpeed)} km/h over last ${events.length} readings) — possible breakdown or extended stop`);
    return { rawScore: 0.3, details };
  }

  if (avgSpeed < 30) {
    details.push(`⚠ Slow progress: avg ${Math.round(avgSpeed)} km/h — possible congestion or road conditions`);
    return { rawScore: 0.6, details };
  }

  if (avgSpeed <= 100) {
    details.push(`✓ Normal highway speed: avg ${Math.round(avgSpeed)} km/h`);
    return { rawScore: 1.0, details };
  }

  details.push(`⚠ Speed above expected range: avg ${Math.round(avgSpeed)} km/h`);
  return { rawScore: 0.8, details };
}

// ═══════════════════════════════════════════════════════════════════
// O3: Time Buffer (30%)
// ═══════════════════════════════════════════════════════════════════

async function scoreO3(
  shipmentId: number,
  shipment: Record<string, unknown>
): Promise<{ rawScore: number; details: string[] }> {
  const db = getDb();
  const details: string[] = [];

  const departureActual = shipment.departure_actual as string | null;
  const eta = shipment.eta as string | null;
  const destination = shipment.destination as string;
  const origin = shipment.origin as string;

  if (!departureActual || !eta) {
    return { rawScore: 0.8, details: ["Cannot calculate time buffer — missing departure or ETA data (using neutral default)"] };
  }

  const now = new Date();
  const depDate = new Date(departureActual.replace(" ", "T"));
  const etaDate = new Date(eta.replace(" ", "T"));

  const totalDuration = etaDate.getTime() - depDate.getTime();
  if (totalDuration <= 0) {
    details.push("⚠ ETA is before departure — data issue");
    return { rawScore: 0.5, details };
  }

  const timeElapsed = now.getTime() - depDate.getTime();
  const timeRemaining = Math.max(0, etaDate.getTime() - now.getTime());
  const timeRemainingPct = timeRemaining / totalDuration;

  const lastEvent = await db
    .prepare(
      `SELECT latitude, longitude FROM trip_events
       WHERE shipment_id = $1 AND latitude IS NOT NULL AND longitude IS NOT NULL
       ORDER BY recorded_at DESC LIMIT 1`
    )
    .get(shipmentId) as { latitude: number; longitude: number } | undefined;

  const destCoords = getApproxCoords(destination);
  const originCoords = getApproxCoords(origin);

  if (!lastEvent || !destCoords) {
    const bufferRatio = timeRemainingPct / Math.max(0.2, 1 - timeElapsed / totalDuration);

    details.push(`Time elapsed: ${Math.round(timeElapsed / 3600000)}h, remaining: ${Math.round(timeRemaining / 3600000)}h`);
    details.push(`Time buffer ratio: ${(bufferRatio * 100).toFixed(0)}%`);

    let rawScore: number;
    if (bufferRatio >= 1.0) {
      rawScore = 1.0;
      details.push("✓ Ahead of schedule or on track");
    } else if (bufferRatio >= 0.7) {
      rawScore = 0.8;
      details.push("⚠ Slightly behind schedule — buffer is adequate");
    } else if (bufferRatio >= 0.4) {
      rawScore = 0.6;
      details.push("⚠ Behind schedule — buffer is thinning");
    } else {
      rawScore = 0.35;
      details.push("✗ Critically behind schedule — high delay risk");
    }

    return { rawScore, details };
  }

  const distRemaining = haversineKm(lastEvent.latitude, lastEvent.longitude, destCoords.lat, destCoords.lng);
  const totalDist = haversineKm(originCoords!.lat, originCoords!.lng, destCoords.lat, destCoords.lng) || 1;

  const distRemainingPct = Math.max(0, Math.min(1, distRemaining / totalDist));

  const bufferRatio = distRemainingPct > 0
    ? timeRemainingPct / distRemainingPct
    : 1.0;

  details.push(`Distance remaining: ${Math.round(distRemaining)}km / ${Math.round(totalDist)}km (${(distRemainingPct * 100).toFixed(0)}%)`);
  details.push(`Time remaining: ${Math.round(timeRemaining / 3600000)}h of ${Math.round(totalDuration / 3600000)}h total (${(timeRemainingPct * 100).toFixed(0)}%)`);
  details.push(`Buffer ratio: ${bufferRatio.toFixed(2)} (${(bufferRatio * 100).toFixed(0)}%)`);

  let rawScore: number;
  if (bufferRatio >= 1.1) {
    rawScore = 1.0;
    details.push("✓ Ahead of schedule");
  } else if (bufferRatio >= 0.9) {
    rawScore = 0.9;
    details.push("✓ On track");
  } else if (bufferRatio >= 0.7) {
    rawScore = 0.75;
    details.push("⚠ Slightly behind — buffer adequate");
  } else if (bufferRatio >= 0.5) {
    rawScore = 0.55;
    details.push("⚠ Behind schedule — buffer thinning");
  } else if (bufferRatio >= 0.3) {
    rawScore = 0.35;
    details.push("✗ Significantly behind — high risk of missing ETA");
  } else {
    rawScore = 0.15;
    details.push("✗ Critical delay — ETA will almost certainly be missed");
  }

  return { rawScore, details };
}

// ═══════════════════════════════════════════════════════════════════
// O4: Border Delay Risk (15%)
// ═══════════════════════════════════════════════════════════════════

async function scoreO4(shipmentId: number, shipment: Record<string, unknown>): Promise<{ rawScore: number; details: string[] }> {
  const db = getDb();
  const details: string[] = [];

  const borders: string[] = JSON.parse((shipment.border_crossings as string) || "[]");
  if (borders.length === 0) {
    return { rawScore: 1.0, details: ["No border crossings on this route"] };
  }

  const crossedEvents = await db
    .prepare(
      `SELECT location_description FROM trip_events
       WHERE shipment_id = $1 AND event_type = 'border_departure'
       ORDER BY recorded_at DESC`
    )
    .all(shipmentId) as Array<{ location_description: string }>;

  const crossedBorders = new Set<string>();
  for (const ev of crossedEvents) {
    for (const border of borders) {
      if (ev.location_description.toLowerCase().includes(border.toLowerCase())) {
        crossedBorders.add(border);
      }
    }
  }

  const pendingBorders = borders.filter((b) => !crossedBorders.has(b));
  const details2: string[] = [];

  if (crossedBorders.size > 0) {
    details2.push(`✓ ${crossedBorders.size} border(s) already cleared: ${[...crossedBorders].join(", ")}`);
  }

  if (pendingBorders.length === 0) {
    details2.push("✓ All border crossings completed");
    return { rawScore: 1.0, details: details2 };
  }

  let totalWaitHours = 0;
  for (const b of pendingBorders) {
    const wait = BORDER_WAIT_HOURS[b] ?? BORDER_WAIT_HOURS["default"];
    totalWaitHours += wait;
    details2.push(`⚠ ${b}: ~${wait}h expected wait (${wait >= 3 ? "congested" : "moderate"})`);
  }

  const rawScore = Math.max(0.3, 1.0 - (totalWaitHours / 15));

  return { rawScore, details: details2 };
}

// ═══════════════════════════════════════════════════════════════════
// O5: External Risk (10%)
// ═══════════════════════════════════════════════════════════════════

function scoreO5(_shipmentId: number): { rawScore: number; details: string[] } {
  return {
    rawScore: 0.85,
    details: ["ℹ External risk assessment: neutral (weather/road APIs not yet integrated)"],
  };
}

// ═══════════════════════════════════════════════════════════════════
// O6: Compliance Mid-Journey (10%)
// ═══════════════════════════════════════════════════════════════════

async function scoreO6(
  shipmentId: number,
  shipment: Record<string, unknown>,
  driverId: number | null,
  vehicleId: number | null
): Promise<{ rawScore: number; details: string[] }> {
  const db = getDb();
  const details: string[] = [];

  const etaDate = shipment.eta ? new Date((shipment.eta as string).replace(" ", "T")) : null;
  if (!etaDate) {
    return { rawScore: 1.0, details: ["No ETA set — cannot assess compliance mid-journey"] };
  }

  const now = new Date();
  const etaDays = Math.ceil((etaDate.getTime() - now.getTime()) / 86400000);

  const docs = await db
    .prepare(
      `SELECT * FROM compliance_documents
       WHERE (shipment_id = $1 OR driver_id = $2 OR vehicle_id = $3)
         AND expiry_date IS NOT NULL`
    )
    .all(shipmentId, driverId, vehicleId) as Array<{
    document_type: string;
    expiry_date: string;
    status: string;
  }>;

  const riskyDocs: string[] = [];

  for (const doc of docs) {
    const check = checkDocumentExpiry({ expiry_date: doc.expiry_date });
    if (check) {
      if (check.daysRemaining <= etaDays + 2) {
        riskyDocs.push(`${doc.document_type.replace(/_/g, " ")} (expires in ${check.daysRemaining}d, ETA in ${etaDays}d)`);
      }
    }
  }

  const unresolvedAlerts = await db
    .prepare(
      `SELECT COUNT(*) as cnt FROM alerts
       WHERE shipment_id = $1 AND is_resolved = 0 AND severity IN ('warning', 'critical')`
    )
    .get(shipmentId) as { cnt: number };

  if (riskyDocs.length > 0) {
    details.push(`✗ ${riskyDocs.length} document(s) may expire before ETA: ${riskyDocs.join("; ")}`);
  }

  if (unresolvedAlerts.cnt > 0) {
    details.push(`⚠ ${unresolvedAlerts.cnt} unresolved alert(s) requiring attention`);
  }

  if (riskyDocs.length === 0 && unresolvedAlerts.cnt === 0) {
    details.push("✓ All documents valid through ETA, no unresolved alerts");
    return { rawScore: 1.0, details };
  }

  const penalty = riskyDocs.length * 0.15 + unresolvedAlerts.cnt * 0.05;
  const rawScore = Math.max(0.2, 1.0 - penalty);

  return { rawScore, details };
}

// ═══════════════════════════════════════════════════════════════════
// Approximate coordinates
// ═══════════════════════════════════════════════════════════════════

function getApproxCoords(location: string): { lat: number; lng: number } | null {
  const loc = location.toLowerCase();
  const coords: Record<string, { lat: number; lng: number }> = {
    "solwezi": { lat: -12.1734, lng: 26.3945 },
    "lusaka": { lat: -15.3875, lng: 28.3228 },
    "durban": { lat: -29.8587, lng: 31.0218 },
    "johannesburg": { lat: -26.2041, lng: 28.0473 },
    "lubumbashi": { lat: -11.6647, lng: 27.4794 },
    "kolwezi": { lat: -10.7189, lng: 25.4670 },
    "walvis bay": { lat: -22.9575, lng: 14.5053 },
    "bikita": { lat: -20.1386, lng: 31.4436 },
    "tete": { lat: -16.1575, lng: 33.5867 },
    "beira": { lat: -19.8436, lng: 34.8389 },
    "harare": { lat: -17.8252, lng: 31.0335 },
    "bulawayo": { lat: -20.1457, lng: 28.5873 },
    "windhoek": { lat: -22.5609, lng: 17.0658 },
    "gaborone": { lat: -24.6282, lng: 25.9231 },
    "ndola": { lat: -12.9683, lng: 28.6337 },
    "kitwe": { lat: -12.8080, lng: 28.2064 },
  };

  for (const [key, val] of Object.entries(coords)) {
    if (loc.includes(key)) return val;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// Alert helpers
// ═══════════════════════════════════════════════════════════════════

async function upsertAlert(
  db: ReturnType<typeof getDb>,
  params: {
    shipment_id?: number | null;
    alert_type: string;
    severity: string;
    title: string;
    description: string;
  }
): Promise<void> {
  const existing = await db
    .prepare(
      `SELECT id FROM alerts
       WHERE alert_type = $1 AND title = $2 AND is_resolved = 0
         AND ($3::int IS NULL OR shipment_id = $4)
       LIMIT 1`
    )
    .get(params.alert_type, params.title, params.shipment_id, params.shipment_id) as
    | { id: number }
    | undefined;

  if (existing) {
    await db.prepare(
      `UPDATE alerts SET severity = $1, description = $2, created_at = NOW()
       WHERE id = $3`
    ).run(params.severity, params.description, existing.id);
  } else {
    await db.prepare(
      `INSERT INTO alerts (shipment_id, alert_type, severity, title, description)
       VALUES ($1, $2, $3, $4, $5)`
    ).run(
      params.shipment_id || null,
      params.alert_type,
      params.severity,
      params.title,
      params.description
    );
  }
}

async function resolveAlertByTitle(
  db: ReturnType<typeof getDb>,
  shipmentId: number,
  title: string
): Promise<void> {
  await db.prepare(
    `UPDATE alerts SET is_resolved = 1, resolved_at = NOW()
     WHERE shipment_id = $1 AND title = $2 AND is_resolved = 0`
  ).run(shipmentId, title);
}

// ═══════════════════════════════════════════════════════════════════
// Main: calculateOperationalConfidence
// ═══════════════════════════════════════════════════════════════════

export async function calculateOperationalConfidence(
  shipmentId: number
): Promise<OperationalConfidenceResult> {
  const db = getDb();

  const shipment = await db
    .prepare("SELECT * FROM shipments WHERE id = $1")
    .get(shipmentId) as Record<string, unknown> | undefined;

  if (!shipment) {
    throw new Error(`Shipment ${shipmentId} not found`);
  }

  const driverId = shipment.driver_id as number | null;
  const vehicleId = shipment.vehicle_id as number | null;

  // ── Run all six factor scorers ──
  const o1 = await scoreO1(shipmentId, shipment);
  const o2 = await scoreO2(shipmentId);
  const o3 = await scoreO3(shipmentId, shipment);
  const o4 = await scoreO4(shipmentId, shipment);
  const o5 = scoreO5(shipmentId);
  const o6 = await scoreO6(shipmentId, shipment, driverId, vehicleId);

  const weights: { factor: string; label: string; weight: number; rawScore: number }[] = [
    { factor: "O1", label: "Route Adherence", weight: 0.25, rawScore: o1.rawScore },
    { factor: "O2", label: "Speed Compliance", weight: 0.10, rawScore: o2.rawScore },
    { factor: "O3", label: "Time Buffer", weight: 0.30, rawScore: o3.rawScore },
    { factor: "O4", label: "Border Delay Risk", weight: 0.15, rawScore: o4.rawScore },
    { factor: "O5", label: "External Risk", weight: 0.10, rawScore: o5.rawScore },
    { factor: "O6", label: "Compliance Mid-Journey", weight: 0.10, rawScore: o6.rawScore },
  ];

  const detailsMap: Record<string, string[]> = {
    O1: o1.details,
    O2: o2.details,
    O3: o3.details,
    O4: o4.details,
    O5: o5.details,
    O6: o6.details,
  };

  const factors: OCSFactorResult[] = weights.map((w) => ({
    factor: w.factor,
    label: w.label,
    weight: w.weight,
    rawScore: w.rawScore,
    weightedScore: Math.round(w.rawScore * w.weight * 1000) / 1000,
    details: detailsMap[w.factor] || [],
  }));

  const score = Math.round(factors.reduce((sum, f) => sum + f.weightedScore, 0) * 1000) / 1000;

  let threshold: "on_track" | "at_risk" | "critical";
  if (score >= 0.85) threshold = "on_track";
  else if (score >= 0.60) threshold = "at_risk";
  else threshold = "critical";

  const now = nowISO();
  await db.prepare(
    `UPDATE shipments SET operational_confidence_score = $1, confidence_calculated_at = $2, updated_at = $3 WHERE id = $4`
  ).run(score, now, now, shipmentId);

  // ── Create alerts ──
  if (o2.rawScore <= 0.3) {
    const title = "Vehicle stopped — possible breakdown";
    const desc = o2.details[0] || "Vehicle speed indicates vehicle may be stopped or broken down";
    await upsertAlert(db, { shipment_id: shipmentId, alert_type: "delay", severity: "critical", title, description: desc });
  } else if (o2.rawScore <= 0.6) {
    const title = "Slow progress detected";
    const desc = o2.details[0] || "Vehicle moving below expected speed — possible congestion or road issue";
    await upsertAlert(db, { shipment_id: shipmentId, alert_type: "delay", severity: "warning", title, description: desc });
  } else {
    await resolveAlertByTitle(db, shipmentId, "Vehicle stopped — possible breakdown");
    await resolveAlertByTitle(db, shipmentId, "Slow progress detected");
  }

  if (o4.rawScore <= 0.5) {
    const title = "High border delay risk";
    const desc = o4.details.filter((d) => d.startsWith("⚠")).join("; ") || "Significant border wait times expected";
    await upsertAlert(db, { shipment_id: shipmentId, alert_type: "border", severity: "warning", title, description: desc });
  } else {
    await resolveAlertByTitle(db, shipmentId, "High border delay risk");
  }

  if (o3.rawScore <= 0.35) {
    const title = "Critically behind schedule";
    const desc = o3.details.filter((d) => d.startsWith("✗")).join("; ") || "Shipment is critically behind schedule and unlikely to meet ETA";
    await upsertAlert(db, { shipment_id: shipmentId, alert_type: "delay", severity: "critical", title, description: desc });
  } else if (o3.rawScore <= 0.55) {
    const title = "Behind schedule";
    const desc = o3.details.filter((d) => d.startsWith("⚠")).join("; ") || "Shipment is falling behind planned schedule";
    await upsertAlert(db, { shipment_id: shipmentId, alert_type: "delay", severity: "warning", title, description: desc });
  } else {
    await resolveAlertByTitle(db, shipmentId, "Critically behind schedule");
    await resolveAlertByTitle(db, shipmentId, "Behind schedule");
  }

  return {
    score,
    threshold,
    factors,
    calculatedAt: now,
  };
}
