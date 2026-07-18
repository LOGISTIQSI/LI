// ── ETA Calculation Engine ──
// Uses Haversine distance, corridor average speeds, and border delay averages
// to compute estimated time of arrival for cross-border mining shipments.

export interface JourneyRisk {
  riskLevel: "low" | "medium" | "high";
  missionReadinessScore: number; // 0–100
  operationalConfidenceScore: number; // probability 0–1
  predictedDelays: string[];
  recommendations: string[];
}

export interface JourneyInput {
  shipmentId: string;
  origin: string;
  destination: string;
  departureTime: string;
  vehicleId: string;
  driverId: string;
}

export interface ETAResult {
  eta: string; // ISO datetime
  confidence_percentage: number; // 0–100
  delay_minutes: number; // positive = behind schedule
  delay_reason: string | null;
  distance_remaining_km: number;
  estimated_speed_kmh: number;
  border_delays_estimated_minutes: number;
}

export interface ETAInput {
  current_lat: number;
  current_lng: number;
  destination_lat: number;
  destination_lng: number;
  scheduled_eta: string; // ISO datetime
  corridors: CorridorSegment[];
  border_crossings: string[]; // border names
}

export interface CorridorSegment {
  name: string;
  avg_speed_kmh: number; // historical average
  distance_km: number;
}

// ── Haversine distance (km) ──
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ── Border delay averages (minutes) ──
const BORDER_DELAYS: Record<string, number> = {
  "Beitbridge": 120,      // notoriously congested
  "Kazungula": 45,         // bridge crossing, usually smooth
  "Kasumbalesa": 90,       // mining corridor, moderate
  "Chirundu": 60,          // moderate
  "Katima Mulilo": 30,     // quiet border
  "Ramatlabama": 40,
  "Lebombo": 55,
  "Nakonde": 75,
  "default": 60,
};

// ── Corridor segment definitions ──
// Key Southern African mining corridor segments with average truck speeds
const CORRIDOR_SEGMENTS: Record<string, CorridorSegment> = {
  // Zambia → South Africa (Copperbelt to Durban)
  "ZM_ZA_T2": { name: "T2 Highway (Zambia)", avg_speed_kmh: 75, distance_km: 600 },
  "ZM_ZA_A8": { name: "A8 Highway (Zimbabwe)", avg_speed_kmh: 72, distance_km: 550 },
  "ZM_ZA_N1": { name: "N1 Highway (South Africa)", avg_speed_kmh: 80, distance_km: 850 },

  // DRC → Namibia (Kolwezi to Walvis Bay)
  "CD_NA_T5": { name: "T5 Highway (Zambia)", avg_speed_kmh: 70, distance_km: 900 },
  "CD_NA_B8": { name: "B8 Highway (Namibia)", avg_speed_kmh: 78, distance_km: 700 },

  // Zimbabwe → South Africa
  "ZW_ZA_A4": { name: "A4 Highway (Zimbabwe)", avg_speed_kmh: 72, distance_km: 350 },
  "ZW_ZA_N1S": { name: "N1 South (South Africa)", avg_speed_kmh: 80, distance_km: 950 },

  // South Africa → DRC (Johannesburg to Lubumbashi)
  "ZA_CD_N1N": { name: "N1 North (South Africa)", avg_speed_kmh: 82, distance_km: 500 },
  "ZA_CD_A1": { name: "A1 Highway (Zimbabwe)", avg_speed_kmh: 72, distance_km: 300 },
  "ZA_CD_T2N": { name: "T2 North (Zambia)", avg_speed_kmh: 70, distance_km: 450 },
};

/**
 * Calculates ETA for a shipment based on current GPS position,
 * distance remaining, corridor average speeds, and border delays.
 */
