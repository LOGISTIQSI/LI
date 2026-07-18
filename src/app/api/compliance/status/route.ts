import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { analyzeShipmentCompliance, getRequiredDocuments, checkDocumentExpiry } from "@/lib/ai/compliance";

export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);

  const shipmentId = searchParams.get("shipment_id");
  const driverId = searchParams.get("driver_id");
  const vehicleId = searchParams.get("vehicle_id");

  // ── Shipment compliance ──
  if (shipmentId) {
    const result = await analyzeShipmentCompliance(Number(shipmentId));

    const shipment = await db
      .prepare(
        `SELECT s.*, d.id AS drv_id, v.id AS veh_id
         FROM shipments s
         LEFT JOIN drivers d ON s.driver_id = d.id
         LEFT JOIN vehicles v ON s.vehicle_id = v.id
         WHERE s.id = ?`
      )
      .get(Number(shipmentId)) as Record<string, unknown> | undefined;

    return NextResponse.json({
      ...result,
      entity_type: "shipment",
      entity_id: Number(shipmentId),
      shipment_details: shipment || null,
      required_documents: shipment
        ? getRequiredDocuments({
            origin_country: shipment.origin_country as string,
            destination_country: shipment.destination_country as string,
            is_dangerous_goods: shipment.is_dangerous_goods as number,
          })
        : [],
    });
  }

  // ── Driver compliance ──
  if (driverId) {
    const driver = await db
      .prepare("SELECT * FROM drivers WHERE id = ?")
      .get(Number(driverId)) as Record<string, unknown> | undefined;

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const docs = await db
      .prepare(
        `SELECT * FROM compliance_documents
         WHERE driver_id = ?`
      )
      .all(Number(driverId)) as Array<{
      id: number;
      document_type: string;
      expiry_date: string | null;
      status: string;
    }>;

    const driverFields: { key: string; label: string; date: string | null }[] = [
      { key: "driver_license", label: "Driver License", date: driver.license_expiry as string },
      { key: "pdp", label: "Professional Driving Permit", date: driver.pdp_expiry as string },
      { key: "medical_certificate", label: "Medical Certificate", date: driver.medical_certificate_expiry as string },
      { key: "passport", label: "Passport", date: driver.passport_expiry as string },
    ];
    if (driver.dg_expiry) {
      driverFields.push({ key: "dg_endorsement", label: "DG Endorsement", date: driver.dg_expiry as string });
    }
    if (driver.hiv_cert_expiry) {
      driverFields.push({ key: "hiv_cert", label: "HIV Certificate", date: driver.hiv_cert_expiry as string });
    }

    const fieldChecks = driverFields.map((f) => {
      const check = checkDocumentExpiry({ expiry_date: f.date });
      return { ...f, check };
    });

    const stats = {
      total: docs.length + driverFields.length,
      valid: docs.filter((d) => d.status === "valid").length + fieldChecks.filter((f) => f.check?.status === "valid").length,
      expiring: docs.filter((d) => d.status === "expiring_soon").length + fieldChecks.filter((f) => f.check?.status === "expiring_soon").length,
      expired: docs.filter((d) => d.status === "expired").length + fieldChecks.filter((f) => f.check?.status === "expired").length,
    };

    const penalty = stats.expired * 2 + stats.expiring;
    const maxPenalty = (docs.length + driverFields.length) * 2;
    const score = Math.max(0, Math.round(100 - (penalty / Math.max(maxPenalty, 1)) * 100));

    return NextResponse.json({
      entity_type: "driver",
      entity_id: Number(driverId),
      totalDocs: stats.total,
      validCount: stats.valid,
      expiringCount: stats.expiring,
      expiredCount: stats.expired,
      missingCount: 0,
      complianceScore: score,
      missingDocuments: [],
      driver_fields: fieldChecks.map((fc) => ({
        field: fc.key,
        label: fc.label,
        date: fc.date,
        status: fc.check?.status || "unknown",
        daysRemaining: fc.check?.daysRemaining ?? null,
        severity: fc.check?.severity || "info",
      })),
      documents: docs,
    });
  }

  // ── Vehicle compliance ──
  if (vehicleId) {
    const vehicle = await db
      .prepare("SELECT * FROM vehicles WHERE id = ?")
      .get(Number(vehicleId)) as Record<string, unknown> | undefined;

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const docs = await db
      .prepare(
        `SELECT * FROM compliance_documents
         WHERE vehicle_id = ?`
      )
      .all(Number(vehicleId)) as Array<{
      id: number;
      document_type: string;
      expiry_date: string | null;
      status: string;
    }>;

    const vehicleFields: { key: string; label: string; date: string }[] = [
      { key: "vehicle_registration", label: "Registration", date: vehicle.registration_expiry as string },
      { key: "roadworthiness", label: "Roadworthiness", date: vehicle.roadworthiness_expiry as string },
      { key: "insurance", label: "Insurance", date: vehicle.insurance_expiry as string },
      { key: "cross_border_permit", label: "Cross-Border Permit", date: vehicle.cross_border_permit_expiry as string },
    ];

    const fieldChecks = vehicleFields.map((f) => {
      const check = checkDocumentExpiry({ expiry_date: f.date });
      return { ...f, check };
    });

    const stats = {
      total: docs.length + vehicleFields.length,
      valid: docs.filter((d) => d.status === "valid").length + fieldChecks.filter((f) => f.check?.status === "valid").length,
      expiring: docs.filter((d) => d.status === "expiring_soon").length + fieldChecks.filter((f) => f.check?.status === "expiring_soon").length,
      expired: docs.filter((d) => d.status === "expired").length + fieldChecks.filter((f) => f.check?.status === "expired").length,
    };

    const penalty = stats.expired * 2 + stats.expiring;
    const maxPenalty = (docs.length + vehicleFields.length) * 2;
    const score = Math.max(0, Math.round(100 - (penalty / Math.max(maxPenalty, 1)) * 100));

    return NextResponse.json({
      entity_type: "vehicle",
      entity_id: Number(vehicleId),
      totalDocs: stats.total,
      validCount: stats.valid,
      expiringCount: stats.expiring,
      expiredCount: stats.expired,
      missingCount: 0,
      complianceScore: score,
      missingDocuments: [],
      vehicle_fields: fieldChecks.map((fc) => ({
        field: fc.key,
        label: fc.label,
        date: fc.date,
        status: fc.check?.status || "unknown",
        daysRemaining: fc.check?.daysRemaining ?? null,
        severity: fc.check?.severity || "info",
      })),
      documents: docs,
    });
  }

  return NextResponse.json(
    { error: "Provide shipment_id, driver_id, or vehicle_id as a query parameter" },
    { status: 400 }
  );
}
