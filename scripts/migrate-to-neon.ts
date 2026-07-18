/**
 * LOGISTIQS Intelligence — PostgreSQL Migration Script
 *
 * Runs initializeDatabase() against the DATABASE_URL to create all tables,
 * indexes, and constraints in the Neon PostgreSQL database.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." bun run scripts/migrate-to-neon.ts
 */

import { initializeDb, closeDb } from "../src/lib/db";

async function main() {
  console.log("LOGISTIQS Intelligence — Database Migration\n");
  console.log(`Connecting to: ${process.env.DATABASE_URL?.replace(/\/\/.*@/, "//***@") || "NOT SET"}\n`);

  if (!process.env.DATABASE_URL) {
    console.error("ERROR: DATABASE_URL environment variable is not set.");
    process.exit(1);
  }

  try {
    console.log("Initializing database schema...");
    await initializeDb();
    console.log("✅ Database schema initialized successfully.\n");

    console.log("Tables created:");
    console.log("  • companies");
    console.log("  • users");
    console.log("  • drivers");
    console.log("  • vehicles");
    console.log("  • shipments");
    console.log("  • compliance_documents");
    console.log("  • trip_events");
    console.log("  • alerts");
    console.log("  • intelligence_briefs");
    console.log("\nAll indexes created.\n");

    await closeDb();
    console.log("✅ Migration complete. Database is ready for use.");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

main();