export function calculateETA(input: ETAInput): ETAResult {
  const {
    current_lat,
    current_lng,
    destination_lat,
    destination_lng,
    scheduled_eta,
    border_crossings,
    corridors,
  } = input;

  // 1. Calculate straight-line distance remaining
  const distanceRemaining = haversineDistance(
    current_lat,
    current_lng,
    destination_lat,
    destination_lng
  );

  // 2. Determine estimated speed (use corridor data or default)
  let estimatedSpeed = corridors.length > 0
    ? corridors.reduce((sum, c) => sum + c.avg_speed_kmh, 0) / corridors.length
    : 70; // default: 70 km/h for highway

  // Clamp speed to realistic range
  estimatedSpeed = Math.max(55, Math.min(85, estimatedSpeed));

  // 3. Calculate border delays
  let borderDelayMinutes = 0;
  const delayReasons: string[] = [];

  for (const border of border_crossings) {
    const delay = BORDER_DELAYS[border] ?? BORDER_DELAYS["default"];
    borderDelayMinutes += delay;
    if (delay >= 90) {
      delayReasons.push(`${border}: ~${delay} min (heavy congestion typical)`);
    } else if (delay >= 60) {
      delayReasons.push(`${border}: ~${delay} min (moderate)`);
    }
  }

  // 4. Calculate drive time (hours)
  const driveTimeHours = distanceRemaining / estimatedSpeed;

  // 5. Total time remaining (hours + border delays)
  const totalTimeHours = driveTimeHours + borderDelayMinutes / 60;

  // 6. Calculate ETA timestamp
  const now = new Date();
  const etaDate = new Date(now.getTime() + totalTimeHours * 3600000);

  // 7. Compare against scheduled ETA
  const scheduledDate = new Date(scheduled_eta);
  const delayMs = etaDate.getTime() - scheduledDate.getTime();
  const delayMinutes = Math.max(0, Math.round(delayMs / 60000));

  // 8. Calculate confidence
  // Confidence decreases with: distance, number of borders, delay minutes
  let confidence = 95;
  // Per 500km over first 500km, lose 2%
  confidence -= Math.max(0, (distanceRemaining - 500) / 500) * 2;
  // Per border over 1, lose 3%
  confidence -= Math.max(0, border_crossings.length - 1) * 3;
  // Per 30min delay, lose 2%
  confidence -= (delayMinutes / 30) * 2;
  // Floor at 30%, cap at 98%
  confidence = Math.max(30, Math.min(98, Math.round(confidence)));

  const delayReason =
    delayMinutes > 0
      ? delayReasons.length > 0
        ? delayReasons.join("; ")
        : "Behind schedule — recalculated ETA exceeds planned arrival"
      : null;

  return {
    eta: etaDate.toISOString(),
    confidence_percentage: confidence,
    delay_minutes: delayMinutes,
    delay_reason: delayReason,
    distance_remaining_km: Math.round(distanceRemaining),
    estimated_speed_kmh: Math.round(estimatedSpeed),
    border_delays_estimated_minutes: borderDelayMinutes,
  };
}

/**
 * Quick ETA calculation for the map (lightweight — no corridor data needed).
 * Uses default assumptions for speed and border delays.
 */
export function quickETA(
  current_lat: number,
  current_lng: number,
  dest_lat: number,
  dest_lng: number,
  border_crossings: string[]
): { eta: string; distance_km: number; delay_minutes: number } {
  const distance = haversineDistance(current_lat, current_lng, dest_lat, dest_lng);

  let borderDelay = 0;
  for (const border of border_crossings) {
    borderDelay += BORDER_DELAYS[border] ?? BORDER_DELAYS["default"];
  }

  const totalHours = distance / 70 + borderDelay / 60;
  const etaDate = new Date(Date.now() + totalHours * 3600000);

  return {
    eta: etaDate.toISOString(),
    distance_km: Math.round(distance),
    delay_minutes: borderDelay,
  };
}

// ── Keep stubs for backward compatibility ──

export async function analyzeJourney(input: JourneyInput): Promise<JourneyRisk> {
  const baselineRisk =
    input.origin.length + input.destination.length > 20 ? "medium" : "low";

  return {
    riskLevel: baselineRisk as JourneyRisk["riskLevel"],
    missionReadinessScore: 87,
    operationalConfidenceScore: 0.94,
    predictedDelays: [
      "Minor congestion expected at departure city outskirts (15 min)",
      "Potential weather slowdown in transit zone B",
    ],
    recommendations: [
      "Departure window: 06:00–07:30 optimal to avoid peak traffic",
      "Consider alternative route via corridor C if weather worsens",
      "Verify driver rest hours compliance before departure",
    ],
  };
}
