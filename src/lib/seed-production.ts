/**
 * LOGISTIQS Intelligence — Production Seed Script
 *
 * Initializes the database with schema only — ZERO demo data.
 * Ready for real customer onboarding.
 */

import { getDb } from "./db";

function main() {
  const db = getDb();

  // Verify all tables exist with zero rows
  const tables = [
    "companies",
    "users",
    "drivers",
    "vehicles",
    "shipments",
    "compliance_documents",
    "trip_events",
    "alerts",
    "intelligence_briefs",
  ];

  console.log("LOGISTIQS Intelligence — Production Database Initialization\n");
  console.log("Verifying clean schema...\n");

  let allEmpty = true;
  for (const table of tables) {
    const row = db.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).get() as { cnt: number };
    const status = row.cnt === 0 ? "✓ empty" : `✗ ${row.cnt} row(s) found`;
    if (row.cnt > 0) allEmpty = false;
    console.log(`  ${table.padEnd(24)} ${status}`);
  }

  console.log();
  if (allEmpty) {
    console.log("✅ Production database is clean and ready for customer onboarding.");
  } else {
    console.log("⚠️  Some tables contain data. Run with a fresh database file for production.");
  }

  console.log("\nTables initialized:");
  console.log("  companies           — mining, logistics, and transporter companies");
  console.log("  users               — platform users (admin, manager, operator, driver)");
  console.log("  drivers             — driver profiles, licenses, permits, medical certs");
  console.log("  vehicles            — vehicle fleet, registration, insurance, cross-border permits");
  console.log("  shipments           — cross-border mining transport shipments");
  console.log("  compliance_documents — shipment, driver, and vehicle compliance documents");
  console.log("  trip_events         — GPS tracking events along mining corridors");
  console.log("  alerts              — compliance, border, delay, expiry, and risk alerts");
  console.log("  intelligence_briefs — daily executive operational intelligence briefs");
  console.log();

  db.close();
}

main();
