/**
 * GPS Simulator — generates realistic GPS movement for demo purposes.
 *
 * Usage:
 *   npx tsx src/lib/gps-simulator.ts          # simulate all active shipments
 *   npm run simulate-gps                       # via npm script
 *
 * Simulates movement along a route at realistic truck speeds:
 *   - Highway: 60-90 km/h
 *   - Near borders: 30-50 km/h
 *   - Random minor delays and route deviations
 *   - Inserts trip_events every ~5 minutes of simulated time
 */

import { getDb } from "./db";

// ── Known border coordinates ──
const BORDERS: { name: string; lat: number; lng: number }[] = [
  { name: "Kazungula", lat: -17.823, lng: 25.147 },
  { name: "Beitbridge", lat: -22.24, lng: 29.99 },
  { name: "Kasumbalesa", lat: -12.346, lng: 27.891 },
  { name: "Chirundu", lat: -16.04, lng: 28.85 },
  { name: "Katima Mulilo", lat: -17.50, lng: 24.27 },
  { name: "Ramatlabama", lat: -25.64, lng: 25.56 },
  { name: "Lebombo", lat: -25.44, lng: 31.99 },
];

// ── Major city/waypoint coordinates ──
const LOCATIONS: Record<string, { lat: number; lng: number }> = {
  // Zambia
  "Solwezi": { lat: -12.1734, lng: 26.3945 },
  "Lusaka": { lat: -15.3875, lng: 28.3228 },
  "Livingstone": { lat: -17.8519, lng: 25.8540 },
  "Chingola": { lat: -12.5419, lng: 27.8546 },
  "Kitwe": { lat: -12.8024, lng: 28.2132 },
  // Zimbabwe
  "Harare": { lat: -17.8252, lng: 31.0335 },
  "Bulawayo": { lat: -20.1325, lng: 28.6265 },
  "Bikita": { lat: -20.1386, lng: 31.4436 },
  "Hwange": { lat: -18.3649, lng: 26.4896 },
  "Beitbridge Town": { lat: -22.2455, lng: 29.9890 },
  // South Africa
  "Johannesburg": { lat: -26.2041, lng: 28.0473 },
  "Durban": { lat: -29.8587, lng: 31.0218 },
  "Pretoria": { lat: -25.7479, lng: 28.2293 },
  "Polokwane": { lat: -23.8962, lng: 29.4486 },
  "Musina": { lat: -22.3758, lng: 30.0325 },
  // DRC
  "Lubumbashi": { lat: -11.6647, lng: 27.4794 },
  "Kolwezi": { lat: -10.7189, lng: 25.4670 },
  // Namibia
  "Walvis Bay": { lat: -22.9576, lng: 14.5053 },
  "Windhoek": { lat: -22.5609, lng: 17.0658 },
  "Katima Mulilo Town": { lat: -17.5043, lng: 24.2751 },
  // Botswana
  "Gaborone": { lat: -24.6282, lng: 25.9231 },
  "Francistown": { lat: -21.1700, lng: 27.5100 },
  // Mozambique
  "Tete": { lat: -16.1570, lng: 33.5867 },
  "Beira": { lat: -19.8333, lng: 34.8500 },
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function fmtDate(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 19);
}

/**
 * Simulate GPS movement for one shipment.
 * Generates trip events at ~5-min intervals for the simulated time window.
 */
