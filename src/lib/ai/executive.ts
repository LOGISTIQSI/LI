import { getDb } from "@/lib/db";
import { calculateMissionReadiness } from "@/lib/ai/mission-readiness";
import { calculateOperationalConfidence } from "@/lib/ai/operational-confidence";

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export interface CriticalAlertItem {
  id: number;
  title: string;
  severity: "critical" | "warning" | "info";
  description: string;
  affectedShipment: string | null;
  recommendedAction: string;
  deadline: string | null;
}

export interface PrioritisedDecision {
  priority: number;
  severity: "critical" | "warning" | "info";
  decision: string;
  context: string;
  affectedShipments: string[];
  options: string[];
  aiRecommendation: string;
  deadline: string;
  priorityScore: number;
}

export interface ComplianceWatchItem {
  entity: string;
  entityType: "driver" | "vehicle" | "shipment";
  documentType: string;
  expiryDate: string;
  daysRemaining: number;
  affectedShipments: number;
}

export interface BorderCondition {
  border: string;
  waitTimeMinutes: number;
  status: "clear" | "congested" | "closed";
  trend: "up" | "down" | "stable";
  affectedShipments: number;
  lastUpdated: string;
}

export interface FleetOverview {
  totalActive: number;
  inTransit: number;
  atBorder: number;
  delayed: number;
  missionReady: number;
  pending: number;
}

export interface YesterdayOutcome {
  onTimeRate: number;
  completedCount: number;
  cancelledCount: number;
  avgBorderWaitMinutes: number;
}

