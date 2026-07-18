import { Pool, PoolClient, QueryResult } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/postgres",
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: process.env.DATABASE_URL ? 5000 : 1000,
});

let initialized = false;

// ═══════════════════════════════════════════════════════════════════
// SQL helper: converts SQLite-style `?` placeholders to pg `$1, $2, ...`
// ═══════════════════════════════════════════════════════════════════

let paramCounter = 0;
function toPgParams(sql: string): string {
  paramCounter = 0;
  return sql.replace(/\?/g, () => {
    paramCounter++;
    return `$${paramCounter}`;
  });
}

// ═══════════════════════════════════════════════════════════════════
// Statement wrapper — mimics better-sqlite3's prepared statement
// ═══════════════════════════════════════════════════════════════════

class PgStatement {
  private sql: string;
  private client: PoolClient | Pool;

  constructor(sql: string, client: PoolClient | Pool) {
    this.sql = sql;
    this.client = client;
  }

  async all(...params: unknown[]): Promise<Record<string, unknown>[]> {
    const pgSql = toPgParams(this.sql);
    const result = await this.client.query(pgSql, params);
    return result.rows as Record<string, unknown>[];
  }

  async get(...params: unknown[]): Promise<Record<string, unknown> | undefined> {
    const pgSql = toPgParams(this.sql);
    const result = await this.client.query(pgSql, params);
    return result.rows[0] as Record<string, unknown> | undefined;
  }

  async run(...params: unknown[]): Promise<{ lastInsertRowid: number; changes: number }> {
    // Check if this is an INSERT that needs RETURNING id
    let pgSql = toPgParams(this.sql);
    const isInsert = /^\s*INSERT\s+/i.test(pgSql);
    
    if (isInsert && !/RETURNING\s+/i.test(pgSql)) {
      pgSql = pgSql.replace(/;\s*$/, "");
      pgSql += " RETURNING id";
    }

    const result = await this.client.query(pgSql, params);
    const lastInsertRowid = result.rows.length > 0 && result.rows[0].id
      ? Number(result.rows[0].id)
      : 0;
    const changes = result.rowCount ?? 0;

    return { lastInsertRowid, changes };
  }
}

// ═══════════════════════════════════════════════════════════════════
// PgWrapper — mimics better-sqlite3 Database interface
// ═══════════════════════════════════════════════════════════════════

class PgWrapper {
  private client: PoolClient | Pool;

  constructor(client: PoolClient | Pool) {
    this.client = client;
  }

  prepare(sql: string): PgStatement {
    return new PgStatement(sql, this.client);
  }

  async exec(sql: string): Promise<void> {
    // For multi-statement DDL, split and execute each statement
    // pg doesn't support multi-statement in a single query
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      await this.client.query(stmt);
    }
  }

  async close(): Promise<void> {
    if (this.client instanceof Pool) {
      // Pool-level close — don't close the pool, just release
    } else {
      this.client.release();
    }
  }

  // Low-level query access
  async query(text: string, params?: unknown[]): Promise<QueryResult> {
    return this.client.query(text, params);
  }
}

// ═══════════════════════════════════════════════════════════════════
// Singleton getDb — returns a PgWrapper backed by the pool
// ═══════════════════════════════════════════════════════════════════

let dbWrapper: PgWrapper | null = null;
let initPromise: Promise<void> | null = null;

async function ensureInitialized(): Promise<void> {
  if (initialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      const { initializeDatabase } = await import("./db-setup");
      const db = new PgWrapper(pool);
      await initializeDatabase(db);
      initialized = true;
    })();
  }
  await initPromise;
}

export function getDb(): PgWrapper {
  if (!dbWrapper) {
    dbWrapper = new PgWrapper(pool);
    // Kick off initialization in the background
    ensureInitialized().catch((err) => {
      console.error("Failed to initialize database:", err);
    });
  }
  return dbWrapper;
}

/**
 * Get a dedicated client for transactions or multi-step operations.
 * Caller must release() when done.
 */
export async function getClient(): Promise<{ client: PoolClient; db: PgWrapper }> {
  const client = await pool.connect();
  return { client, db: new PgWrapper(client) };
}

/**
 * Initialize the database schema.
 * Called once on first access.
 */
export async function initializeDb(): Promise<void> {
  if (initialized) return;
  const { initializeDatabase } = await import("./db-setup");
  const db = getDb();
  await initializeDatabase(db);
  initialized = true;
}

/**
 * Close the pool gracefully.
 */
export async function closeDb(): Promise<void> {
  dbWrapper = null;
  await pool.end();
}

// Auto-initialize on import in production
if (process.env.NODE_ENV === "production") {
  initializeDb().catch((err) => {
    console.error("Failed to initialize database on startup:", err);
  });
}