function simulateShipment(
  shipmentId: string,
  shipmentDbId: number,
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  borders: string[], // border names along route
  simulatedHours: number
): void {
  const db = getDb();
  const intervalMinutes = 5;
  const totalSteps = Math.floor((simulatedHours * 60) / intervalMinutes);
  const now = new Date();

  let currentLat = startLat;
  let currentLng = startLng;
  let currentTime = new Date(now.getTime() - simulatedHours * 3600000);
  let status: string = "in_transit";
  let approachingBorder = false;

  const insertEvent = db.prepare(`
    INSERT INTO trip_events (shipment_id, event_type, latitude, longitude, speed_kmh, heading, location_description, recorded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Figure out which borders are crossed
  const crossedBorders: { name: string; lat: number; lng: number; crossed: boolean }[] =
    borders.map((name) => {
      const b = BORDERS.find((x) => x.name === name);
      return { name, lat: b?.lat ?? 0, lng: b?.lng ?? 0, crossed: false };
    });

  // Insert departure event
  insertEvent.run(
    shipmentDbId,
    "departed",
    startLat,
    startLng,
    0,
    null,
    `Simulated departure`,
    fmtDate(currentTime)
  );

  let eventsInserted = 0;

  for (let step = 0; step < totalSteps; step++) {
    currentTime = new Date(currentTime.getTime() + intervalMinutes * 60000);

    // Progress toward destination
    const progress = (step + 1) / totalSteps;
    const targetLat = lerp(startLat, endLat, progress);
    const targetLng = lerp(startLng, endLng, progress);

    // Add some randomness (route deviation)
    const jitterLat = randomBetween(-0.02, 0.02);
    const jitterLng = randomBetween(-0.02, 0.02);
    currentLat = targetLat + jitterLat;
    currentLng = targetLng + jitterLng;

    // Determine speed based on proximity to borders
    let speed: number;
    let eventType: string = "en_route";
    let locationDesc = "";

    // Check if near a border
    let atBorder = false;
    for (const border of crossedBorders) {
      if (border.crossed) continue;
      const dist = Math.sqrt(
        Math.pow(currentLat - border.lat, 2) + Math.pow(currentLng - border.lng, 2)
      );
      if (dist < 0.08) {
        atBorder = true;
        if (!approachingBorder) {
          approachingBorder = true;
          eventType = "border_arrival";
          locationDesc = `Approaching ${border.name} border post`;
          speed = randomBetween(5, 15);
        } else if (dist < 0.02) {
          // At border
          const delayChance = Math.random();
          if (delayChance < 0.3) {
            eventType = "delay";
            locationDesc = `${border.name} — customs processing delay`;
            speed = 0;
            status = "delayed";
          } else {
            eventType = "border_departure";
            locationDesc = `${border.name} — cleared`;
            speed = randomBetween(30, 50);
            border.crossed = true;
            approachingBorder = false;
            status = "in_transit";
          }
        } else {
          speed = randomBetween(5, 15);
        }
        break;
      }
    }

    if (!atBorder) {
      approachingBorder = false;
      // Highway speed with randomness
      speed = randomBetween(65, 88);

      // 5% chance of minor delay
      if (Math.random() < 0.05) {
        eventType = "delay";
        locationDesc = "Minor traffic slowdown";
        speed = randomBetween(30, 55);
        status = "delayed";
      } else {
        status = "in_transit";
      }
    }

    // Calculate heading (approximate)
    const heading =
      (Math.atan2(targetLng - currentLng, targetLat - currentLat) * 180) / Math.PI;
    const headingNormalized = ((heading + 360) % 360);

    insertEvent.run(
      shipmentDbId,
      eventType,
      Math.round(currentLat * 10000) / 10000,
      Math.round(currentLng * 10000) / 10000,
      Math.round(speed),
      Math.round(headingNormalized),
      locationDesc || `En route — ${Math.round(progress * 100)}% of journey`,
      fmtDate(currentTime)
    );

    eventsInserted++;
  }

  // Update shipment status and ETA
  const nowStr = fmtDate(now);
  db.prepare(
    "UPDATE shipments SET status = ?, updated_at = ? WHERE id = ?"
  ).run(status, nowStr, shipmentDbId);

  console.log(
    `  [${shipmentId}] ${eventsInserted} events inserted (${totalSteps} steps), final status: ${status}`
  );
}

/**
 * Main entry point — simulate GPS for all active shipments.
 */
export function simulateAllActiveShipments(): void {
  const db = getDb();

  const activeShipments = db
    .prepare(
      `
    SELECT s.id, s.shipment_id, s.origin, s.destination, s.status, s.border_crossings
    FROM shipments s
    WHERE s.status IN ('in_transit', 'at_border', 'delayed', 'ready')
    `
    )
    .all() as {
    id: number;
    shipment_id: string;
    origin: string;
    destination: string;
    status: string;
    border_crossings: string;
  }[];

  if (activeShipments.length === 0) {
    console.log("No active shipments to simulate.");
    return;
  }

  console.log(
    `\n🚛 GPS Simulator — simulating ${activeShipments.length} active shipment(s)\n`
  );

  // Default coordinates for known origins/destinations
  const defaultCoords: Record<string, { lat: number; lng: number }> = {
    "Solwezi, Zambia": LOCATIONS["Solwezi"],
    "Durban, South Africa": LOCATIONS["Durban"],
    "Johannesburg, South Africa": LOCATIONS["Johannesburg"],
    "Lubumbashi, DRC": LOCATIONS["Lubumbashi"],
    "Kolwezi, DRC": LOCATIONS["Kolwezi"],
    "Walvis Bay, Namibia": LOCATIONS["Walvis Bay"],
    "Bikita, Zimbabwe": LOCATIONS["Bikita"],
    "Tete, Mozambique": LOCATIONS["Tete"],
    "Beira, Mozambique": LOCATIONS["Beira"],
  };

  for (const ship of activeShipments) {
    const start = defaultCoords[ship.origin] || LOCATIONS["Lusaka"];
    const end = defaultCoords[ship.destination] || LOCATIONS["Durban"];

    let borders: string[] = [];
    try {
      borders = JSON.parse(ship.border_crossings);
    } catch {
      borders = [];
    }

    // Simulate 12-48 hours of travel
    const simulatedHours = randomBetween(12, 48);

    console.log(`  Simulating ${ship.shipment_id}: ${ship.origin} → ${ship.destination}`);
    simulateShipment(
      ship.shipment_id,
      ship.id,
      start.lat,
      start.lng,
      end.lat,
      end.lng,
      borders,
      simulatedHours
    );
  }

  console.log(`\n✅ GPS simulation complete.\n`);
}

// Allow running directly: npx tsx src/lib/gps-simulator.ts
// Check if this file is being executed directly (not imported)
const isMainModule = process.argv[1]?.includes("gps-simulator");
if (isMainModule) {
  simulateAllActiveShipments();
}