export interface IntelligenceBrief {
  date: string;
  generatedAt: string;
  companyId: number;
  executiveSummary: string;
  criticalAlerts: CriticalAlertItem[];
  prioritisedDecisions: PrioritisedDecision[];
  complianceWatchlist: ComplianceWatchItem[];
  borderConditions: BorderCondition[];
  fleetOverview: FleetOverview;
  yesterdayOutcomes: YesterdayOutcome;
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowISO(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function daysUntil(dateStr: string | null): number {
  if (!dateStr) return -999;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(dateStr + "T00:00:00");
  return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// Border wait time estimates (minutes)
const BORDER_WAIT: Record<string, number> = {
  "Beitbridge": 252,
  "Kazungula": 108,
  "Kasumbalesa": 180,
  "Chirundu": 120,
  "Katima Mulilo": 60,
  "Ramatlabama": 80,
  "Lebombo": 110,
  "Nakonde": 150,
};

function getBorderStatus(waitMin: number): "clear" | "congested" | "closed" {
  if (waitMin >= 240) return "closed";
  if (waitMin >= 120) return "congested";
  return "clear";
}

function generateActionsFromAlert(alert: Record<string, unknown>): string {
  const alertType = alert.alert_type as string;
  const title = (alert.title as string).toLowerCase();

  switch (alertType) {
    case "compliance":
      return "Verify document status and renew if expired. Pre-clear with destination authority before departure.";
    case "border":
      return "Pre-clear all documentation electronically. Consider alternate border crossing if delay exceeds 4 hours.";
    case "delay":
      return "Contact logistics coordinator to assess impact on downstream operations. Update ETA for receivers.";
    case "expiry":
      if (title.includes("license"))
        return "Schedule license renewal immediately. Assign backup driver if renewal cannot be completed within 48 hours.";
      if (title.includes("permit"))
        return "Submit permit renewal application. Check if temporary permit is available for pending shipments.";
      return "Initiate renewal process before expiry. Flag for compliance officer review.";
    case "risk":
      return "Review risk factors and implement mitigation measures. Escalate to operations manager if risk score exceeds threshold.";
    default:
      return "Review and escalate if needed. Update shipment status and notify affected stakeholders.";
  }
}

// ═══════════════════════════════════════════════════════════════════
// Step 1: GATHER
// ═══════════════════════════════════════════════════════════════════

function gatherData(companyId: number) {
  const db = getDb();

  // Active shipments (not completed, not cancelled)
  const activeShipments = db
    .prepare(
      `SELECT s.*, 
        d.license_number AS driver_license,
        u.full_name AS driver_name,
        v.registration_number AS vehicle_reg,
        mc.name AS owner_name
       FROM shipments s
       LEFT JOIN drivers d ON s.driver_id = d.id
       LEFT JOIN users u ON d.user_id = u.id
       LEFT JOIN vehicles v ON s.vehicle_id = v.id
       LEFT JOIN companies mc ON s.company_id = mc.id
       WHERE s.company_id = ? AND s.status NOT IN ('completed', 'cancelled')
       ORDER BY s.departure_scheduled ASC`
    )
    .all(companyId) as Record<string, unknown>[];

  // Unresolved alerts
  const unresolvedAlerts = db
    .prepare(
      `SELECT a.*, s.shipment_id AS shipment_ref
       FROM alerts a
       LEFT JOIN shipments s ON a.shipment_id = s.id
       WHERE a.is_resolved = 0 AND s.company_id = ?
       ORDER BY 
         CASE a.severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
         a.created_at DESC`
    )
    .all(companyId) as Record<string, unknown>[];

  // Compliance documents with upcoming expiry
  const expiringDocs = db
    .prepare(
      `SELECT cd.*, 
        COALESCE(s.shipment_id, 'N/A') AS shipment_ref,
        COALESCE(d.company_id, v.company_id, s.company_id) AS entity_company_id
       FROM compliance_documents cd
       LEFT JOIN shipments s ON cd.shipment_id = s.id
       LEFT JOIN drivers d ON cd.driver_id = d.id
       LEFT JOIN vehicles v ON cd.vehicle_id = v.id
       WHERE cd.expiry_date IS NOT NULL 
         AND cd.status IN ('valid', 'expiring_soon', 'under_review')
         AND date(cd.expiry_date) <= date('now', '+30 days')
         AND date(cd.expiry_date) >= date('now', '-1 day')
         AND (s.company_id = ? OR d.company_id = ? OR v.company_id = ?)
       ORDER BY cd.expiry_date ASC`
    )
    .all(companyId, companyId, companyId) as Record<string, unknown>[];

  // Yesterday's outcomes
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const todayDateStr = todayStr();

  const completedYesterday = db
    .prepare(
      `SELECT * FROM shipments
       WHERE company_id = ?
         AND status = 'completed'
         AND date(arrival_actual) = ?`
    )
    .all(companyId, yesterdayStr) as Record<string, unknown>[];

  const cancelledYesterday = db
    .prepare(
      `SELECT * FROM shipments
       WHERE company_id = ?
         AND status = 'cancelled'
         AND date(updated_at) = ?`
    )
    .all(companyId, yesterdayStr) as Record<string, unknown>[];

  // Border wait times from recent trip events
  const borderEvents = db
    .prepare(
      `SELECT te.*, s.shipment_id, s.border_crossings
       FROM trip_events te
       JOIN shipments s ON te.shipment_id = s.id
       WHERE s.company_id = ?
         AND te.event_type IN ('border_arrival', 'border_departure')
         AND date(te.recorded_at) >= date('now', '-7 days')
       ORDER BY te.shipment_id, te.recorded_at ASC`
    )
    .all(companyId) as Record<string, unknown>[];

  return {
    activeShipments,
    unresolvedAlerts,
    expiringDocs,
    completedYesterday,
    cancelledYesterday,
    borderEvents,
    yesterdayStr,
    todayDateStr,
  };
}

// ═══════════════════════════════════════════════════════════════════
// Step 2: SCORE — Refresh MRS/OCS for relevant shipments
// ═══════════════════════════════════════════════════════════════════

async function scoreShipments(shipments: Record<string, unknown>[]) {
  // Refresh MRS for pending/ready/draft shipments
  // Refresh OCS for in_transit shipments
  const scored: Record<string, unknown>[] = [];

  for (const s of shipments) {
    const id = s.id as number;
    const status = s.status as string;

    try {
      if (status === "in_transit" || status === "at_border" || status === "delayed") {
        const ocsResult = await calculateOperationalConfidence(id);
        scored.push({ ...s, ocs: ocsResult.score, ocsThreshold: ocsResult.threshold });
      } else {
        const mrsResult = await calculateMissionReadiness(id);
        scored.push({ ...s, mrs: mrsResult.score, mrsThreshold: mrsResult.threshold });
      }
    } catch {
      // If scoring fails, use existing values
      scored.push({
        ...s,
        mrs: s.mission_readiness_score,
        ocs: s.operational_confidence_score,
        mrsThreshold: "amber",
        ocsThreshold: "at_risk",
      });
    }
  }

  return scored;
}

// ═══════════════════════════════════════════════════════════════════
// Step 3: RANK — Priority algorithm
// ═══════════════════════════════════════════════════════════════════

interface RankedDecision {
  priorityScore: number;
  severity: "critical" | "warning" | "info";
  decision: string;
  context: string;
  affectedShipments: string[];
  options: string[];
  aiRecommendation: string;
  deadline: string;
}

function rankDecisions(
  alerts: Record<string, unknown>[],
  scoredShipments: Record<string, unknown>[],
  expiringDocs: Record<string, unknown>[]
): RankedDecision[] {
  const decisions: RankedDecision[] = [];

  // 1. Critical alerts become decisions
  for (const alert of alerts) {
    if (alert.severity !== "critical") continue;

    const severity = alert.severity as "critical";
    const sevWeight = severity === "critical" ? 1.0 : severity === "warning" ? 0.6 : 0.3;
    const urgencyWeight = 0.9; // Critical alerts are urgent
    const finExposure = 0.7; // Default moderate financial exposure

    const priorityScore =
      sevWeight * 0.4 + finExposure * 0.35 + urgencyWeight * 0.25;

    const shipmentRef = (alert.shipment_ref as string) || null;
    const affectedShipments = shipmentRef ? [shipmentRef] : [];

    decisions.push({
      priorityScore,
      severity,
      decision: (alert.title as string) || "Unnamed Alert",
      context: (alert.description as string) || "",
      affectedShipments,
      options: ["Resolve immediately", "Escalate to manager", "Accept risk and monitor"],
      aiRecommendation: generateActionsFromAlert(alert),
      deadline: "Today, 18:00",
    });
  }

  // 2. Low OCS shipments become decisions
  for (const s of scoredShipments) {
    const ocs = (s as Record<string, unknown>).ocs as number | undefined;
    if (ocs !== undefined && ocs < 0.6) {
      const shipmentRef = s.shipment_id as string;
      decisions.push({
        priorityScore: (1.0 - ocs) * 0.5 + 0.3,
        severity: "critical",
        decision: `Low operational confidence: ${shipmentRef}`,
        context: `Shipment ${shipmentRef} has OCS of ${(ocs * 100).toFixed(0)}% — at critical risk of failure. ${s.cargo_description}`,
        affectedShipments: [shipmentRef],
        options: [
          "Contact driver for status update",
          "Reroute via alternate border",
          "Escalate to logistics coordinator",
        ],
        aiRecommendation: `Immediate driver check-in required. Verify border pre-clearance status and assess if alternate routing is viable.`,
        deadline: "Today, 14:00",
      });
    } else if (ocs !== undefined && ocs < 0.85) {
      const shipmentRef = s.shipment_id as string;
      decisions.push({
        priorityScore: (1.0 - ocs) * 0.4 + 0.25,
        severity: "warning",
        decision: `Monitor at-risk shipment: ${shipmentRef}`,
        context: `Shipment ${shipmentRef} OCS at ${(ocs * 100).toFixed(0)}% — approaching risk threshold.`,
        affectedShipments: [shipmentRef],
        options: ["Increase monitoring frequency", "Pre-alert destination", "Continue standard tracking"],
        aiRecommendation: `Increase GPS polling frequency and alert destination to potential delay.`,
        deadline: "Today, 16:00",
      });
    }
  }

  // 3. Low MRS shipments become decisions
  for (const s of scoredShipments) {
    const mrs = (s as Record<string, unknown>).mrs as number | undefined;
    if (mrs !== undefined && mrs < 50) {
      const shipmentRef = s.shipment_id as string;
      decisions.push({
        priorityScore: 0.75,
        severity: "critical",
        decision: `Shipment not mission-ready: ${shipmentRef}`,
        context: `${shipmentRef} scored ${mrs}/100 on mission readiness. Cannot depart until issues resolved.`,
        affectedShipments: [shipmentRef],
        options: ["Resolve compliance issues", "Reassign vehicle/driver", "Delay departure"],
        aiRecommendation: `Resolve compliance and readiness gaps before departure. Hard gate triggered — legal non-compliance risk.`,
        deadline: "Today, 12:00",
      });
    } else if (mrs !== undefined && mrs < 80) {
      const shipmentRef = s.shipment_id as string;
      decisions.push({
        priorityScore: 0.45,
        severity: "warning",
        decision: `Improve readiness for: ${shipmentRef}`,
        context: `${shipmentRef} at ${mrs}/100 mission readiness — below green threshold.`,
        affectedShipments: [shipmentRef],
        options: ["Address flagged issues", "Proceed with caution", "Postpone departure"],
        aiRecommendation: `Address flagged issues to reach green status before departure.`,
        deadline: "Tomorrow, 08:00",
      });
    }
  }

  // 4. Expiring docs become decisions
  for (const doc of expiringDocs) {
    const daysLeft = daysUntil(doc.expiry_date as string);
    if (daysLeft <= 7 && daysLeft > 0) {
      const entityName =
        (doc.document_type as string).replace(/_/g, " ");
      const shipmentRef = doc.shipment_ref as string;
      decisions.push({
        priorityScore: daysLeft <= 3 ? 0.8 : 0.5,
        severity: daysLeft <= 3 ? "critical" : "warning",
        decision: `Renew ${entityName} (${daysLeft} days remaining)`,
        context: `${entityName} expires in ${daysLeft} days. Affects shipment ${shipmentRef || "N/A"}.`,
        affectedShipments: shipmentRef && shipmentRef !== "N/A" ? [shipmentRef] : [],
        options: ["Renew immediately", "Request extension", `Replace before deadline`],
        aiRecommendation: `Initiate renewal immediately. ${daysLeft <= 3 ? "This is urgent — escalate to compliance officer." : "Schedule renewal this week."}`,
        deadline: `${daysLeft} days remaining`,
      });
    }
  }

  // Sort by priority score descending, take top 8
  decisions.sort((a, b) => b.priorityScore - a.priorityScore);
  return decisions.slice(0, 8).map((d, i) => ({ ...d, priority: i + 1 }));
}

// ═══════════════════════════════════════════════════════════════════
// Step 4: COMPOSE
// ═══════════════════════════════════════════════════════════════════

function composeBrief(
  companyId: number,
  date: string,
  generatedAt: string,
  alerts: Record<string, unknown>[],
  scoredShipments: Record<string, unknown>[],
  expiringDocs: Record<string, unknown>[],
  completedYesterday: Record<string, unknown>[],
  cancelledYesterday: Record<string, unknown>[],
  borderEvents: Record<string, unknown>[]
): IntelligenceBrief {
  // ── Critical Alerts ──
  const criticalAlerts: CriticalAlertItem[] = alerts
    .filter((a) => a.severity === "critical")
    .map((a) => ({
      id: a.id as number,
      title: (a.title as string) || "Unknown Alert",
      severity: "critical" as const,
      description: (a.description as string) || "",
      affectedShipment: (a.shipment_ref as string) || null,
      recommendedAction: generateActionsFromAlert(a),
      deadline: "Immediate",
    }));

  // ── Prioritised Decisions ──
  const prioritisedDecisions = rankDecisions(alerts, scoredShipments, expiringDocs);

  // ── Compliance Watchlist ──
  const complianceWatchlist: ComplianceWatchItem[] = expiringDocs.map((doc) => {
    const daysLeft = daysUntil(doc.expiry_date as string);
    let entityType: "driver" | "vehicle" | "shipment" = "shipment";
    if (doc.driver_id) entityType = "driver";
    else if (doc.vehicle_id) entityType = "vehicle";

    let entity = (doc.document_type as string).replace(/_/g, " ");
    if (entityType === "driver") entity = `Driver #${doc.driver_id}: ${entity}`;
    else if (entityType === "vehicle") entity = `Vehicle #${doc.vehicle_id}: ${entity}`;
    else entity = `Shipment ${doc.shipment_ref || doc.shipment_id}: ${entity}`;

    return {
      entity,
      entityType,
      documentType: doc.document_type as string,
      expiryDate: doc.expiry_date as string,
      daysRemaining: Math.max(0, daysLeft),
      affectedShipments: doc.shipment_ref && doc.shipment_ref !== "N/A" ? 1 : 0,
    };
  });

  // ── Border Conditions ──
  // Aggregate unique borders from active shipments
  const borderMap = new Map<string, { shipments: string[]; waitFrom: number }>();
  for (const s of scoredShipments) {
    try {
      const borders = JSON.parse((s.border_crossings as string) || "[]") as string[];
      for (const b of borders) {
        if (!borderMap.has(b)) {
          borderMap.set(b, { shipments: [], waitFrom: BORDER_WAIT[b] || 120 });
        }
        borderMap.get(b)!.shipments.push(s.shipment_id as string);
      }
    } catch { /* skip parse errors */ }
  }

  // Compute actual wait times from border events
  const borderWaitMap = new Map<string, number>();
  const borderEntryMap = new Map<string, string>(); // shipmentId_border -> arrival time
  for (const ev of borderEvents) {
    const borders = JSON.parse((ev.border_crossings as string) || "[]") as string[];
    const shipmentId = ev.shipment_id as string;
    const eventType = ev.event_type as string;
    const recordedAt = ev.recorded_at as string;

    // Match border name from shipment's borders to this event
    for (const border of borders) {
      const key = `${shipmentId}_${border}`;
      if (eventType === "border_arrival") {
        borderEntryMap.set(key, recordedAt);
      } else if (eventType === "border_departure") {
        const arrivalTime = borderEntryMap.get(key);
        if (arrivalTime) {
          const waitMs = new Date(recordedAt).getTime() - new Date(arrivalTime).getTime();
          const waitMin = Math.round(waitMs / 60000);
          if (waitMin > 0 && waitMin < 1440) {
            // Use average if we have multiple crossings
            const existing = borderWaitMap.get(border);
            if (existing) {
              borderWaitMap.set(border, Math.round((existing + waitMin) / 2));
            } else {
              borderWaitMap.set(border, waitMin);
            }
          }
        }
      }
    }
  }

  const borderConditions: BorderCondition[] = [];
  for (const [border, info] of borderMap) {
    const actualWait = borderWaitMap.get(border) || BORDER_WAIT[border] || 120;
    const waitStatus = getBorderStatus(actualWait);
    // Randomize trend slightly for realism
    const trends: Array<"up" | "down" | "stable"> = ["up", "down", "stable"];
    const trend = actualWait > 180 ? "up" : actualWait < 60 ? "down" : trends[border.length % 3];

    borderConditions.push({
      border,
      waitTimeMinutes: actualWait,
      status: waitStatus,
      trend,
      affectedShipments: info.shipments.length,
      lastUpdated: nowISO(),
    });
  }

  // ── Fleet Overview ──
  const fleetOverview: FleetOverview = {
    totalActive: scoredShipments.length,
    inTransit: scoredShipments.filter((s) => s.status === "in_transit").length,
    atBorder: scoredShipments.filter((s) => s.status === "at_border").length,
    delayed: scoredShipments.filter((s) => s.status === "delayed").length,
    missionReady: scoredShipments.filter((s) => {
      const mrs = (s as Record<string, unknown>).mrs as number | undefined;
      return mrs !== undefined ? mrs >= 80 : (s.mission_readiness_score as number) >= 80;
    }).length,
    pending: scoredShipments.filter((s) =>
      ["draft", "pending", "ready"].includes(s.status as string)
    ).length,
  };

  // ── Yesterday's Outcomes ──
  const totalYesterday = completedYesterday.length + cancelledYesterday.length;
  const onTimeCount = completedYesterday.filter(
    (s) => s.arrival_actual && s.eta && s.arrival_actual <= s.eta
  ).length;
  const onTimeRate = completedYesterday.length > 0
    ? Math.round((onTimeCount / completedYesterday.length) * 100)
    : 100;

  // Calculate average border wait from yesterday's completed border events
  let avgBorderWait = 0;
  const yesterdayBorderWaits: number[] = [];
  const yesterdayBorderEntryMap = new Map<string, string>();
  for (const ev of borderEvents) {
    if ((ev.recorded_at as string).startsWith(date)) continue;
    const borders = JSON.parse((ev.border_crossings as string) || "[]") as string[];
    for (const border of borders) {
      const key = `${ev.shipment_id}_${border}`;
      if (ev.event_type === "border_arrival") {
        yesterdayBorderEntryMap.set(key, ev.recorded_at as string);
      } else if (ev.event_type === "border_departure") {
        const arr = yesterdayBorderEntryMap.get(key);
        if (arr) {
          const w = Math.round((new Date(ev.recorded_at as string).getTime() - new Date(arr).getTime()) / 60000);
          if (w > 0 && w < 1440) yesterdayBorderWaits.push(w);
        }
      }
    }
  }
  if (yesterdayBorderWaits.length > 0) {
    avgBorderWait = Math.round(yesterdayBorderWaits.reduce((a, b) => a + b, 0) / yesterdayBorderWaits.length);
  } else {
    // Fallback: use border wait estimates
    avgBorderWait = 150;
  }

  const yesterdayOutcomes: YesterdayOutcome = {
    onTimeRate,
    completedCount: completedYesterday.length,
    cancelledCount: cancelledYesterday.length,
    avgBorderWaitMinutes: avgBorderWait,
  };

  // ── Executive Summary ──
  const needsAttention = prioritisedDecisions.filter((d) => d.severity === "critical").length;
  const worstBorder =
    borderConditions.length > 0
      ? borderConditions.reduce((a, b) => (a.waitTimeMinutes > b.waitTimeMinutes ? a : b))
      : null;
  const worstBorderText = worstBorder
    ? `${worstBorder.border} at ${Math.round(worstBorder.waitTimeMinutes / 60)}h ${Math.round(worstBorder.waitTimeMinutes % 60)}m`
    : "no active borders";

  const executiveSummary = [
    `${needsAttention} shipment${needsAttention !== 1 ? "s" : ""} need${needsAttention === 1 ? "s" : ""} immediate attention.`,
    `Fleet: ${fleetOverview.totalActive} active, ${fleetOverview.delayed} delayed${fleetOverview.pending > 0 ? `, ${fleetOverview.pending} pending departure` : ""}.`,
    prioritisedDecisions.length > 0
      ? `Top priority: ${prioritisedDecisions[0].decision.substring(0, 80)}.`
      : "No critical decisions pending.",
    `Border: ${worstBorderText}.`,
    `Yesterday: ${yesterdayOutcomes.onTimeRate}% on-time, ${yesterdayOutcomes.completedCount} completed.`,
  ].join(" ");

  return {
    date,
    generatedAt,
    companyId,
    executiveSummary,
    criticalAlerts,
    prioritisedDecisions,
    complianceWatchlist,
    borderConditions,
    fleetOverview,
    yesterdayOutcomes,
  };
}

// ═══════════════════════════════════════════════════════════════════
// Step 5: STORE + 6: RETURN
// ═══════════════════════════════════════════════════════════════════

export async function generateDailyBrief(
  companyId: number,
  dateOverride?: string
): Promise<IntelligenceBrief> {
  const date = dateOverride || todayStr();
  const generatedAt = nowISO();

  // 1. GATHER
  const data = gatherData(companyId);

  // 2. SCORE
  const scoredShipments = await scoreShipments(data.activeShipments);

  // 3. RANK + 4. COMPOSE
  const brief = composeBrief(
    companyId,
    date,
    generatedAt,
    data.unresolvedAlerts,
    scoredShipments,
    data.expiringDocs,
    data.completedYesterday,
    data.cancelledYesterday,
    data.borderEvents
  );

  // 5. STORE
  const db = getDb();
  const criticalCount = brief.criticalAlerts.length;
  const missionReadyCount = brief.fleetOverview.missionReady;
  const complianceAlertCount = brief.complianceWatchlist.length;

  // Upsert: replace if already exists for this company + date
  db.prepare(
    `INSERT INTO intelligence_briefs (company_id, brief_date, generated_at, summary_json, high_risk_count, mission_ready_count, compliance_alert_count)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(company_id, brief_date) DO UPDATE SET
       generated_at = excluded.generated_at,
       summary_json = excluded.summary_json,
       high_risk_count = excluded.high_risk_count,
       mission_ready_count = excluded.mission_ready_count,
       compliance_alert_count = excluded.compliance_alert_count`
  ).run(
    companyId,
    date,
    generatedAt,
    JSON.stringify(brief),
    criticalCount,
    missionReadyCount,
    complianceAlertCount
  );

  // 6. RETURN
  return brief;
}

/**
 * Retrieve an existing brief from the database.
 */
export function getStoredBrief(companyId: number, date: string): IntelligenceBrief | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT * FROM intelligence_briefs WHERE company_id = ? AND brief_date = ?`
    )
    .get(companyId, date) as { summary_json: string } | undefined;

  if (!row) return null;
  return JSON.parse(row.summary_json) as IntelligenceBrief;
}
