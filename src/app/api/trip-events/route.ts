import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { calculateOperationalConfidence } from "@/lib/ai/operational-confidence";

// POST — Record a trip event (GPS data point)
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const {
    shipment_id,
    latitude,
    longitude,
    speed_kmh,
    heading,
    event_type = "en_route",
    location_description = "",
  } = body;

  if (!shipment_id || latitude == null || longitude == null) {
    return NextResponse.json(
      { error: "shipment_id, latitude, and longitude are required" },
      { status: 400 }
    );
  }

  // Resolve numeric shipment ID from shipment_id string
  const shipment = db
    .prepare("SELECT id, status FROM shipments WHERE shipment_id = ?")
    .get(shipment_id) as { id: number; status: string } | undefined;

  if (!shipment) {
    return NextResponse.json(
      { error: "Shipment not found" },
      { status: 404 }
    );
  }

  const now = new Date().toISOString().replace("T", " ").slice(0, 19);

  // Insert trip event
  const stmt = db.prepare(`
    INSERT INTO trip_events (shipment_id, event_type, latitude, longitude, speed_kmh, heading, location_description, recorded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    shipment.id,
    event_type,
    latitude,
    longitude,
    speed_kmh ?? null,
    heading ?? null,
    location_description,
    now
  );

  // Auto-detect border proximity and update shipment status if needed
  // Border coordinates: Kazungula (-17.823, 25.147), Beitbridge (-22.24, 29.99),
  // Kasumbalesa (-12.346, 27.891), Chirundu (-16.04, 28.85), Katima Mulilo (-17.50, 24.27)
  const borders: { name: string; lat: number; lng: number }[] = [
    { name: "Kazungula", lat: -17.823, lng: 25.147 },
    { name: "Beitbridge", lat: -22.24, lng: 29.99 },
    { name: "Kasumbalesa", lat: -12.346, lng: 27.891 },
    { name: "Chirundu", lat: -16.04, lng: 28.85 },
    { name: "Katima Mulilo", lat: -17.50, lng: 24.27 },
  ];

  const proximityThreshold = 0.05; // ~5.5km

  for (const border of borders) {
    const dist = Math.sqrt(
      Math.pow(latitude - border.lat, 2) + Math.pow(longitude - border.lng, 2)
    );
    if (dist < proximityThreshold) {
      // Update shipment status to 'at_border' if currently in_transit
      if (shipment.status === "in_transit") {
        db.prepare(
          "UPDATE shipments SET status = 'at_border', updated_at = ? WHERE id = ?"
        ).run(now, shipment.id);

        // Also record a border_arrival event if this is the first border proximity
        const recentBorderEvent = db
          .prepare(
            "SELECT id FROM trip_events WHERE shipment_id = ? AND event_type = 'border_arrival' AND recorded_at > datetime(?, '-30 minutes')"
          )
          .get(shipment.id, now) as { id: number } | undefined;

        if (!recentBorderEvent) {
          db.prepare(`
            INSERT INTO trip_events (shipment_id, event_type, latitude, longitude, location_description, recorded_at)
            VALUES (?, 'border_arrival', ?, ?, ?, ?)
          `).run(shipment.id, latitude, longitude, `Approaching ${border.name} border`, now);
        }
      }
      break;
    }
  }

  // Recalculate Operational Confidence Score after each trip event
  try {
    await calculateOperationalConfidence(shipment.id);
  } catch (err) {
    console.error("Failed to recalculate operational confidence after trip event:", err);
    // Don't fail the request if OCS calculation fails
  }

  const created = db
    .prepare("SELECT * FROM trip_events WHERE id = ?")
    .get(result.lastInsertRowid);

  return NextResponse.json(created, { status: 201 });
}

// GET — Retrieve trip events for a shipment
export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const shipmentIdStr = searchParams.get("shipment_id");
  const limit = parseInt(searchParams.get("limit") || "0", 10);

  if (!shipmentIdStr) {
    return NextResponse.json(
      { error: "shipment_id query parameter is required" },
      { status: 400 }
    );
  }

  // Resolve numeric ID
  const shipment = db
    .prepare("SELECT id FROM shipments WHERE shipment_id = ?")
    .get(shipmentIdStr) as { id: number } | undefined;

  if (!shipment) {
    return NextResponse.json(
      { error: "Shipment not found" },
      { status: 404 }
    );
  }

  let query =
    "SELECT * FROM trip_events WHERE shipment_id = ? ORDER BY recorded_at DESC";
  const params: (number | string)[] = [shipment.id];

  if (limit > 0) {
    query += " LIMIT ?";
    params.push(limit);
  }

  const events = db.prepare(query).all(...params);

  return NextResponse.json(events);
}
