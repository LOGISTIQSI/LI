import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export interface ActiveShipment {
  id: number;
  shipment_id: string;
  status: string;
  origin: string;
  destination: string;
  origin_country: string;
  destination_country: string;
  cargo_type: string;
  departure_scheduled: string;
  departure_actual: string | null;
  eta: string | null;
  mission_readiness_score: number | null;
  operational_confidence_score: number | null;
  // Latest GPS position
  latest_latitude: number | null;
  latest_longitude: number | null;
  latest_speed_kmh: number | null;
  latest_heading: number | null;
  latest_location: string | null;
  latest_recorded_at: string | null;
  // Driver info
  driver_name: string | null;
  driver_phone: string | null;
  // Vehicle info
  vehicle_registration: string | null;
  vehicle_type: string | null;
}

export async function GET() {
  const db = getDb();

  const shipments = db
    .prepare(
      `
    SELECT
      s.id,
      s.shipment_id,
      s.status,
      s.origin,
      s.destination,
      s.origin_country,
      s.destination_country,
      s.cargo_type,
      s.departure_scheduled,
      s.departure_actual,
      s.eta,
      s.mission_readiness_score,
      s.operational_confidence_score,
      te.latitude AS latest_latitude,
      te.longitude AS latest_longitude,
      te.speed_kmh AS latest_speed_kmh,
      te.heading AS latest_heading,
      te.location_description AS latest_location,
      te.recorded_at AS latest_recorded_at,
      u.full_name AS driver_name,
      u.phone AS driver_phone,
      v.registration_number AS vehicle_registration,
      v.vehicle_type
    FROM shipments s
    LEFT JOIN drivers d ON s.driver_id = d.id
    LEFT JOIN users u ON d.user_id = u.id
    LEFT JOIN vehicles v ON s.vehicle_id = v.id
    LEFT JOIN (
      SELECT
        shipment_id,
        latitude,
        longitude,
        speed_kmh,
        heading,
        location_description,
        recorded_at,
        ROW_NUMBER() OVER (PARTITION BY shipment_id ORDER BY recorded_at DESC) AS rn
      FROM trip_events
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    ) te ON s.id = te.shipment_id AND te.rn = 1
    WHERE s.status IN ('in_transit', 'at_border', 'delayed')
    ORDER BY s.departure_scheduled DESC
  `
    )
    .all() as ActiveShipment[];

  return NextResponse.json(shipments);
}
