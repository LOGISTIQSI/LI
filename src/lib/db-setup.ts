import { getDb } from "./db";

/**
 * Initializes all database tables, indexes, and constraints in PostgreSQL.
 * Idempotent — safe to call on every application start.
 */
export async function initializeDatabase(db: ReturnType<typeof getDb>): Promise<void> {
  // PostgreSQL doesn't support multi-statement exec, so we run them sequentially.
  // Most statements use IF NOT EXISTS so they're idempotent.

  await db.exec(`
    -- ============================================================
    -- 1. companies
    -- ============================================================
    CREATE TABLE IF NOT EXISTS companies (
      id                  SERIAL PRIMARY KEY,
      name                TEXT    NOT NULL,
      type                TEXT    NOT NULL CHECK (type IN ('mining', 'logistics', 'transporter')),
      email               TEXT    NOT NULL,
      phone               TEXT    NOT NULL,
      country             TEXT    NOT NULL,
      registration_number TEXT    NOT NULL,
      tax_id              TEXT    NOT NULL,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ============================================================
    -- 2. users
    -- ============================================================
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      company_id    INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      full_name     TEXT    NOT NULL,
      role          TEXT    NOT NULL CHECK (role IN ('admin', 'manager', 'operator', 'driver')),
      phone         TEXT    NOT NULL,
      is_active     INTEGER NOT NULL DEFAULT 1,
      last_login    TIMESTAMPTZ,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ============================================================
    -- 3. drivers
    -- ============================================================
    CREATE TABLE IF NOT EXISTS drivers (
      id                        SERIAL PRIMARY KEY,
      user_id                   INTEGER          REFERENCES users(id) ON DELETE SET NULL,
      company_id                INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      license_number            TEXT    NOT NULL,
      license_type              TEXT    NOT NULL,
      license_expiry            DATE    NOT NULL,
      pdp_number                TEXT    NOT NULL,
      pdp_expiry                DATE    NOT NULL,
      dg_endorsement            INTEGER NOT NULL DEFAULT 0,
      dg_expiry                 DATE,
      medical_certificate_expiry DATE   NOT NULL,
      passport_number           TEXT    NOT NULL,
      passport_expiry           DATE    NOT NULL,
      yellow_fever_cert         INTEGER NOT NULL DEFAULT 0,
      hiv_cert_expiry           DATE,
      is_verified               INTEGER NOT NULL DEFAULT 0,
      status                    TEXT    NOT NULL DEFAULT 'available'
                                CHECK (status IN ('available', 'on_trip', 'off_duty', 'suspended')),
      created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ============================================================
    -- 4. vehicles
    -- ============================================================
    CREATE TABLE IF NOT EXISTS vehicles (
      id                           SERIAL PRIMARY KEY,
      company_id                   INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      registration_number          TEXT    NOT NULL UNIQUE,
      vehicle_type                 TEXT    NOT NULL,
      make                         TEXT    NOT NULL,
      model                        TEXT    NOT NULL,
      year                         INTEGER NOT NULL,
      vin                          TEXT    NOT NULL,
      gvm                          REAL    NOT NULL,
      max_payload                  REAL    NOT NULL,
      registration_expiry          DATE    NOT NULL,
      roadworthiness_expiry        DATE    NOT NULL,
      insurance_type               TEXT    NOT NULL,
      insurance_expiry             DATE    NOT NULL,
      cross_border_permit_number   TEXT    NOT NULL,
      cross_border_permit_expiry   DATE    NOT NULL,
      is_dg_capable                INTEGER NOT NULL DEFAULT 0,
      is_verified                  INTEGER NOT NULL DEFAULT 0,
      status                       TEXT    NOT NULL DEFAULT 'available'
                                   CHECK (status IN ('available', 'on_trip', 'maintenance', 'retired')),
      created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ============================================================
    -- 5. shipments
    -- ============================================================
    CREATE TABLE IF NOT EXISTS shipments (
      id                           SERIAL PRIMARY KEY,
      shipment_id                  TEXT    NOT NULL UNIQUE,
      company_id                   INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      logistics_company_id         INTEGER          REFERENCES companies(id) ON DELETE SET NULL,
      driver_id                    INTEGER          REFERENCES drivers(id) ON DELETE SET NULL,
      vehicle_id                   INTEGER          REFERENCES vehicles(id) ON DELETE SET NULL,
      origin                       TEXT    NOT NULL,
      destination                  TEXT    NOT NULL,
      origin_country               TEXT    NOT NULL,
      destination_country          TEXT    NOT NULL,
      cargo_type                   TEXT    NOT NULL,
      cargo_description            TEXT    NOT NULL,
      cargo_hs_code                TEXT    NOT NULL,
      cargo_value                  INTEGER NOT NULL,
      cargo_weight_kg              REAL    NOT NULL,
      is_dangerous_goods           INTEGER NOT NULL DEFAULT 0,
      dg_class                     TEXT,
      border_crossings             TEXT    NOT NULL DEFAULT '[]',
      status                       TEXT    NOT NULL DEFAULT 'draft'
                                   CHECK (status IN ('draft', 'pending', 'ready', 'in_transit', 'at_border', 'delayed', 'completed', 'cancelled')),
      departure_scheduled          TIMESTAMPTZ NOT NULL,
      departure_actual             TIMESTAMPTZ,
      eta                          TIMESTAMPTZ,
      arrival_actual               TIMESTAMPTZ,
      mission_readiness_score      INTEGER,
      readiness_calculated_at      TIMESTAMPTZ,
      operational_confidence_score REAL,
      confidence_calculated_at     TIMESTAMPTZ,
      created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ============================================================
    -- 6. compliance_documents
    -- ============================================================
    CREATE TABLE IF NOT EXISTS compliance_documents (
      id                  SERIAL PRIMARY KEY,
      shipment_id         INTEGER          REFERENCES shipments(id) ON DELETE SET NULL,
      driver_id           INTEGER          REFERENCES drivers(id) ON DELETE SET NULL,
      vehicle_id          INTEGER          REFERENCES vehicles(id) ON DELETE SET NULL,
      document_type       TEXT    NOT NULL,
      document_number     TEXT    NOT NULL,
      document_file_path  TEXT,
      issuing_authority   TEXT    NOT NULL,
      issued_date         DATE    NOT NULL,
      expiry_date         DATE,
      status              TEXT    NOT NULL DEFAULT 'valid'
                          CHECK (status IN ('valid', 'expiring_soon', 'expired', 'missing', 'under_review')),
      ai_verified         INTEGER NOT NULL DEFAULT 0,
      ai_notes            TEXT,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ============================================================
    -- 7. trip_events
    -- ============================================================
    CREATE TABLE IF NOT EXISTS trip_events (
      id                   SERIAL PRIMARY KEY,
      shipment_id          INTEGER NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
      event_type           TEXT    NOT NULL
                           CHECK (event_type IN ('departed', 'en_route', 'border_arrival', 'border_departure', 'checkpoint', 'delay', 'arrived', 'delivered')),
      latitude             DOUBLE PRECISION,
      longitude            DOUBLE PRECISION,
      speed_kmh            DOUBLE PRECISION,
      heading              DOUBLE PRECISION,
      location_description TEXT    NOT NULL DEFAULT '',
      recorded_at          TIMESTAMPTZ NOT NULL,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ============================================================
    -- 8. alerts
    -- ============================================================
    CREATE TABLE IF NOT EXISTS alerts (
      id               SERIAL PRIMARY KEY,
      shipment_id      INTEGER          REFERENCES shipments(id) ON DELETE SET NULL,
      driver_id        INTEGER          REFERENCES drivers(id) ON DELETE SET NULL,
      vehicle_id       INTEGER          REFERENCES vehicles(id) ON DELETE SET NULL,
      alert_type       TEXT    NOT NULL
                       CHECK (alert_type IN ('compliance', 'border', 'gps', 'delay', 'expiry', 'risk', 'system')),
      severity         TEXT    NOT NULL DEFAULT 'info'
                       CHECK (severity IN ('info', 'warning', 'critical')),
      title            TEXT    NOT NULL,
      description      TEXT    NOT NULL DEFAULT '',
      is_resolved      INTEGER NOT NULL DEFAULT 0,
      resolved_at      TIMESTAMPTZ,
      resolution_notes TEXT,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ============================================================
    -- 9. sessions
    -- ============================================================
    CREATE TABLE IF NOT EXISTS sessions (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token      TEXT    NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ============================================================
    -- 10. intelligence_briefs
    -- ============================================================
    CREATE TABLE IF NOT EXISTS intelligence_briefs (
      id                     SERIAL PRIMARY KEY,
      company_id             INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      brief_date             DATE    NOT NULL,
      generated_at           TIMESTAMPTZ NOT NULL,
      summary_json           TEXT    NOT NULL DEFAULT '{}',
      high_risk_count        INTEGER NOT NULL DEFAULT 0,
      mission_ready_count    INTEGER NOT NULL DEFAULT 0,
      compliance_alert_count INTEGER NOT NULL DEFAULT 0,
      created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // ═══════════════════════════════════════════════════════════════
  // Indexes (run after tables are created)
  // ═══════════════════════════════════════════════════════════════

  const indexes = [
    // shipments
    `CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status)`,
    `CREATE INDEX IF NOT EXISTS idx_shipments_company_id ON shipments(company_id)`,
    `CREATE INDEX IF NOT EXISTS idx_shipments_driver_id ON shipments(driver_id)`,
    `CREATE INDEX IF NOT EXISTS idx_shipments_vehicle_id ON shipments(vehicle_id)`,
    `CREATE INDEX IF NOT EXISTS idx_shipments_departure_scheduled ON shipments(departure_scheduled)`,
    `CREATE INDEX IF NOT EXISTS idx_shipments_compound ON shipments(status, company_id, departure_scheduled)`,

    // compliance_documents
    `CREATE INDEX IF NOT EXISTS idx_compliance_expiry ON compliance_documents(expiry_date)`,
    `CREATE INDEX IF NOT EXISTS idx_compliance_status ON compliance_documents(status)`,
    `CREATE INDEX IF NOT EXISTS idx_compliance_shipment ON compliance_documents(shipment_id)`,
    `CREATE INDEX IF NOT EXISTS idx_compliance_driver ON compliance_documents(driver_id)`,
    `CREATE INDEX IF NOT EXISTS idx_compliance_compound ON compliance_documents(expiry_date, status)`,

    // trip_events
    `CREATE INDEX IF NOT EXISTS idx_trip_events_shipment ON trip_events(shipment_id)`,
    `CREATE INDEX IF NOT EXISTS idx_trip_events_recorded ON trip_events(recorded_at)`,
    `CREATE INDEX IF NOT EXISTS idx_trip_events_compound ON trip_events(shipment_id, recorded_at)`,

    // alerts
    `CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(is_resolved)`,
    `CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity)`,
    `CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_alerts_compound ON alerts(is_resolved, severity, created_at)`,

    // drivers
    `CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status)`,
    `CREATE INDEX IF NOT EXISTS idx_drivers_company ON drivers(company_id)`,
    `CREATE INDEX IF NOT EXISTS idx_drivers_compound ON drivers(status, company_id)`,

    // vehicles
    `CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status)`,
    `CREATE INDEX IF NOT EXISTS idx_vehicles_company ON vehicles(company_id)`,
    `CREATE INDEX IF NOT EXISTS idx_vehicles_compound ON vehicles(status, company_id)`,

    // sessions
    `CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`,

    // intelligence_briefs
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_briefs_company_date ON intelligence_briefs(company_id, brief_date)`,
  ];

  for (const idxSql of indexes) {
    await db.exec(idxSql);
  }

  // ═══════════════════════════════════════════════════════════════
  // Migrations: add columns that may not exist on older tables
  // ═══════════════════════════════════════════════════════════════
  await db.exec(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS is_verified INTEGER NOT NULL DEFAULT 0`);
  await db.exec(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_verified INTEGER NOT NULL DEFAULT 0`);

  // Driver banking details
  await db.exec(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS bank_account_holder TEXT NOT NULL DEFAULT ''`);
  await db.exec(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS bank_name TEXT NOT NULL DEFAULT ''`);
  await db.exec(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS bank_account_number TEXT NOT NULL DEFAULT ''`);
  await db.exec(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS bank_account_type TEXT NOT NULL DEFAULT 'cheque'`);
  await db.exec(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS bank_branch_code TEXT NOT NULL DEFAULT ''`);
  await db.exec(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS bank_proof_document TEXT`);

  // ═══════════════════════════════════════════════════════════════
  // 11. settlements
  // ═══════════════════════════════════════════════════════════════
  await db.exec(`
    CREATE TABLE IF NOT EXISTS settlements (
      id                    SERIAL PRIMARY KEY,
      shipment_id           INTEGER NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
      driver_id             INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
      total_payment_received DECIMAL(12,2) NOT NULL DEFAULT 0,
      flowgrid_commission    DECIMAL(12,2) NOT NULL DEFAULT 0,
      driver_payable         DECIMAL(12,2) NOT NULL DEFAULT 0,
      payment_status         TEXT    NOT NULL DEFAULT 'pending'
                             CHECK (payment_status IN ('pending', 'approved', 'processing', 'paid', 'failed')),
      created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.exec(`CREATE INDEX IF NOT EXISTS idx_settlements_shipment ON settlements(shipment_id)`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_settlements_driver ON settlements(driver_id)`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(payment_status)`);
}
