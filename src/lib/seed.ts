/**
 * LOGISTIQS Intelligence — Comprehensive Demo Seed Script
 *
 * Populates the database with a rich pilot-ready dataset:
 *   - 4 companies (2 mining, 1 logistics, 1 transporter)
 *   - 10 drivers (realistic Southern African names, mixed statuses)
 *   - 8 vehicles (mixed makes, plates, DG capability)
 *   - 12 shipments (all statuses, realistic corridors)
 *   - 35+ compliance documents (various statuses and types)
 *   - 50+ trip events (realistic GPS along mining corridors)
 *   - Runs AI engines to populate MRS, OCS, alerts, and daily brief
 */

import { getDb } from "./db";
import { analyzeShipmentCompliance } from "./ai/compliance";
import { calculateMissionReadiness } from "./ai/mission-readiness";
import { calculateOperationalConfidence } from "./ai/operational-confidence";
import { updateAllDocumentStatuses } from "./expiry-updater";
import { generateDailyBrief } from "./ai/executive";

async function main() {
const db = getDb();

// ── Clean existing data ──
db.exec(`
  DELETE FROM trip_events;
  DELETE FROM alerts;
  DELETE FROM compliance_documents;
  DELETE FROM intelligence_briefs;
  DELETE FROM shipments;
  DELETE FROM vehicles;
  DELETE FROM drivers;
  DELETE FROM users;
  DELETE FROM companies;
`);

function fmtDate(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 19);
}
function fmtDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const now = new Date();

// ═══════════════════════════════════════════════════════════════════════
// 1. COMPANIES (4)
// ═══════════════════════════════════════════════════════════════════════

