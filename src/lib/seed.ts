import { getDb } from "./db";

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

// ── 1. Companies ──
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
  "SADC Cross-Border Logistics",
  "logistics",
  "dispatch@sadc-logistics.co.za",
  "+27 11 468 5500",
  "South Africa",
  "ZA-2015-128934",
  "TAX-ZA-4456728"
);

const c3 = insertCompany.run(
  "Zambezi Transporters Ltd",
  "transporter",
  "fleet@zambezitrans.co.zm",
  "+260 211 252 800",
  "Zambia",
  "ZM-2012-010678",
  "TAX-ZM-331056"
);

console.log(`Inserted 3 companies (ids: ${c1.lastInsertRowid}, ${c2.lastInsertRowid}, ${c3.lastInsertRowid})`);

// ── 2. Drivers (belong to transporter company c3) ──
const insertDriver = db.prepare(`
  INSERT INTO drivers (
    company_id, license_number, license_type, license_expiry,
    pdp_number, pdp_expiry, dg_endorsement, dg_expiry,
    medical_certificate_expiry, passport_number, passport_expiry,
    yellow_fever_cert, hiv_cert_expiry, status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const drivers = [
  // 0: Thabo Molefe — South African, available
  [
    c3.lastInsertRowid, "EC-8874521", "EC", "2027-08-15",
    "PDP-44829", "2027-06-30", 1, "2027-06-30",
    "2026-12-15", "A08397211", "2029-03-22",
    1, null, "available"
  ],
  // 1: Shingai Mutasa — Zimbabwean, available
  [
    c3.lastInsertRowid, "ZW-CLASS2-55912", "Class 2", "2028-01-10",
    "PDP-ZW-77331", "2027-11-20", 0, null,
    "2026-10-05", "FN440912", "2028-07-14",
    1, "2027-02-10", "available"
  ],
  // 2: Maria Ndlovu — South African, available
  [
    c3.lastInsertRowid, "EC-6671390", "EC", "2029-04-22",
    "PDP-55021", "2028-02-15", 1, "2028-02-15",
    "2027-03-30", "M07465823", "2030-11-05",
    1, null, "available"
  ],
  // 3: Chanda Banda — Zambian, on_trip
  [
    c3.lastInsertRowid, "ZM-HGV-33478", "HGV", "2027-09-01",
    "PDP-ZM-22109", "2026-12-31", 0, null,
    "2026-08-20", "ZB339104", "2028-05-19",
    1, "2026-10-12", "on_trip"
  ],
  // 4: Pieter van der Merwe — Namibian, off_duty
  [
    c3.lastInsertRowid, "NA-CE-88123", "CE", "2026-11-30",
    "PDP-NA-10045", "2026-09-15", 1, "2026-09-15",
    "2026-07-18", "P1928374N", "2029-01-08",
    1, null, "off_duty"
  ],
];

for (const d of drivers) {
  insertDriver.run(...d);
}

console.log(`Inserted 5 drivers`);

// ── 3. Vehicles (belong to transporter company c3) ──
const insertVehicle = db.prepare(`
  INSERT INTO vehicles (
    company_id, registration_number, vehicle_type, make, model, year,
    vin, gvm, max_payload, registration_expiry, roadworthiness_expiry,
    insurance_type, insurance_expiry, cross_border_permit_number,
    cross_border_permit_expiry, is_dg_capable, status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const vehicles = [
  // 0: South African horse + trailer
  [
    c3.lastInsertRowid, "ZA-GP-NRT882", "Horse & Trailer", "MAN", "TGX 26.480", 2022,
    "VIN-WMA06SZZ1BP022881", 56000, 34000,
    "2027-05-10", "2027-05-10",
    "comprehensive", "2027-05-10", "CBP-ZA-2024-88330",
    "2027-05-10", 0, "available"
  ],
  // 1: Zambian flatbed
  [
    c3.lastInsertRowid, "ZM-ACB-4421", "Flatbed Truck", "Scania", "R580", 2021,
    "VIN-YS2S6X20002155442", 44000, 28000,
    "2027-11-25", "2027-11-25",
    "comprehensive", "2027-11-25", "CBP-ZM-2024-11092",
    "2027-11-25", 0, "available"
  ],
  // 2: Zimbabwean tanker (DG capable)
  [
    c3.lastInsertRowid, "ZW-AFE-774", "Tanker", "Volvo", "FH 540", 2023,
    "VIN-YV2RTY0C7EB779104", 48000, 30000,
    "2028-02-14", "2028-02-14",
    "comprehensive", "2028-02-14", "CBP-ZW-2024-55890",
    "2028-02-14", 1, "available"
  ],
  // 3: South African lowbed (heavy haul)
  [
    c3.lastInsertRowid, "ZA-WP-MEQ554", "Lowbed", "Mercedes-Benz", "Actros 3358", 2020,
    "VIN-WDB9634031L930228", 60000, 42000,
    "2026-12-01", "2026-12-01",
    "comprehensive", "2026-12-01", "CBP-ZA-2024-44120",
    "2026-12-01", 0, "maintenance"
  ],
  // 4: Zambian tipper
  [
    c3.lastInsertRowid, "ZM-BAE-9910", "Tipper Truck", "FAW", "JH6 460", 2024,
    "VIN-LFWJR9PEXNA001882", 35000, 22000,
    "2029-03-08", "2029-03-08",
    "comprehensive", "2029-03-08", "CBP-ZM-2024-33217",
    "2029-03-08", 0, "available"
  ],
];

for (const v of vehicles) {
  insertVehicle.run(...v);
}

console.log(`Inserted 5 vehicles`);

// ── 4. Sample shipments ──
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

const now = new Date();
const yyyy = now.getFullYear();

function fmtDate(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 19);
}

// Shipment 1: In transit — Copper Cathode from Solwezi, ZM to Durban, ZA
const s1 = insertShipment.run(
  `SHIP-${yyyy}-00001`, c1.lastInsertRowid, c2.lastInsertRowid, 1, 1,
  "Solwezi, Zambia", "Durban, South Africa",
  "ZM", "ZA",
  "Copper Cathode", "Grade A copper cathode sheets, 99.99% purity, packed on pallets",
  "7403.11", 12500000, 28000, // $125,000.00 value
  0, null,
  JSON.stringify(["Kazungula", "Beitbridge"]),
  "in_transit",
  fmtDate(new Date(now.getTime() - 2 * 86400000)), // scheduled 2 days ago
  fmtDate(new Date(now.getTime() - 2 * 86400000)), // departed 2 days ago
  fmtDate(new Date(now.getTime() + 3 * 86400000)), // eta 3 days from now
  null,
  85, fmtDate(new Date(now.getTime() - 3 * 86400000)),
  0.92, fmtDate(new Date(now.getTime() - 3 * 86400000))
);

// Shipment 2: Ready — Mining equipment from Johannesburg to Lubumbashi
const s2 = insertShipment.run(
  `SHIP-${yyyy}-00002`, c1.lastInsertRowid, c2.lastInsertRowid, 1, 4,
  "Johannesburg, South Africa", "Lubumbashi, DRC",
  "ZA", "CD",
  "Mining Equipment", "CAT 777E dump truck components — engine, transmission, axles",
  "8431.49", 48000000, 38000, // $480,000.00 value
  0, null,
  JSON.stringify(["Beitbridge", "Chirundu", "Kasumbalesa"]),
  "ready",
  fmtDate(new Date(now.getTime() + 2 * 86400000)), // scheduled in 2 days
  null,
  fmtDate(new Date(now.getTime() + 8 * 86400000)), // eta 8 days
  null,
  72, fmtDate(new Date(now.getTime() - 1 * 86400000)),
  0.78, fmtDate(new Date(now.getTime() - 1 * 86400000))
);

// Shipment 3: Delayed — Cobalt Hydroxide from Kolwezi to Walvis Bay
const s3 = insertShipment.run(
  `SHIP-${yyyy}-00003`, c1.lastInsertRowid, c2.lastInsertRowid, 2, 2,
  "Kolwezi, DRC", "Walvis Bay, Namibia",
  "CD", "NA",
  "Cobalt Hydroxide", "Bulk cobalt hydroxide filter cake in 2-ton bulk bags",
  "2822.00", 38500000, 24000, // $385,000.00 value
  1, "9", // DG Class 9
  JSON.stringify(["Kasumbalesa", "Katima Mulilo"]),
  "delayed",
  fmtDate(new Date(now.getTime() - 4 * 86400000)), // scheduled 4 days ago
  fmtDate(new Date(now.getTime() - 4 * 86400000)),
  fmtDate(new Date(now.getTime() + 1 * 86400000)),
  null,
  45, fmtDate(new Date(now.getTime() - 5 * 86400000)),
  0.55, fmtDate(new Date(now.getTime() - 5 * 86400000))
);

// Shipment 4: Completed — Lithium ore from Bikita, ZW to Durban
const s4 = insertShipment.run(
  `SHIP-${yyyy}-00004`, c1.lastInsertRowid, c2.lastInsertRowid, 2, 1, // vehicle 1 = ZA-GP-NRT882
  "Bikita, Zimbabwe", "Durban, South Africa",
  "ZW", "ZA",
  "Lithium Ore", "Spodumene concentrate 6% Li2O, bulk in containers",
  "2530.90", 8200000, 32000, // $82,000.00 value
  0, null,
  JSON.stringify(["Beitbridge"]),
  "completed",
  fmtDate(new Date(now.getTime() - 10 * 86400000)),
  fmtDate(new Date(now.getTime() - 10 * 86400000)),
  fmtDate(new Date(now.getTime() - 5 * 86400000)),
  fmtDate(new Date(now.getTime() - 5 * 86400000)),
  91, fmtDate(new Date(now.getTime() - 11 * 86400000)),
  0.96, fmtDate(new Date(now.getTime() - 11 * 86400000))
);

// Shipment 5: Draft — Coal from Tete, MZ to Beira
const s5 = insertShipment.run(
  `SHIP-${yyyy}-00005`, c1.lastInsertRowid, c2.lastInsertRowid, null, null,
  "Tete, Mozambique", "Beira, Mozambique",
  "MZ", "MZ",
  "Coal", "Thermal coal, 5500 kcal/kg, loose bulk",
  "2701.12", 3500000, 34000, // $35,000.00 value
  0, null,
  JSON.stringify([]),
  "draft",
  fmtDate(new Date(now.getTime() + 3 * 86400000)),
  null,
  fmtDate(new Date(now.getTime() + 4 * 86400000)),
  null,
  null, null,
  null, null
);

console.log(`Inserted 5 shipments (ids: ${s1.lastInsertRowid}-${s5.lastInsertRowid})`);

// ── 5. Trip events for in_transit shipment (s1) ──
const insertEvent = db.prepare(`
  INSERT INTO trip_events (shipment_id, event_type, latitude, longitude, speed_kmh, heading, location_description, recorded_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const s1Events = [
  [s1.lastInsertRowid, "departed", -12.1734, 26.3945, 0, 180, "Solwezi mine dispatch yard", fmtDate(new Date(now.getTime() - 2 * 86400000))],
  [s1.lastInsertRowid, "en_route", -14.4522, 26.7421, 78, 172, "T2 Highway, south of Mumbwa", fmtDate(new Date(now.getTime() - 2 * 86400000 + 4 * 3600000))],
  [s1.lastInsertRowid, "border_arrival", -17.8230, 25.1466, 5, 165, "Kazungula Bridge border post", fmtDate(new Date(now.getTime() - 1.5 * 86400000))],
  [s1.lastInsertRowid, "border_departure", -17.8250, 25.1470, 45, 160, "Kazungula — cleared Zambia side", fmtDate(new Date(now.getTime() - 1.4 * 86400000))],
  [s1.lastInsertRowid, "en_route", -19.0154, 27.0159, 82, 175, "A8 Highway, near Hwange", fmtDate(new Date(now.getTime() - 1 * 86400000))],
];

for (const e of s1Events) {
  insertEvent.run(...e);
}

// Events for delayed shipment (s3)
const s3Events = [
  [s3.lastInsertRowid, "departed", -10.7189, 25.4670, 0, 220, "Kolwezi mine site", fmtDate(new Date(now.getTime() - 4 * 86400000))],
  [s3.lastInsertRowid, "border_arrival", -12.3456, 27.8901, 10, 210, "Kasumbalesa border — DRC side", fmtDate(new Date(now.getTime() - 3.5 * 86400000))],
  [s3.lastInsertRowid, "delay", -12.3456, 27.8901, 0, 210, "Kasumbalesa — customs hold: DG declaration under review", fmtDate(new Date(now.getTime() - 3 * 86400000))],
  [s3.lastInsertRowid, "border_departure", -12.3460, 27.8910, 30, 210, "Kasumbalesa — cleared Zambia side after DG verification", fmtDate(new Date(now.getTime() - 2.5 * 86400000))],
  [s3.lastInsertRowid, "en_route", -14.7767, 24.8069, 70, 195, "T5 Highway, south of Kaoma", fmtDate(new Date(now.getTime() - 1 * 86400000))],
];

for (const e of s3Events) {
  insertEvent.run(...e);
}

// Events for completed shipment (s4)
const s4Events = [
  [s4.lastInsertRowid, "departed", -20.1386, 31.4436, 0, 200, "Bikita Minerals loading bay", fmtDate(new Date(now.getTime() - 10 * 86400000))],
  [s4.lastInsertRowid, "border_arrival", -22.2455, 29.9890, 8, 180, "Beitbridge border — Zimbabwe side", fmtDate(new Date(now.getTime() - 9 * 86400000))],
  [s4.lastInsertRowid, "border_departure", -22.2400, 29.9910, 50, 170, "Beitbridge — cleared South Africa side", fmtDate(new Date(now.getTime() - 8.8 * 86400000))],
  [s4.lastInsertRowid, "arrived", -29.8587, 31.0218, 0, 0, "Durban port — container terminal gate", fmtDate(new Date(now.getTime() - 5 * 86400000))],
  [s4.lastInsertRowid, "delivered", -29.8587, 31.0218, 0, 0, "Durban port — freight handed over to shipping agent", fmtDate(new Date(now.getTime() - 5 * 86400000 + 6 * 3600000))],
];

for (const e of s4Events) {
  insertEvent.run(...e);
}

console.log("Inserted trip events");

// ── 6. Compliance documents ──
const insertDoc = db.prepare(`
  INSERT INTO compliance_documents (
    shipment_id, driver_id, vehicle_id, document_type, document_number,
    document_file_path, issuing_authority, issued_date, expiry_date, status, ai_verified, ai_notes
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const docs = [
  // For shipment s1
  [s1.lastInsertRowid, 1, 1, "driver_license", "EC-8874521", "/docs/EC-8874521.pdf", "RSA Dept of Transport", "2022-08-15", "2027-08-15", "valid", 1, "Verified against RSA eNaTIS"],
  [s1.lastInsertRowid, 1, 1, "pdp", "PDP-44829", "/docs/PDP-44829.pdf", "RSA Dept of Transport", "2025-06-30", "2027-06-30", "valid", 1, null],
  [s1.lastInsertRowid, null, 1, "vehicle_registration", "ZA-GP-NRT882", "/docs/ZA-GP-NRT882-reg.pdf", "RSA eNaTIS", "2026-05-10", "2027-05-10", "valid", 1, null],
  [s1.lastInsertRowid, null, 1, "cross_border_permit", "CBP-ZA-2024-88330", "/docs/CBP-ZA-2024-88330.pdf", "SADC Cross Border Transport Agency", "2026-05-10", "2027-05-10", "valid", 1, null],
  // For shipment s3 (delayed — some docs have issues)
  [s3.lastInsertRowid, 2, 2, "driver_license", "ZW-CLASS2-55912", "/docs/ZW-CLASS2-55912.pdf", "Zimbabwe CVR", "2023-01-10", "2028-01-10", "valid", 1, null],
  [s3.lastInsertRowid, null, 2, "vehicle_registration", "ZM-ACB-4421", "/docs/ZM-ACB-4421.pdf", "Zambia RTSA", "2025-11-25", "2027-11-25", "valid", 1, null],
  [s3.lastInsertRowid, null, 2, "insurance", "INS-ZM-2025-3344", "/docs/INS-ZM-2025-3344.pdf", "Madison Insurance Zambia", "2025-11-25", "2027-11-25", "valid", 1, null],
  [s3.lastInsertRowid, null, 2, "dg_permit", "DG-ZM-2025-1092", null, "Zambia Environmental Management Agency", "2025-11-25", "2027-11-25", "under_review", 0, "DG declaration being re-verified at Kasumbalesa"],
  // For shipment s4 (completed)
  [s4.lastInsertRowid, 2, 1, "driver_license", "ZW-CLASS2-55912", "/docs/ZW-CLASS2-55912.pdf", "Zimbabwe CVR", "2023-01-10", "2028-01-10", "valid", 1, null],
  [s4.lastInsertRowid, null, 1, "vehicle_registration", "ZA-GP-NRT882", "/docs/ZA-GP-NRT882-reg.pdf", "RSA eNaTIS", "2026-05-10", "2027-05-10", "valid", 1, null],
  // For vehicle 4 (ZA-WP-MEQ554 — expiring soon)
  [null, null, 4, "vehicle_registration", "ZA-WP-MEQ554", "/docs/ZA-WP-MEQ554-reg.pdf", "RSA eNaTIS", "2025-12-01", "2026-12-01", "expiring_soon", 1, "Registration expires within 5 months. Renewal recommended."],
  // Driver 4 (off_duty — expired medical)
  [null, 4, null, "medical_certificate", "MED-NA-P1928374N", "/docs/MED-NA-P1928374N.pdf", "Namibia Ministry of Health", "2025-07-18", "2026-07-18", "expired", 1, "Medical certificate expired. Driver suspended."],
];

for (const d of docs) {
  insertDoc.run(...d);
}

console.log(`Inserted ${docs.length} compliance documents`);

console.log("\n✅ Seed complete! Database populated with sample data.");
console.log(`   - 3 companies (mining, logistics, transporter)`);
console.log(`   - 5 drivers`);
console.log(`   - 5 vehicles`);
console.log(`   - 5 shipments (draft, ready, in_transit, delayed, completed)`);
console.log(`   - ${s1Events.length + s3Events.length + s4Events.length} trip events`);
console.log(`   - ${docs.length} compliance documents`);
