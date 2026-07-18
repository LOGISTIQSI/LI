import { getDb } from "@/lib/db";
import { checkDocumentExpiry } from "@/lib/ai/compliance";

/**
 * Scans all compliance_documents and entity expiry fields,
 * updates statuses, and creates/resolves alerts.
 */
export async function updateAllDocumentStatuses(): Promise<{
  documentsUpdated: number;
  documentsExpired: number;
  documentsExpiringSoon: number;
  alertsCreated: number;
  alertsResolved: number;
  driverExpiryIssues: number;
  vehicleExpiryIssues: number;
}> {
  const db = getDb();
  let documentsUpdated = 0;
  let documentsExpired = 0;
  let documentsExpiringSoon = 0;
  let alertsCreated = 0;
  let driverExpiryIssues = 0;
  let vehicleExpiryIssues = 0;

  // ── 1. Scan all compliance_documents ──
  const docs = await db.prepare(
    `SELECT * FROM compliance_documents WHERE expiry_date IS NOT NULL`
  ).all() as Array<{
    id: number;
    document_type: string;
    document_number: string;
    expiry_date: string;
    status: string;
    shipment_id: number | null;
    driver_id: number | null;
    vehicle_id: number | null;
  }>;

  for (const doc of docs) {
    const check = checkDocumentExpiry(doc);
    if (!check) continue;

    let newStatus = doc.status;
    if (check.status === "expired") newStatus = "expired";
    else if (check.status === "expiring_soon") newStatus = "expiring_soon";
    else newStatus = "valid";

    if (newStatus !== doc.status) {
      await db.prepare(
        `UPDATE compliance_documents SET status = $1, updated_at = NOW() WHERE id = $2`
      ).run(newStatus, doc.id);
      documentsUpdated++;
      if (newStatus === "expired") documentsExpired++;
      if (newStatus === "expiring_soon") documentsExpiringSoon++;
    }

    if (check.severity !== "info") {
      const entityCol = doc.shipment_id
        ? "shipment_id"
        : doc.driver_id
          ? "driver_id"
          : "vehicle_id";
      const entityId = doc.shipment_id || doc.driver_id || doc.vehicle_id;
      const title = `${doc.document_type.replace(/_/g, " ")} ${
        check.status === "expired"
          ? "EXPIRED"
          : "expiring in " + check.daysRemaining + " days"
      }`;

      const existing = await db
        .prepare(
          `SELECT id FROM alerts WHERE title = $1 AND is_resolved = 0 AND ${entityCol} = $2 LIMIT 1`
        )
        .get(title, entityId) as { id: number } | undefined;

      if (!existing) {
        await db.prepare(
          `INSERT INTO alerts (${entityCol}, alert_type, severity, title, description)
           VALUES ($1, $2, $3, $4, $5)`
        ).run(
          entityId,
          check.status === "expired" ? "expiry" : "compliance",
          check.severity,
          title,
          `${doc.document_type.replace(/_/g, " ")} document #${doc.document_number} ${
            check.status === "expired"
              ? "has EXPIRED"
              : `expires in ${check.daysRemaining} days`
          }.`
        );
        alertsCreated++;
      }
    }
  }

  // ── 2. Scan driver expiry fields ──
  const drivers = await db.prepare(
    `SELECT id, license_expiry, pdp_expiry, dg_expiry, medical_certificate_expiry,
            passport_expiry, hiv_cert_expiry, status
     FROM drivers WHERE status != 'suspended'`
  ).all() as Array<{
    id: number;
    license_expiry: string;
    pdp_expiry: string;
    dg_expiry: string | null;
    medical_certificate_expiry: string;
    passport_expiry: string;
    hiv_cert_expiry: string | null;
    status: string;
  }>;

  for (const d of drivers) {
    const fields: { field: string; value: string }[] = [
      { field: "driver_license", value: d.license_expiry },
      { field: "pdp", value: d.pdp_expiry },
      { field: "medical_certificate", value: d.medical_certificate_expiry },
      { field: "passport", value: d.passport_expiry },
    ];
    if (d.dg_expiry) fields.push({ field: "dg_endorsement", value: d.dg_expiry });
    if (d.hiv_cert_expiry) fields.push({ field: "hiv_cert", value: d.hiv_cert_expiry });

    for (const { field, value } of fields) {
      const check = checkDocumentExpiry({ expiry_date: value });
      if (check && check.severity !== "info") {
        const title = `Driver ${field.replace(/_/g, " ")} ${
          check.status === "expired"
            ? "EXPIRED"
            : "expiring in " + check.daysRemaining + " days"
        }`;
        const existing = await db
          .prepare(
            `SELECT id FROM alerts WHERE title = $1 AND is_resolved = 0 AND driver_id = $2 LIMIT 1`
          )
          .get(title, d.id) as { id: number } | undefined;

        if (!existing) {
          await db.prepare(
            `INSERT INTO alerts (driver_id, alert_type, severity, title, description)
             VALUES ($1, $2, $3, $4, $5)`
          ).run(
            d.id,
            check.status === "expired" ? "expiry" : "compliance",
            check.severity,
            title,
            `Driver #${d.id} ${field.replace(/_/g, " ")} ${
              check.status === "expired"
                ? "has EXPIRED"
                : `expires in ${check.daysRemaining} days`
            }.`
          );
          driverExpiryIssues++;
        }
      }
    }
  }

  // ── 3. Scan vehicle expiry fields ──
  const vehicles = await db.prepare(
    `SELECT id, registration_expiry, roadworthiness_expiry, insurance_expiry,
            cross_border_permit_expiry, status
     FROM vehicles WHERE status != 'retired'`
  ).all() as Array<{
    id: number;
    registration_expiry: string;
    roadworthiness_expiry: string;
    insurance_expiry: string;
    cross_border_permit_expiry: string;
    status: string;
  }>;

  for (const v of vehicles) {
    const fields: { field: string; value: string }[] = [
      { field: "vehicle_registration", value: v.registration_expiry },
      { field: "roadworthiness", value: v.roadworthiness_expiry },
      { field: "insurance", value: v.insurance_expiry },
      { field: "cross_border_permit", value: v.cross_border_permit_expiry },
    ];

    for (const { field, value } of fields) {
      const check = checkDocumentExpiry({ expiry_date: value });
      if (check && check.severity !== "info") {
        const title = `Vehicle ${field.replace(/_/g, " ")} ${
          check.status === "expired"
            ? "EXPIRED"
            : "expiring in " + check.daysRemaining + " days"
        }`;
        const existing = await db
          .prepare(
            `SELECT id FROM alerts WHERE title = $1 AND is_resolved = 0 AND vehicle_id = $2 LIMIT 1`
          )
          .get(title, v.id) as { id: number } | undefined;

        if (!existing) {
          await db.prepare(
            `INSERT INTO alerts (vehicle_id, alert_type, severity, title, description)
             VALUES ($1, $2, $3, $4, $5)`
          ).run(
            v.id,
            check.status === "expired" ? "expiry" : "compliance",
            check.severity,
            title,
            `Vehicle #${v.id} ${field.replace(/_/g, " ")} ${
              check.status === "expired"
                ? "has EXPIRED"
                : `expires in ${check.daysRemaining} days`
            }.`
          );
          vehicleExpiryIssues++;
        }
      }
    }
  }

  // ── 4. Resolve alerts for documents that became valid ──
  const resolvedAlerts = await db.prepare(
    `UPDATE alerts SET is_resolved = 1, resolved_at = NOW()
     WHERE is_resolved = 0
       AND alert_type IN ('compliance', 'expiry')
       AND id NOT IN (
         SELECT DISTINCT a.id FROM alerts a
         JOIN compliance_documents cd ON
           (a.shipment_id = cd.shipment_id OR a.driver_id = cd.driver_id OR a.vehicle_id = cd.vehicle_id)
         WHERE cd.status IN ('expired', 'expiring_soon')
       )`
  ).run();

  return {
    documentsUpdated,
    documentsExpired,
    documentsExpiringSoon,
    alertsCreated,
    alertsResolved: resolvedAlerts.changes,
    driverExpiryIssues,
    vehicleExpiryIssues,
  };
}