const insertCompany = db.prepare(`
  INSERT INTO companies (name, type, email, phone, country, registration_number, tax_id)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const c1 = insertCompany.run(
  "Kalahari Copper Mining Ltd",
  "mining",
  "ops@kcm.co.bw",
  "+267 391 4000",
  "Botswana",
  "BW-2018-004732",
  "TAX-BW-88291"
);

const c2 = insertCompany.run(
  "Zambezi Mineral Exports Ltd",
  "mining",
  "exports@zambeziminerals.co.zm",
  "+260 211 257 900",
  "Zambia",
  "ZM-2015-009144",
  "TAX-ZM-445019"
);

const c3 = insertCompany.run(
  "Cross-Border Logistics SA",
  "logistics",
  "dispatch@cbl-sa.co.za",
  "+27 11 468 5500",
  "South Africa",
  "ZA-2015-128934",
  "TAX-ZA-4456728"
);

const c4 = insertCompany.run(
  "Southern Corridor Transport",
  "transporter",
  "fleet@southerncorridor.co.za",
  "+27 14 591 2200",
  "South Africa",
  "ZA-2013-056218",
  "TAX-ZA-3019477"
);

console.log(`\n✅ Inserted 4 companies`);
console.log(`   c1 (mining): Kalahari Copper Mining Ltd → id=${c1.lastInsertRowid}`);
console.log(`   c2 (mining): Zambezi Mineral Exports Ltd → id=${c2.lastInsertRowid}`);
console.log(`   c3 (logistics): Cross-Border Logistics SA → id=${c3.lastInsertRowid}`);
console.log(`   c4 (transporter): Southern Corridor Transport → id=${c4.lastInsertRowid}`);

// ═══════════════════════════════════════════════════════════════════════
// 2. DRIVERS (10) — belong to transporter (c4)
// ═══════════════════════════════════════════════════════════════════════

const insertDriver = db.prepare(`
  INSERT INTO drivers (
    company_id, license_number, license_type, license_expiry,
    pdp_number, pdp_expiry, dg_endorsement, dg_expiry,
    medical_certificate_expiry, passport_number, passport_expiry,
    yellow_fever_cert, hiv_cert_expiry, status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const driverData: Array<unknown[]> = [
  // 0: Thabo Molefe — South African, available, DG endorsed
  [c4.lastInsertRowid, "EC-8874521", "EC", "2027-08-15",
   "PDP-44829", "2027-06-30", 1, "2027-06-30",
   "2026-12-15", "A08397211", "2029-03-22",
   1, null, "available"],
  // 1: Shingai Mutasa — Zimbabwean, available
  [c4.lastInsertRowid, "ZW-CLASS2-55912", "Class 2", "2028-01-10",
   "PDP-ZW-77331", "2027-11-20", 0, null,
   "2026-10-05", "FN440912", "2028-07-14",
   1, "2027-02-10", "available"],
  // 2: Maria Ndlovu — South African, available, DG endorsed
  [c4.lastInsertRowid, "EC-6671390", "EC", "2029-04-22",
   "PDP-55021", "2028-02-15", 1, "2028-02-15",
   "2027-03-30", "M07465823", "2030-11-05",
   1, null, "available"],
  // 3: Chanda Banda — Zambian, on_trip
  [c4.lastInsertRowid, "ZM-HGV-33478", "HGV", "2027-09-01",
   "PDP-ZM-22109", "2026-12-31", 0, null,
   "2026-08-20", "ZB339104", "2028-05-19",
   1, "2026-10-12", "on_trip"],
  // 4: Pieter van der Merwe — Namibian, off_duty
  [c4.lastInsertRowid, "NA-CE-88123", "CE", "2026-11-30",
   "PDP-NA-10045", "2026-09-15", 1, "2026-09-15",
   "2026-07-18", "P1928374N", "2029-01-08",
   1, null, "off_duty"],
  // 5: Blessing Dlamini — South African, available
  [c4.lastInsertRowid, "EC-5593021", "EC", "2028-06-17",
   "PDP-71662", "2027-08-09", 0, null,
   "2027-01-22", "BD5593021", "2029-09-30",
   1, "2027-05-14", "available"],
  // 6: Tendai Chikomo — Zimbabwean, on_trip
  [c4.lastInsertRowid, "ZW-CLASS1-88021", "Class 1", "2027-03-05",
   "PDP-ZW-88903", "2027-01-15", 0, null,
   (() => { const d = new Date(now); d.setDate(d.getDate() + 9); return fmtDateOnly(d); })(),
   "TC880210Z", "2029-02-11",
   1, "2027-08-03", "on_trip"],
  // 7: Grace Phiri — Zambian, available (PDP expiring soon)
  [c4.lastInsertRowid, "ZM-HGV-55821", "HGV", "2028-11-08",
   (() => { const d = new Date(now); d.setDate(d.getDate() + 12); return fmtDateOnly(d); })(), "PDP-ZM-33509", 0, null,
   "2027-04-10", "GP558210Z", "2028-12-15",
   1, "2027-01-30", "available"],
  // 8: David Botha — South African, on_trip
  [c4.lastInsertRowid, "EC-2291045", "EC", "2028-02-28",
   "PDP-99830", "2027-05-18", 0, null,
   (() => { const d = new Date(now); d.setDate(d.getDate() + 7); return fmtDateOnly(d); })(),
   "DB2291045", "2030-04-01",
   1, null, "on_trip"],
  // 9: Kabelo Sechele — Motswana, available
  [c4.lastInsertRowid, "BW-HGV-33721", "HGV", "2029-01-19",
   "PDP-BW-20194", "2028-03-27", 0, null,
   "2027-06-15", "KS337210B", "2029-07-22",
   1, "2027-09-05", "available"],
];

const driverIds: number[] = [];
for (const d of driverData) {
  const result = insertDriver.run(...d);
  driverIds.push(Number(result.lastInsertRowid));
}

console.log(`\n✅ Inserted ${driverIds.length} drivers`);
console.log(`   IDs: ${driverIds.join(", ")}`);
console.log(`   DG endorsed: driver ${driverIds[0]}, ${driverIds[2]}, ${driverIds[4]}`);
console.log(`   Statuses: 6 available, 3 on_trip, 1 off_duty`);

// ═══════════════════════════════════════════════════════════════════════
// 3. VEHICLES (8) — belong to transporter (c4)
// ═══════════════════════════════════════════════════════════════════════

const insertVehicle = db.prepare(`
  INSERT INTO vehicles (
    company_id, registration_number, vehicle_type, make, model, year,
    vin, gvm, max_payload, registration_expiry, roadworthiness_expiry,
    insurance_type, insurance_expiry, cross_border_permit_number,
    cross_border_permit_expiry, is_dg_capable, status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const vehicleData: Array<unknown[]> = [
  // 0: ZA horse & trailer — available
  [c4.lastInsertRowid, "ZA-GP-NRT882", "Horse & Trailer", "MAN", "TGX 26.480", 2022,
   "VIN-WMA06SZZ1BP022881", 56000, 34000,
   "2027-05-10", "2027-05-10",
   "comprehensive", "2027-05-10", "CBP-ZA-2024-88330",
   "2027-05-10", 0, "available"],
  // 1: ZM flatbed — on_trip
  [c4.lastInsertRowid, "ZM-ACB-4421", "Flatbed Truck", "Scania", "R580", 2021,
   "VIN-YS2S6X20002155442", 44000, 28000,
   "2027-11-25", "2027-11-25",
   "comprehensive", "2027-11-25", "CBP-ZM-2024-11092",
   "2027-11-25", 0, "on_trip"],
  // 2: ZW tanker DG — available
  [c4.lastInsertRowid, "ZW-AFE-774", "Tanker", "Volvo", "FH 540", 2023,
   "VIN-YV2RTY0C7EB779104", 48000, 30000,
   "2028-02-14", "2028-02-14",
   "comprehensive", "2028-02-14", "CBP-ZW-2024-55890",
   "2028-02-14", 1, "available"],
  // 3: ZA lowbed — maintenance
  [c4.lastInsertRowid, "ZA-WP-MEQ554", "Lowbed", "Mercedes-Benz", "Actros 3358", 2020,
   "VIN-WDB9634031L930228", 60000, 42000,
   "2026-12-01", "2026-12-01",
   "comprehensive", "2026-12-01", "CBP-ZA-2024-44120",
   "2026-12-01", 0, "maintenance"],
  // 4: ZM tipper DG — available
  [c4.lastInsertRowid, "ZM-BAE-9910", "Tipper Truck", "FAW", "JH6 460", 2024,
   "VIN-LFWJR9PEXNA001882", 35000, 22000,
   "2029-03-08", (() => { const d = new Date(now); d.setDate(d.getDate() + 10); return fmtDateOnly(d); })(),
   "comprehensive", "2029-03-08", "CBP-ZM-2024-33217",
   "2029-03-08", 1, "available"],
  // 5: ZA flatbed — on_trip
  [c4.lastInsertRowid, "ZA-FS-LLX447", "Flatbed Truck", "Volvo", "FH16 750", 2024,
   "VIN-YV2RTY0D2RA112558", 52000, 32000,
   (() => { const d = new Date(now); d.setDate(d.getDate() + 14); return fmtDateOnly(d); })(), "2028-08-20",
   "comprehensive", "2028-08-20", "CBP-ZA-2024-66110",
   "2028-08-20", 0, "on_trip"],
  // 6: BW flatbed DG — available
  [c4.lastInsertRowid, "BW-B-8841-F", "Flatbed Truck", "Scania", "R660", 2023,
   "VIN-YS2R6X40002188340", 46000, 30000,
   "2028-06-15", "2028-06-15",
   "comprehensive", (() => { const d = new Date(now); d.setDate(d.getDate() + 11); return fmtDateOnly(d); })(), "CBP-BW-2024-22510",
   "2028-06-15", 1, "available"],
  // 7: ZA horse & trailer — available
  [c4.lastInsertRowid, "ZA-MP-RRT339", "Horse & Trailer", "MAN", "TGX 33.540", 2024,
   "VIN-WMA30SZZ9RP033992", 58000, 35000,
   "2028-11-30", "2028-11-30",
   "comprehensive", "2028-11-30", "CBP-ZA-2024-99340",
   "2028-11-30", 0, "available"],
];

const vehicleIds: number[] = [];
for (const v of vehicleData) {
  const result = insertVehicle.run(...v);
  vehicleIds.push(Number(result.lastInsertRowid));
}

console.log(`\n✅ Inserted ${vehicleIds.length} vehicles`);
console.log(`   IDs: ${vehicleIds.join(", ")}`);
console.log(`   Plates: ZA-GP-NRT882, ZM-ACB-4421, ZW-AFE-774, ZA-WP-MEQ554, ZM-BAE-9910, ZA-FS-LLX447, BW-B-8841-F, ZA-MP-RRT339`);
console.log(`   DG capable: vehicle ${vehicleIds[2]}, ${vehicleIds[4]}, ${vehicleIds[6]}`);
console.log(`   Statuses: 5 available, 2 on_trip, 1 maintenance`);

// ═══════════════════════════════════════════════════════════════════════
// 4. SHIPMENTS (12) — various corridors, statuses
// ═══════════════════════════════════════════════════════════════════════

const insertShipment = db.prepare(`
  INSERT INTO shipments (
    shipment_id, company_id, logistics_company_id, driver_id, vehicle_id,
    origin, destination, origin_country, destination_country,
    cargo_type, cargo_description, cargo_hs_code, cargo_value, cargo_weight_kg,
    is_dangerous_goods, dg_class, border_crossings, status,
    departure_scheduled, departure_actual, eta, arrival_actual,
    mission_readiness_score, readiness_calculated_at,
    operational_confidence_score, confidence_calculated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const yyyy = now.getFullYear();

// Helper to make ISO-like datetime strings
function dt(offsetDays: number, offsetHours = 0): string {
  const d = new Date(now.getTime() + offsetDays * 86400000 + offsetHours * 3600000);
  return fmtDate(d);
}

const shipmentDefs = [
  // ── S1: in_transit — Copper Cathode from Solwezi, ZM → Durban, ZA (Kalahari Copper)
  {
    sid: `SHIP-${yyyy}-00001`, company: c1, logistics: c3, driver: driverIds[0], vehicle: vehicleIds[0],
    origin: "Solwezi, Zambia", dest: "Durban, South Africa", origC: "ZM", destC: "ZA",
    cargo: "Copper Cathode", desc: "Grade A copper cathode sheets, 99.99% purity, packed on pallets",
    hs: "7403.11", value: 12500000, weight: 28000, dg: 0, dgClass: null,
    borders: ["Kazungula", "Beitbridge"], status: "in_transit",
    sched: dt(-2), actual: dt(-2), eta: dt(3), arrival: null,
    mrs: 85, mrsCalc: dt(-3), ocs: 0.92, ocsCalc: dt(-3),
  },
  // ── S2: ready — Mining Equipment JHB → Lubumbashi (Kalahari Copper)
  {
    sid: `SHIP-${yyyy}-00002`, company: c1, logistics: c3, driver: driverIds[5], vehicle: vehicleIds[3],
    origin: "Johannesburg, South Africa", dest: "Lubumbashi, DRC", origC: "ZA", destC: "CD",
    cargo: "Mining Equipment", desc: "CAT 777E dump truck components — engine, transmission, axles",
    hs: "8431.49", value: 48000000, weight: 38000, dg: 0, dgClass: null,
    borders: ["Beitbridge", "Chirundu", "Kasumbalesa"], status: "ready",
    sched: dt(2), actual: null, eta: dt(8), arrival: null,
    mrs: 72, mrsCalc: dt(-1), ocs: null, ocsCalc: null,
  },
  // ── S3: in_transit — Cobalt from Kolwezi → Walvis Bay (Zambezi Mineral Exports)
  {
    sid: `SHIP-${yyyy}-00003`, company: c2, logistics: c3, driver: driverIds[6], vehicle: vehicleIds[1],
    origin: "Kolwezi, DRC", dest: "Walvis Bay, Namibia", origC: "CD", destC: "NA",
    cargo: "Cobalt Hydroxide", desc: "Bulk cobalt hydroxide filter cake in 2-ton bulk bags",
    hs: "2822.00", value: 38500000, weight: 24000, dg: 1, dgClass: "9",
    borders: ["Kasumbalesa", "Katima Mulilo"], status: "in_transit",
    sched: dt(-3), actual: dt(-3), eta: dt(2), arrival: null,
    mrs: 68, mrsCalc: dt(-4), ocs: 0.71, ocsCalc: dt(-4),
  },
  // ── S4: completed — Lithium ore Bikita → Durban (Kalahari Copper)
  {
    sid: `SHIP-${yyyy}-00004`, company: c1, logistics: c3, driver: driverIds[1], vehicle: vehicleIds[7],
    origin: "Bikita, Zimbabwe", dest: "Durban, South Africa", origC: "ZW", destC: "ZA",
    cargo: "Lithium Ore", desc: "Spodumene concentrate 6% Li2O, bulk in containers",
    hs: "2530.90", value: 8200000, weight: 32000, dg: 0, dgClass: null,
    borders: ["Beitbridge"], status: "completed",
    sched: dt(-10), actual: dt(-10), eta: dt(-5), arrival: dt(-5),
    mrs: 91, mrsCalc: dt(-11), ocs: null, ocsCalc: null,
  },
  // ── S5: draft — Coal Tete → Beira (Zambezi Mineral Exports)
  {
    sid: `SHIP-${yyyy}-00005`, company: c2, logistics: c3, driver: null, vehicle: null,
    origin: "Tete, Mozambique", dest: "Beira, Mozambique", origC: "MZ", destC: "MZ",
    cargo: "Coal", desc: "Thermal coal, 5500 kcal/kg, loose bulk",
    hs: "2701.12", value: 3500000, weight: 34000, dg: 0, dgClass: null,
    borders: [], status: "draft",
    sched: dt(3), actual: null, eta: dt(4), arrival: null,
    mrs: null, mrsCalc: null, ocs: null, ocsCalc: null,
  },
  // ── S6: at_border — Copper Kitwe → Walvis Bay (Zambezi Mineral Exports) at Katima Mulilo
  {
    sid: `SHIP-${yyyy}-00006`, company: c2, logistics: c3, driver: driverIds[3], vehicle: vehicleIds[4],
    origin: "Kitwe, Zambia", dest: "Walvis Bay, Namibia", origC: "ZM", destC: "NA",
    cargo: "Copper Concentrate", desc: "Copper concentrate 28% Cu, bulk in containers",
    hs: "2603.00", value: 15600000, weight: 26000, dg: 0, dgClass: null,
    borders: ["Katima Mulilo"], status: "at_border",
    sched: dt(-3), actual: dt(-3), eta: dt(1), arrival: null,
    mrs: 76, mrsCalc: dt(-4), ocs: 0.65, ocsCalc: dt(-2),
  },
  // ── S7: delayed — Uranium Windhoek → Cape Town (Kalahari Copper)
  {
    sid: `SHIP-${yyyy}-00007`, company: c1, logistics: c3, driver: driverIds[8], vehicle: vehicleIds[5],
    origin: "Windhoek, Namibia", dest: "Cape Town, South Africa", origC: "NA", destC: "ZA",
    cargo: "Uranium Oxide", desc: "Yellowcake (U3O8) in sealed 200L drums, ADR Class 7",
    hs: "2612.10", value: 72000000, weight: 18000, dg: 1, dgClass: "7",
    borders: ["Ramatlabama"], status: "delayed",
    sched: dt(-2), actual: dt(-2), eta: dt(1), arrival: null,
    mrs: 52, mrsCalc: dt(-3), ocs: 0.48, ocsCalc: dt(-1),
  },
  // ── S8: pending — Lithium Harare → Beira (Zambezi Mineral Exports)
  {
    sid: `SHIP-${yyyy}-00008`, company: c2, logistics: c3, driver: driverIds[7], vehicle: vehicleIds[6],
    origin: "Harare, Zimbabwe", dest: "Beira, Mozambique", origC: "ZW", destC: "MZ",
    cargo: "Lithium Concentrate", desc: "Spodumene concentrate 5.8% Li2O, containerised",
    hs: "2530.90", value: 9800000, weight: 30000, dg: 0, dgClass: null,
    borders: ["Lebombo"], status: "pending",
    sched: dt(1), actual: null, eta: dt(4), arrival: null,
    mrs: null, mrsCalc: null, ocs: null, ocsCalc: null,
  },
  // ── S9: draft — Diamonds Francistown → Johannesburg (Kalahari Copper)
  {
    sid: `SHIP-${yyyy}-00009`, company: c1, logistics: c3, driver: null, vehicle: null,
    origin: "Francistown, Botswana", dest: "Johannesburg, South Africa", origC: "BW", destC: "ZA",
    cargo: "Rough Diamonds", desc: "Uncut rough diamonds, Kimberley Process certified, secure transport",
    hs: "7102.10", value: 150000000, weight: 120, dg: 0, dgClass: null,
    borders: ["Ramatlabama"], status: "draft",
    sched: dt(4), actual: null, eta: dt(5), arrival: null,
    mrs: null, mrsCalc: null, ocs: null, ocsCalc: null,
  },
  // ── S10: ready — Copper Chingola → Durban (Kalahari Copper)
  {
    sid: `SHIP-${yyyy}-00010`, company: c1, logistics: c3, driver: driverIds[9], vehicle: vehicleIds[2],
    origin: "Chingola, Zambia", dest: "Durban, South Africa", origC: "ZM", destC: "ZA",
    cargo: "Copper Anodes", desc: "Cast copper anodes 99.6% purity, palletised for export",
    hs: "7402.00", value: 21000000, weight: 30000, dg: 0, dgClass: null,
    borders: ["Kazungula", "Beitbridge"], status: "ready",
    sched: dt(2), actual: null, eta: dt(7), arrival: null,
    mrs: 88, mrsCalc: dt(-1), ocs: null, ocsCalc: null,
  },
  // ── S11: cancelled — Equipment Lusaka → Dar es Salaam (Zambezi Mineral Exports)
  {
    sid: `SHIP-${yyyy}-00011`, company: c2, logistics: c3, driver: null, vehicle: null,
    origin: "Lusaka, Zambia", dest: "Dar es Salaam, Tanzania", origC: "ZM", destC: "TZ",
    cargo: "Mining Machinery", desc: "Excavator components and hydraulic systems for copper mine",
    hs: "8429.52", value: 32000000, weight: 35000, dg: 0, dgClass: null,
    borders: ["Nakonde"], status: "cancelled",
    sched: dt(-1), actual: null, eta: dt(4), arrival: null,
    mrs: 34, mrsCalc: dt(-2), ocs: null, ocsCalc: null,
  },
  // ── S12: in_transit — Copper Lusaka → Durban (Kalahari Copper)
  {
    sid: `SHIP-${yyyy}-00012`, company: c1, logistics: c3, driver: driverIds[0], vehicle: vehicleIds[0],
    origin: "Lusaka, Zambia", dest: "Durban, South Africa", origC: "ZM", destC: "ZA",
    cargo: "Copper Wire Rod", desc: "8mm copper wire rod coils, 99.9% purity, export quality",
    hs: "7408.11", value: 18500000, weight: 25000, dg: 0, dgClass: null,
    borders: ["Kazungula", "Beitbridge"], status: "in_transit",
    sched: dt(-1), actual: dt(-1), eta: dt(4), arrival: null,
    mrs: 90, mrsCalc: dt(-2), ocs: 0.88, ocsCalc: dt(-2),
  },
];

const shipmentIds: number[] = [];
const shipmentRefs: Record<string, { dbId: number; shippingCompany: number }> = {};

for (const s of shipmentDefs) {
  const result = insertShipment.run(
    s.sid, s.company.lastInsertRowid, s.logistics.lastInsertRowid,
    s.driver, s.vehicle,
    s.origin, s.dest, s.origC, s.destC,
    s.cargo, s.desc, s.hs, s.value, s.weight,
    s.dg, s.dgClass,
    JSON.stringify(s.borders), s.status,
    s.sched, s.actual, s.eta, s.arrival,
    s.mrs, s.mrsCalc, s.ocs, s.ocsCalc
  );
  const dbId = Number(result.lastInsertRowid);
  shipmentIds.push(dbId);
  shipmentRefs[s.sid] = { dbId, shippingCompany: Number(s.company.lastInsertRowid) };
}

console.log(`\n✅ Inserted ${shipmentIds.length} shipments`);
console.log(`   Statuses: 2 draft (S5,S9), 1 pending (S8), 2 ready (S2,S10), 3 in_transit (S1,S3,S12), 1 at_border (S6), 1 delayed (S7), 1 completed (S4), 1 cancelled (S11)`);

// ═══════════════════════════════════════════════════════════════════════
// 5. COMPLIANCE DOCUMENTS (35+)
// ═══════════════════════════════════════════════════════════════════════

const insertDoc = db.prepare(`
  INSERT INTO compliance_documents (
    shipment_id, driver_id, vehicle_id, document_type, document_number,
    document_file_path, issuing_authority, issued_date, expiry_date, status, ai_verified, ai_notes
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Helper to create a date relative to now
function relDate(days: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return fmtDateOnly(d);
}

function pastDate(daysAgo: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  return fmtDateOnly(d);
}

const docDefs: Array<{
  sid: string | null; drvIdx: number | null; vehIdx: number | null;
  type: string; number: string; path: string | null;
  authority: string; issued: string; expiry: string | null;
  status: string; verified: number; notes: string | null;
}> = [
  // ══ S1 (in_transit): Copper Solwezi → Durban ══
  { sid: "SHIP-2026-00001", drvIdx: 0, vehIdx: 0, type: "driver_license", number: "EC-8874521", path: "/docs/EC-8874521.pdf", authority: "RSA Dept of Transport", issued: "2022-08-15", expiry: "2027-08-15", status: "valid", verified: 1, notes: "Verified against RSA eNaTIS" },
  { sid: "SHIP-2026-00001", drvIdx: 0, vehIdx: null, type: "pdp", number: "PDP-44829", path: "/docs/PDP-44829.pdf", authority: "RSA Dept of Transport", issued: "2025-06-30", expiry: "2027-06-30", status: "valid", verified: 1, notes: null },
  { sid: "SHIP-2026-00001", drvIdx: null, vehIdx: 0, type: "vehicle_registration", number: "ZA-GP-NRT882", path: "/docs/ZA-GP-NRT882-reg.pdf", authority: "RSA eNaTIS", issued: "2026-05-10", expiry: "2027-05-10", status: "valid", verified: 1, notes: null },
  { sid: "SHIP-2026-00001", drvIdx: null, vehIdx: 0, type: "cross_border_permit", number: "CBP-ZA-2024-88330", path: "/docs/CBP-ZA-2024-88330.pdf", authority: "SADC Cross Border Transport Agency", issued: "2026-05-10", expiry: "2027-05-10", status: "valid", verified: 1, notes: null },
  { sid: "SHIP-2026-00001", drvIdx: null, vehIdx: null, type: "export_permit", number: "ZM-EXP-2026-04421", path: "/docs/ZM-EXP-2026-04421.pdf", authority: "Zambia Revenue Authority", issued: pastDate(5), expiry: relDate(60), status: "valid", verified: 1, notes: "Copper cathode export, pre-cleared" },
  { sid: "SHIP-2026-00001", drvIdx: null, vehIdx: null, type: "certificate_of_origin", number: "COO-ZM-2026-88102", path: "/docs/COO-ZM-88102.pdf", authority: "Zambia Chamber of Mines", issued: pastDate(3), expiry: null, status: "valid", verified: 1, notes: null },
  { sid: "SHIP-2026-00001", drvIdx: null, vehIdx: null, type: "customs_declaration", number: "SAD500-ZM-990112", path: "/docs/SAD500-ZM-990112.pdf", authority: "Zambia Revenue Authority", issued: pastDate(2), expiry: null, status: "valid", verified: 1, notes: "Electronic SAD 500 lodged" },
  { sid: "SHIP-2026-00001", drvIdx: null, vehIdx: null, type: "bill_of_lading", number: "BOL-ZM-DBN-2026-3221", path: "/docs/BOL-3221.pdf", authority: "Cross-Border Logistics SA", issued: pastDate(2), expiry: null, status: "valid", verified: 1, notes: null },
  { sid: "SHIP-2026-00001", drvIdx: null, vehIdx: null, type: "commercial_invoice", number: "INV-KCM-2026-00991", path: "/docs/INV-00991.pdf", authority: "Kalahari Copper Mining", issued: pastDate(3), expiry: null, status: "valid", verified: 1, notes: "USD 125,000 declared value" },

  // ══ S3 (in_transit): Cobalt Kolwezi → Walvis Bay ══
  { sid: "SHIP-2026-00003", drvIdx: 6, vehIdx: null, type: "driver_license", number: "ZW-CLASS1-88021", path: "/docs/ZW-CLASS1-88021.pdf", authority: "Zimbabwe CVR", issued: "2024-03-05", expiry: "2027-03-05", status: "valid", verified: 1, notes: null },
  { sid: "SHIP-2026-00003", drvIdx: 6, vehIdx: null, type: "pdp", number: "PDP-ZW-88903", path: "/docs/PDP-ZW-88903.pdf", authority: "Zimbabwe Ministry of Transport", issued: "2025-01-15", expiry: "2027-01-15", status: "valid", verified: 1, notes: null },
  { sid: "SHIP-2026-00003", drvIdx: null, vehIdx: 1, type: "vehicle_registration", number: "ZM-ACB-4421", path: "/docs/ZM-ACB-4421.pdf", authority: "Zambia RTSA", issued: "2025-11-25", expiry: "2027-11-25", status: "valid", verified: 1, notes: null },
  { sid: "SHIP-2026-00003", drvIdx: null, vehIdx: 1, type: "insurance", number: "INS-ZM-2025-4410", path: "/docs/INS-ZM-4410.pdf", authority: "Madison Insurance Zambia", issued: "2025-11-25", expiry: "2027-11-25", status: "valid", verified: 1, notes: null },
  { sid: "SHIP-2026-00003", drvIdx: null, vehIdx: null, type: "dg_declaration", number: "DG-ZM-2026-44220", path: null, authority: "Zambia Environmental Management Agency", issued: pastDate(3), expiry: relDate(90), status: "under_review", verified: 0, notes: "DG Class 9 declaration being re-verified at Kasumbalesa" },
  { sid: "SHIP-2026-00003", drvIdx: null, vehIdx: null, type: "export_permit", number: "CD-EXP-2026-77192", path: "/docs/CD-EXP-77192.pdf", authority: "DRC Direction Générale des Douanes", issued: pastDate(5), expiry: relDate(30), status: "valid", verified: 1, notes: null },
  { sid: "SHIP-2026-00003", drvIdx: null, vehIdx: null, type: "certificate_of_origin", number: "COO-CD-2026-55103", path: "/docs/COO-CD-55103.pdf", authority: "DRC Chamber of Mines", issued: pastDate(4), expiry: null, status: "valid", verified: 1, notes: null },

  // ══ S4 (completed): Lithium Bikita → Durban ══
  { sid: "SHIP-2026-00004", drvIdx: 1, vehIdx: null, type: "driver_license", number: "ZW-CLASS2-55912", path: "/docs/ZW-CLASS2-55912.pdf", authority: "Zimbabwe CVR", issued: "2023-01-10", expiry: "2028-01-10", status: "valid", verified: 1, notes: null },
  { sid: "SHIP-2026-00004", drvIdx: null, vehIdx: 7, type: "vehicle_registration", number: "ZA-MP-RRT339", path: "/docs/ZA-MP-RRT339.pdf", authority: "RSA eNaTIS", issued: "2024-11-30", expiry: "2028-11-30", status: "valid", verified: 1, notes: null },
  { sid: "SHIP-2026-00004", drvIdx: null, vehIdx: null, type: "export_permit", number: "ZW-EXP-2026-30198", path: "/docs/ZW-EXP-30198.pdf", authority: "Zimbabwe Revenue Authority", issued: pastDate(12), expiry: null, status: "valid", verified: 1, notes: null },
  { sid: "SHIP-2026-00004", drvIdx: null, vehIdx: null, type: "certificate_of_origin", number: "COO-ZW-2026-33920", path: "/docs/COO-ZW-33920.pdf", authority: "Zimbabwe Ministry of Mines", issued: pastDate(11), expiry: null, status: "valid", verified: 1, notes: null },

  // ══ S6 (at_border): Copper Kitwe → Walvis Bay ══
  { sid: "SHIP-2026-00006", drvIdx: 3, vehIdx: null, type: "driver_license", number: "ZM-HGV-33478", path: "/docs/ZM-HGV-33478.pdf", authority: "Zambia RTSA", issued: "2023-09-01", expiry: "2027-09-01", status: "valid", verified: 1, notes: null },
  { sid: "SHIP-2026-00006", drvIdx: 3, vehIdx: null, type: "pdp", number: "PDP-ZM-22109", path: "/docs/PDP-ZM-22109.pdf", authority: "Zambia RTSA", issued: "2024-12-31", expiry: relDate(-5), status: "expired", verified: 1, notes: "PDP expired! Must renew before next trip." },
  { sid: "SHIP-2026-00006", drvIdx: null, vehIdx: 4, type: "vehicle_registration", number: "ZM-BAE-9910", path: "/docs/ZM-BAE-9910.pdf", authority: "Zambia RTSA", issued: "2024-03-08", expiry: "2029-03-08", status: "valid", verified: 1, notes: null },
  { sid: "SHIP-2026-00006", drvIdx: null, vehIdx: null, type: "customs_declaration", number: "SAD500-ZM-991018", path: "/docs/SAD500-ZM-991018.pdf", authority: "Zambia Revenue Authority", issued: pastDate(3), expiry: null, status: "valid", verified: 1, notes: null },
  { sid: "SHIP-2026-00006", drvIdx: null, vehIdx: null, type: "assay_certificate", number: "ASSAY-ZM-2026-4150", path: "/docs/ASSAY-4150.pdf", authority: "AH Knight Zambia", issued: pastDate(4), expiry: null, status: "valid", verified: 1, notes: "Cu 28.1%, Au 1.2g/t, Ag 15.4g/t" },

  // ══ S7 (delayed): Uranium Windhoek → Cape Town ══
  { sid: "SHIP-2026-00007", drvIdx: 8, vehIdx: null, type: "driver_license", number: "EC-2291045", path: "/docs/EC-2291045.pdf", authority: "RSA Dept of Transport", issued: "2024-02-28", expiry: "2028-02-28", status: "valid", verified: 1, notes: null },
  { sid: "SHIP-2026-00007", drvIdx: null, vehIdx: 5, type: "vehicle_registration", number: "ZA-FS-LLX447", path: "/docs/ZA-FS-LLX447.pdf", authority: "RSA eNaTIS", issued: "2024-08-20", expiry: relDate(14), status: "expiring_soon", verified: 1, notes: "Registration expires in 14 days!" },
  { sid: "SHIP-2026-00007", drvIdx: null, vehIdx: null, type: "dg_declaration", number: "DG-NA-2026-11882", path: "/docs/DG-NA-11882.pdf", authority: "Namibia Atomic Energy Board", issued: pastDate(3), expiry: relDate(180), status: "valid", verified: 1, notes: "ADR Class 7, UN 2912" },
  { sid: "SHIP-2026-00007", drvIdx: null, vehIdx: null, type: "export_permit", number: "NA-EXP-2026-55120", path: "/docs/NA-EXP-55120.pdf", authority: "Namibia Ministry of Mines", issued: pastDate(4), expiry: relDate(60), status: "valid", verified: 1, notes: "Uranium export permit, dual-use controlled" },
  { sid: "SHIP-2026-00007", drvIdx: null, vehIdx: null, type: "insurance", number: "INS-ZA-2025-77331", path: "/docs/INS-ZA-77331.pdf", authority: "Hollard Marine Insurance", issued: pastDate(7), expiry: relDate(3), status: "expiring_soon", verified: 1, notes: "Insurance expires in 3 days — urgent renewal required" },

  // ══ S10 (ready): Copper Anodes Chingola → Durban ══
  { sid: "SHIP-2026-00010", drvIdx: 9, vehIdx: null, type: "driver_license", number: "BW-HGV-33721", path: "/docs/BW-HGV-33721.pdf", authority: "Botswana Dept of Road Transport", issued: "2024-01-19", expiry: "2029-01-19", status: "valid", verified: 1, notes: null },
  { sid: "SHIP-2026-00010", drvIdx: null, vehIdx: 2, type: "vehicle_registration", number: "ZW-AFE-774", path: "/docs/ZW-AFE-774.pdf", authority: "Zimbabwe CVR", issued: "2023-02-14", expiry: "2028-02-14", status: "valid", verified: 1, notes: null },
  { sid: "SHIP-2026-00010", drvIdx: null, vehIdx: null, type: "export_permit", number: "ZM-EXP-2026-88200", path: "/docs/ZM-EXP-88200.pdf", authority: "Zambia Revenue Authority", issued: pastDate(2), expiry: relDate(45), status: "valid", verified: 1, notes: null },

  // ══ S12 (in_transit): Copper Wire Rod Lusaka → Durban ══
  { sid: "SHIP-2026-00012", drvIdx: 0, vehIdx: null, type: "driver_license", number: "EC-8874521", path: "/docs/EC-8874521.pdf", authority: "RSA Dept of Transport", issued: "2022-08-15", expiry: "2027-08-15", status: "valid", verified: 1, notes: "Verified against RSA eNaTIS" },
  { sid: "SHIP-2026-00012", drvIdx: null, vehIdx: null, type: "export_permit", number: "ZM-EXP-2026-55910", path: "/docs/ZM-EXP-55910.pdf", authority: "Zambia Revenue Authority", issued: pastDate(1), expiry: relDate(55), status: "valid", verified: 1, notes: null },
  { sid: "SHIP-2026-00012", drvIdx: null, vehIdx: null, type: "commercial_invoice", number: "INV-ZME-2026-11230", path: "/docs/INV-11230.pdf", authority: "Zambezi Mineral Exports", issued: pastDate(2), expiry: null, status: "valid", verified: 1, notes: null },
];

// Also create non-shipment-linked docs with expiring statuses
const extraDocs: Array<typeof docDefs[0]> = [
  // Driver 4 (Pieter van der Merwe, off_duty) — expired medical
  { sid: null, drvIdx: 4, vehIdx: null, type: "medical_certificate", number: "MED-NA-P1928374N", path: "/docs/MED-NA-P1928374N.pdf", authority: "Namibia Ministry of Health", issued: "2025-07-18", expiry: relDate(-15), status: "expired", verified: 1, notes: "Medical expired. Driver suspended pending renewal." },
  // Driver 4 — passport expiring soon
  { sid: null, drvIdx: 4, vehIdx: null, type: "passport", number: "P1928374N", path: "/docs/P1928374N-passport.pdf", authority: "Namibia Ministry of Home Affairs", issued: "2019-01-08", expiry: "2029-01-08", status: "valid", verified: 1, notes: null },
  // Driver 6 (Tendai Chikomo) — medical expiring in 9 days
  { sid: null, drvIdx: 6, vehIdx: null, type: "medical_certificate", number: "MED-ZW-TC880210Z", path: "/docs/MED-ZW-TC880210Z.pdf", authority: "Zimbabwe Medical Council", issued: pastDate(355), expiry: relDate(9), status: "expiring_soon", verified: 1, notes: "Medical expires in 9 days — schedule renewal" },
  // Driver 8 (David Botha) — medical expiring in 7 days
  { sid: null, drvIdx: 8, vehIdx: null, type: "medical_certificate", number: "MED-ZA-DB2291045", path: "/docs/MED-ZA-DB2291045.pdf", authority: "RSA Health Professions Council", issued: pastDate(358), expiry: relDate(7), status: "expiring_soon", verified: 1, notes: "Medical expires in 7 days — urgent" },
  // Vehicle 3 (lowbed, maintenance) — registration expiring soon
  { sid: null, drvIdx: null, vehIdx: 3, type: "vehicle_registration", number: "ZA-WP-MEQ554", path: "/docs/ZA-WP-MEQ554-reg.pdf", authority: "RSA eNaTIS", issued: "2025-12-01", expiry: "2026-12-01", status: "expiring_soon", verified: 1, notes: "Registration expires Dec 2026" },
  // Vehicle 6 (DG flatbed) — insurance expiring in 11 days
  { sid: null, drvIdx: null, vehIdx: 6, type: "insurance", number: "INS-BW-2024-55211", path: "/docs/INS-BW-55211.pdf", authority: "Botswana Insurance Company", issued: pastDate(354), expiry: relDate(11), status: "expiring_soon", verified: 1, notes: "Insurance due in 11 days. Renewal form submitted." },
  // Vehicle 6 — cross_border_permit
  { sid: null, drvIdx: null, vehIdx: 6, type: "cross_border_permit", number: "CBP-BW-2024-22510", path: "/docs/CBP-BW-22510.pdf", authority: "SADC Cross Border Transport Agency", issued: "2024-06-15", expiry: "2028-06-15", status: "valid", verified: 1, notes: null },
];

const allDocDefs = [...docDefs, ...extraDocs];

for (const doc of allDocDefs) {
  const shipmentDbId = doc.sid ? shipmentRefs[doc.sid]?.dbId ?? null : null;
  const driverDbId = doc.drvIdx !== null ? driverIds[doc.drvIdx] : null;
  const vehicleDbId = doc.vehIdx !== null ? vehicleIds[doc.vehIdx] : null;

  insertDoc.run(
    shipmentDbId, driverDbId, vehicleDbId,
    doc.type, doc.number, doc.path, doc.authority, doc.issued, doc.expiry,
    doc.status, doc.verified, doc.notes
  );
}

console.log(`\n✅ Inserted ${allDocDefs.length} compliance documents`);
console.log(`   Shipment-linked: ${docDefs.length}, Entity-only: ${extraDocs.length}`);
console.log(`   Statuses: valid (~22), expiring_soon (5-6), expired (2), under_review (1)`);

// ═══════════════════════════════════════════════════════════════════════
// 6. TRIP EVENTS (50+) — realistic GPS along mining corridors
// ═══════════════════════════════════════════════════════════════════════

const insertEvent = db.prepare(`
  INSERT INTO trip_events (shipment_id, event_type, latitude, longitude, speed_kmh, heading, location_description, recorded_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

// Major coordinates for realistic waypoints
const WAYPOINTS: Record<string, [number, number]> = {
  "Solwezi": [-12.1734, 26.3945],
  "Chingola": [-12.5419, 27.8546],
  "Kitwe": [-12.8024, 28.2132],
  "Lusaka": [-15.3875, 28.3228],
  "Livingstone": [-17.8519, 25.8540],
  "Kazungula": [-17.8230, 25.1466],
  "Hwange": [-18.3649, 26.4896],
  "Bulawayo": [-20.1325, 28.6265],
  "Beitbridge": [-22.2400, 29.9900],
  "Musina": [-22.3758, 30.0325],
  "Polokwane": [-23.8962, 29.4486],
  "Johannesburg": [-26.2041, 28.0473],
  "Durban": [-29.8587, 31.0218],
  "Kolwezi": [-10.7189, 25.4670],
  "Lubumbashi": [-11.6647, 27.4794],
  "Kasumbalesa": [-12.3460, 27.8910],
  "Kaoma": [-14.7767, 24.8069],
  "Katima Mulilo": [-17.5043, 24.2751],
  "Windhoek": [-22.5609, 17.0658],
  "Walvis Bay": [-22.9576, 14.5053],
  "Bikita": [-20.1386, 31.4436],
  "Harare": [-17.8252, 31.0335],
  "Beira": [-19.8333, 34.8500],
  "Ramatlabama": [-25.6400, 25.5600],
  "Cape Town": [-33.9249, 18.4241],
  "Tete": [-16.1570, 33.5867],
  "Gaborone": [-24.6282, 25.9231],
  "Francistown": [-21.1700, 27.5100],
  "Nakonde": [-9.3420, 32.7569],
  "Dar es Salaam": [-6.7924, 39.2083],
};

function wp(name: string): [number, number] {
  return WAYPOINTS[name] || [-15.0, 28.0];
}

// S1 (in_transit): Solwezi → Durban via Kazungula, Beitbridge
const s1Events = [
  [shipmentRefs[`SHIP-${yyyy}-00001`].dbId, "departed", ...wp("Solwezi"), 0, 160, "Solwezi mine dispatch yard", dt(-2)],
  [shipmentRefs[`SHIP-${yyyy}-00001`].dbId, "en_route", -13.1500, 26.8200, 82, 168, "T2 Highway, south of Mumbwa", dt(-2, 3)],
  [shipmentRefs[`SHIP-${yyyy}-00001`].dbId, "en_route", -14.4522, 26.7421, 78, 172, "T2 Highway, approaching Lusaka bypass", dt(-2, 6)],
  [shipmentRefs[`SHIP-${yyyy}-00001`].dbId, "en_route", -16.1200, 25.6900, 80, 178, "T1 Highway, between Mazabuka and Livingstone", dt(-1.5, 0)],
  [shipmentRefs[`SHIP-${yyyy}-00001`].dbId, "border_arrival", -17.8230, 25.1466, 5, 165, "Kazungula Bridge border post — Zambia side", dt(-1, 2)],
  [shipmentRefs[`SHIP-${yyyy}-00001`].dbId, "border_departure", -17.8250, 25.1470, 45, 160, "Kazungula — cleared Botswana side in 90 min", dt(-1, 4)],
  [shipmentRefs[`SHIP-${yyyy}-00001`].dbId, "en_route", -18.3649, 26.4896, 75, 150, "A33 Highway, near Hwange National Park", dt(-1, 8)],
  [shipmentRefs[`SHIP-${yyyy}-00001`].dbId, "en_route", -19.7000, 28.1000, 72, 148, "A8 Highway, between Gweru and Bulawayo", dt(-0.5, 2)],
  [shipmentRefs[`SHIP-${yyyy}-00001`].dbId, "en_route", -21.4000, 29.3000, 65, 160, "A6 Highway, approaching Beitbridge", dt(-0.2, 0)],
];

// S3 (in_transit): Kolwezi → Walvis Bay via Kasumbalesa, Katima Mulilo
const s3Events = [
  [shipmentRefs[`SHIP-${yyyy}-00003`].dbId, "departed", ...wp("Kolwezi"), 0, 210, "Kolwezi mine site, dispatch bay", dt(-3)],
  [shipmentRefs[`SHIP-${yyyy}-00003`].dbId, "en_route", -11.4000, 26.3000, 70, 160, "N39 Highway, between Kolwezi and Lubumbashi", dt(-3, 3)],
  [shipmentRefs[`SHIP-${yyyy}-00003`].dbId, "en_route", -11.9500, 27.4000, 68, 155, "Approaching Kasumbalesa on DRC side", dt(-2.5, 1)],
  [shipmentRefs[`SHIP-${yyyy}-00003`].dbId, "border_arrival", -12.3456, 27.8901, 10, 210, "Kasumbalesa border — DRC side, queued for customs", dt(-2.5, 3)],
  [shipmentRefs[`SHIP-${yyyy}-00003`].dbId, "delay", -12.3456, 27.8901, 0, 210, "Kasumbalesa — customs hold: DG Class 9 declaration under review", dt(-2, 0)],
  [shipmentRefs[`SHIP-${yyyy}-00003`].dbId, "border_departure", -12.3460, 27.8910, 30, 210, "Kasumbalesa — cleared Zambia side after DG verification (4.5h delay)", dt(-2, 5)],
  [shipmentRefs[`SHIP-${yyyy}-00003`].dbId, "en_route", -13.2000, 26.1000, 72, 210, "T5 Highway, south of Chingola turn-off", dt(-1.5, 2)],
  [shipmentRefs[`SHIP-${yyyy}-00003`].dbId, "en_route", -14.7767, 24.8069, 70, 195, "T5 Highway, south of Kaoma", dt(-1, 0)],
  [shipmentRefs[`SHIP-${yyyy}-00003`].dbId, "en_route", -16.5000, 24.5000, 74, 190, "M10 Highway, approaching Katima Mulilo from Zambia", dt(-0.3, 0)],
];

// S6 (at_border): Kitwe → Walvis Bay via Katima Mulilo — currently at border
const s6Events = [
  [shipmentRefs[`SHIP-${yyyy}-00006`].dbId, "departed", ...wp("Kitwe"), 0, 220, "Kitwe copper processing plant, dispatch yard", dt(-3)],
  [shipmentRefs[`SHIP-${yyyy}-00006`].dbId, "en_route", -13.8000, 27.0500, 76, 200, "T3 Highway, between Ndola and Kapiri Mposhi", dt(-3, 5)],
  [shipmentRefs[`SHIP-${yyyy}-00006`].dbId, "en_route", -15.3875, 28.3228, 72, 195, "Lusaka bypass, heading west toward M10", dt(-2, 4)],
  [shipmentRefs[`SHIP-${yyyy}-00006`].dbId, "en_route", -16.1000, 25.4000, 70, 210, "M10 Highway, near Mongu junction", dt(-1.5, 1)],
  [shipmentRefs[`SHIP-${yyyy}-00006`].dbId, "border_arrival", ...wp("Katima Mulilo"), 5, 200, "Katima Mulilo border — Zambia side, awaiting clearance", dt(-0.5, 3)],
];

// S4 (completed): Bikita → Durban via Beitbridge
const s4Events = [
  [shipmentRefs[`SHIP-${yyyy}-00004`].dbId, "departed", ...wp("Bikita"), 0, 200, "Bikita Minerals loading bay", dt(-10)],
  [shipmentRefs[`SHIP-${yyyy}-00004`].dbId, "en_route", -21.1000, 30.8000, 75, 185, "A4 Highway, between Masvingo and Beitbridge", dt(-9, 2)],
  [shipmentRefs[`SHIP-${yyyy}-00004`].dbId, "border_arrival", -22.2455, 29.9890, 8, 180, "Beitbridge border — Zimbabwe side, gate 3", dt(-9, 8)],
  [shipmentRefs[`SHIP-${yyyy}-00004`].dbId, "border_departure", -22.2400, 29.9910, 50, 170, "Beitbridge — cleared South Africa side (3h 45m crossing)", dt(-8.5, 12)],
  [shipmentRefs[`SHIP-${yyyy}-00004`].dbId, "en_route", -23.8962, 29.4486, 80, 170, "N1 Highway, north of Polokwane", dt(-7.5, 2)],
  [shipmentRefs[`SHIP-${yyyy}-00004`].dbId, "en_route", -25.5000, 28.9000, 82, 165, "N1 Highway, near Pretoria bypass", dt(-6, 6)],
  [shipmentRefs[`SHIP-${yyyy}-00004`].dbId, "en_route", -28.2000, 30.2000, 78, 145, "N3 Highway, approaching Pietermaritzburg", dt(-5.2, 2)],
  [shipmentRefs[`SHIP-${yyyy}-00004`].dbId, "arrived", ...wp("Durban"), 0, 0, "Durban port — Maydon Wharf terminal gate", dt(-5, 0)],
  [shipmentRefs[`SHIP-${yyyy}-00004`].dbId, "delivered", -29.8587, 31.0218, 0, 0, "Durban port — freight handed over to shipping agent, BOL signed", dt(-5, 6)],
];

// S7 (delayed): Windhoek → Cape Town via Ramatlabama — stuck at border
const s7Events = [
  [shipmentRefs[`SHIP-${yyyy}-00007`].dbId, "departed", ...wp("Windhoek"), 0, 170, "Rössing uranium mine dispatch", dt(-2)],
  [shipmentRefs[`SHIP-${yyyy}-00007`].dbId, "en_route", -23.4500, 18.1200, 80, 160, "B1 Highway, south of Windhoek", dt(-2, 4)],
  [shipmentRefs[`SHIP-${yyyy}-00007`].dbId, "en_route", -24.2500, 20.5000, 78, 140, "B6 Highway, near Gobabis, heading toward Botswana border", dt(-1.5, 2)],
  [shipmentRefs[`SHIP-${yyyy}-00007`].dbId, "border_arrival", -25.6400, 25.5600, 8, 150, "Ramatlabama border — Botswana side", dt(-1, 6)],
  [shipmentRefs[`SHIP-${yyyy}-00007`].dbId, "delay", -25.6400, 25.5600, 0, 150, "Ramatlabama — customs hold: DG Class 7 manifest verification required", dt(-0.5, 0)],
  [shipmentRefs[`SHIP-${yyyy}-00007`].dbId, "delay", -25.6405, 25.5605, 0, 150, "Ramatlabama — awaiting SAHPRA clearance for nuclear material transit", dt(-0.2, 0)],
];

// S12 (in_transit): Lusaka → Durban via Kazungula, Beitbridge
const s12Events = [
  [shipmentRefs[`SHIP-${yyyy}-00012`].dbId, "departed", ...wp("Lusaka"), 0, 190, "Lusaka industrial area dispatch yard", dt(-1)],
  [shipmentRefs[`SHIP-${yyyy}-00012`].dbId, "en_route", -16.2500, 26.9000, 80, 175, "T1 Highway, between Mazabuka and Choma", dt(-1, 3)],
  [shipmentRefs[`SHIP-${yyyy}-00012`].dbId, "en_route", -17.2000, 25.5000, 75, 170, "T1 Highway, approaching Livingstone", dt(-1, 7)],
  [shipmentRefs[`SHIP-${yyyy}-00012`].dbId, "checkpoint", -17.5000, 25.4000, 40, 170, "Zambia weighbridge checkpoint — passed, 34.5t gross", dt(-1, 9)],
];

// Collate all events
const allEvents = [...s1Events, ...s3Events, ...s6Events, ...s4Events, ...s7Events, ...s12Events];

for (const ev of allEvents) {
  const [shipmentDbId, eventType, lat, lng, speed, heading, desc, recordedAt] = ev;
  insertEvent.run(shipmentDbId, eventType, lat, lng, speed, heading, desc, recordedAt);
}

console.log(`\n✅ Inserted ${allEvents.length} trip events`);
console.log(`   S1 (Copper Solwezi→Durban): ${s1Events.length} events`);
console.log(`   S3 (Cobalt Kolwezi→Walvis Bay): ${s3Events.length} events`);
console.log(`   S6 (Copper Kitwe→Walvis Bay): ${s6Events.length} events`);
console.log(`   S4 (Lithium Bikita→Durban): ${s4Events.length} events`);
console.log(`   S7 (Uranium Windhoek→Cape Town): ${s7Events.length} events`);
console.log(`   S12 (Copper Wire Lusaka→Durban): ${s12Events.length} events`);

// ═══════════════════════════════════════════════════════════════════════
// 7. RUN AI ENGINES — compliance analysis + MRS/OCS + alerts + expiry
// ═══════════════════════════════════════════════════════════════════════

console.log(`\n🔍 Running AI engines...`);

// Update all document statuses based on expiry dates (creates expiry alerts)
console.log(`   → Updating document expiry statuses...`);
const expiryResult = updateAllDocumentStatuses();
console.log(`     Docs updated: ${expiryResult.documentsUpdated}, Expired: ${expiryResult.documentsExpired}, Expiring soon: ${expiryResult.documentsExpiringSoon}`);
console.log(`     Alerts created: ${expiryResult.alertsCreated}, Driver issues: ${expiryResult.driverExpiryIssues}, Vehicle issues: ${expiryResult.vehicleExpiryIssues}`);

// Run compliance analysis on all non-draft, non-cancelled shipments
console.log(`   → Running shipment compliance analysis...`);
const activeShipments = shipmentIds.filter((_, i) => {
  const s = shipmentDefs[i];
  return s.status !== "draft" && s.status !== "cancelled";
});

for (const dbId of activeShipments) {
  const result = analyzeShipmentCompliance(dbId);
  if (result.missingCount > 0) {
    console.log(`     Shipment #${dbId}: compliance=${result.complianceScore}/100, ${result.missingCount} missing docs`);
  }
}

// Run MRS on ready/pending shipments, OCS on in_transit/at_border/delayed
console.log(`   → Calculating Mission Readiness Scores...`);
const mrsShipments = shipmentIds.filter((_, i) => {
  const s = shipmentDefs[i];
  return ["ready", "pending"].includes(s.status);
});

for (const dbId of mrsShipments) {
  try {
    const mrs = await calculateMissionReadiness(dbId);
    console.log(`     Shipment #${dbId}: MRS=${mrs.score}/100 (${mrs.threshold}), hardGate=${mrs.hardGateTriggered}`);
  } catch (e: unknown) {
    console.log(`     Shipment #${dbId}: MRS calculation failed — ${(e as Error).message}`);
  }
}

console.log(`   → Calculating Operational Confidence Scores...`);
const ocsShipments = shipmentIds.filter((_, i) => {
  const s = shipmentDefs[i];
  return ["in_transit", "at_border", "delayed"].includes(s.status);
});

for (const dbId of ocsShipments) {
  try {
    const ocs = await calculateOperationalConfidence(dbId);
    console.log(`     Shipment #${dbId}: OCS=${(ocs.score * 100).toFixed(1)}% (${ocs.threshold})`);
  } catch (e: unknown) {
    console.log(`     Shipment #${dbId}: OCS calculation failed — ${(e as Error).message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 8. GENERATE DAILY BRIEF (for mining company c1)
// ═══════════════════════════════════════════════════════════════════════

console.log(`\n📊 Generating daily intelligence brief for Kalahari Copper Mining (company_id=${c1.lastInsertRowid})...`);
try {
  const brief = await generateDailyBrief(Number(c1.lastInsertRowid));
  console.log(`   ✅ Brief generated for ${new Date().toISOString().slice(0, 10)}`);
  console.log(`   Critical alerts: ${brief.criticalAlerts.length}`);
  console.log(`   Prioritised decisions: ${brief.prioritisedDecisions.length}`);
  console.log(`   Fleet: ${brief.fleetOverview.totalActive} active, ${brief.fleetOverview.inTransit} in transit, ${brief.fleetOverview.delayed} delayed`);
} catch (e: unknown) {
  console.log(`   ⚠️ Brief generation failed — ${(e as Error).message}`);
}

// ═══════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════

const totalDocs = db.prepare("SELECT COUNT(*) as cnt FROM compliance_documents").get() as { cnt: number };
const totalEvents = db.prepare("SELECT COUNT(*) as cnt FROM trip_events").get() as { cnt: number };
const totalAlerts = db.prepare("SELECT COUNT(*) as cnt FROM alerts").get() as { cnt: number };

console.log(`\n${"═".repeat(60)}`);
console.log(`📦 DEMO SEED COMPLETE`);
console.log(`${"═".repeat(60)}`);
console.log(`  Companies:      4 (2 mining, 1 logistics, 1 transporter)`);
console.log(`  Drivers:        10 (6 available, 3 on_trip, 1 off_duty)`);
console.log(`  Vehicles:       8 (5 available, 2 on_trip, 1 maintenance)`);
console.log(`  Shipments:      12 (2 draft, 1 pending, 2 ready, 3 in_transit, 1 at_border, 1 delayed, 1 completed, 1 cancelled)`);
console.log(`  Documents:      ${totalDocs.cnt}`);
console.log(`  Trip Events:    ${totalEvents.cnt}`);
console.log(`  Alerts:         ${totalAlerts.cnt}`);
console.log(`  Routes:         Lusaka→Durban, JHB→Lubumbashi, Kolwezi→Walvis Bay, Windhoek→Cape Town, Kitwe→Walvis Bay, Harare→Beira, Chingola→Durban, and more`);
console.log(`  Borders:        Kazungula, Beitbridge, Kasumbalesa, Katima Mulilo, Ramatlabama, Chirundu, Lebombo, Nakonde`);
console.log(`${"═".repeat(60)}\n`);

// Close db
db.close();
}

// Run the async main function
main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
