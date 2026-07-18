import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "logistiqs.db");

let db: Database.Database | null = null;

function ensureDataDir(): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Returns the singleton database connection.
 * Creates the data directory and opens the database on first call.
 * Enables WAL mode for better concurrent read performance.
 * Enables foreign key enforcement.
 */
export function getDb(): Database.Database {
  if (!db) {
    ensureDataDir();
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}

/**
 * Closes the database connection gracefully.
 * Useful for testing and clean shutdowns.
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
