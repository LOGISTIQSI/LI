import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "logistiqs.db");

/**
 * Minimal database interface for better-sqlite3.
 * The native module is loaded dynamically at runtime to avoid
 * TypeScript / build-time resolution of the native addon.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqliteDatabase = any;

let db: SqliteDatabase | null = null;

function ensureDataDir(): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadBetterSqlite3(): SqliteDatabase {
  // Dynamic require hides the native module from TypeScript / bundler analysis.
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const BetterSqlite3 = require("better-sqlite3");
  const Ctor = BetterSqlite3.default || BetterSqlite3;
  return new Ctor(DB_PATH);
}

/**
 * Returns the singleton database connection.
 * On first call, initialises via better-sqlite3.
 * Throws if better-sqlite3 is not installed.
 */
export function getDb(): SqliteDatabase {
  if (!db) {
    ensureDataDir();
    db = loadBetterSqlite3();
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
