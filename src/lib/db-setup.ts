import { getDb } from "./db";

/**
 * Initializes all database tables, indexes, and constraints.
 * Idempotent — safe to call on every application start.
 */
export function initializeDatabase(): void {
  const db = getDb();

  db.exec(`
    -- ============================================================
    -- 1. companies
    -- ============================================================
    CREATE TABLE IF NOT EXISTS companies (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      name                TEXT    NOT NULL,
      type                TEXT    NOT NULL CHECK (type IN ('mining', 'logistics', 'transporter')),
      email               TEXT    NOT NULL,
      phone               TEXT    NOT NULL,
      country             TEXT    NOT NULL,
      registration_number TEXT    NOT NULL,
      tax_id              TEXT    NOT NULL,
      created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- 2. users
    -- ============================================================
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id    INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      full_name     TEXT    NOT NULL,
      role          TEXT    NOT NULL CHECK (role IN ('admin', 'manager', 'operator', 'driver')),
      phone         TEXT    NOT NULL,
      is_active     INTEGER NOT NULL DEFAULT 1,
      last_login    TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- 3. drivers
    -- ============================================================
    CREATE TABLE IF NOT EXISTS drivers (
      id                        INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id                   INTEGER          REFERENCES users(id) ON DELETE SET NULL,
      company_id                INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      license_number            TEXT    NOT NULL,
      license_type              TEXT    NOT NULL,
      license_expiry            TEXT    NOT NULL,  -- DATE
      pdp_number                TEXT    NOT NULL,
      pdp_expiry                TEXT    NOT NULL,  -- DATE
      dg_endorsement            INTEGER NOT NULL DEFAULT 0,
      dg_expiry                 TEXT,              -- DATE, nullable
      medical_certificate_expiry TEXT   NOT NULL,  -- DATE
      passport_number           TEXT    NOT NULL,
      passport_expiry           TEXT    NOT NULL,  -- DATE
      yellow_fever_cert         INTEGER NOT NULL DEFAULT 0,
      hiv_cert_expiry           TEXT,              -- DATE, nullable
      status                    TEXT    NOT NULL DEFAULT 'available'
                                CHECK (status IN ('available', 'on_trip', 'off_duty', 'suspended')),
      created_at                TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at                TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- 4. vehicles
    -- ============================================================
    CREATE TABLE IF NOT EXISTS vehicles (
      id                           INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id                   INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      registration_number          TEXT    NOT NULL UNIQUE,
      vehicle_type                 TEXT    NOT NULL,
      make                         TEXT    NOT NULL,
      model                        TEXT    NOT NULL,
      year                         INTEGER NOT NULL,
      vin                          TEXT    NOT NULL,
      gvm                          REAL    NOT NULL,  -- kg
      max_payload                  REAL    NOT NULL,  -- kg
      registration_expiry          TEXT    NOT NULL,  -- DATE
      roadworthiness_expiry        TEXT    NOT NULL,  -- DATE
      insurance_type               TEXT    NOT NULL,
      insurance_expiry             TEXT    NOT NULL,  -- DATE
      cross_border_permit_number   TEXT    NOT NULL,
      cross_border_permit_expiry   TEXT    NOT NULL,  -- DATE
      is_dg_capable                INTEGER NOT NULL DEFAULT 0,
      status                       TEXT    NOT NULL DEFAULT 'available'
                                   CHECK (status IN ('available', 'on_trip', 'maintenance', 'retired')),
      created_at                   TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at                   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- 5. shipments
    -- ============================================================
    CREATE TABLE IF NOT EXISTS shipments (
      id                           INTEGER PRIMARY KEY AUTOINCREMENT,
      shipment_id                  TEXT    NOT NULL UNIQUE,  -- format SHIP-YYYY-NNNNN
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
      cargo_value                  INTEGER NOT NULL,  -- cents USD
      cargo_weight_kg              REAL    NOT NULL,
      is_dangerous_goods           INTEGER NOT NULL DEFAULT 0,
      dg_class                     TEXT,
      border_crossings             TEXT    NOT NULL DEFAULT '[]',  -- JSON array
      status                       TEXT    NOT NULL DEFAULT 'draft'
                                   CHECK (status IN ('draft', 'pending', 'ready', 'in_transit', 'at_border', 'delayed', 'completed', 'cancelled')),
      departure_scheduled          TEXT    NOT NULL,  -- DATETIME
      departure_actual             TEXT,              -- DATETIME
      eta                          TEXT,              -- DATETIME
      arrival_actual               TEXT,              -- DATETIME
      mission_readiness_score      INTEGER,          -- 0-100
      readiness_calculated_at      TEXT,              -- DATETIME
      operational_confidence_score REAL,              -- 0-1
      confidence_calculated_at     TEXT,              -- DATETIME
      created_at                   TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at                   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- 6. compliance_documents
    -- ============================================================
    CREATE TABLE IF NOT EXISTS compliance_documents (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      shipment_id         INTEGER          REFERENCES shipments(id) ON DELETE SET NULL,
      driver_id           INTEGER          REFERENCES drivers(id) ON DELETE SET NULL,
      vehicle_id          INTEGER          REFERENCES vehicles(id) ON DELETE SET NULL,
      document_type       TEXT    NOT NULL,
      document_number     TEXT    NOT NULL,
      document_file_path  TEXT,
      issuing_authority   TEXT    NOT NULL,
      issued_date         TEXT    NOT NULL,  -- DATE
      expiry_date         TEXT,              -- DATE
      status              TEXT    NOT NULL DEFAULT 'valid'
                          CHECK (status IN ('valid', 'expiring_soon', 'expired', 'missing', 'under_review')),
      ai_verified         INTEGER NOT NULL DEFAULT 0,
      ai_notes            TEXT,
      created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- 7. trip_events
    -- ============================================================
    CREATE TABLE IF NOT EXISTS trip_events (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      shipment_id          INTEGER NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
      event_type           TEXT    NOT NULL
                           CHECK (event_type IN ('departed', 'en_route', 'border_arrival', 'border_departure', 'checkpoint', 'delay', 'arrived', 'delivered')),
      latitude             REAL,
      longitude            REAL,
      speed_kmh            REAL,
      heading              REAL,
      location_description TEXT    NOT NULL DEFAULT '',
      recorded_at          TEXT    NOT NULL,  -- DATETIME
      created_at           TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- 8. alerts
    -- ============================================================
    CREATE TABLE IF NOT EXISTS alerts (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
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
      resolved_at      TEXT,              -- DATETIME
      resolution_notes TEXT,
      created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- 9. intelligence_briefs
    -- ============================================================
    CREATE TABLE IF NOT EXISTS intelligence_briefs (
      id                     INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id             INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      brief_date             TEXT    NOT NULL,  -- DATE
      generated_at           TEXT    NOT NULL,  -- DATETIME
      summary_json           TEXT    NOT NULL DEFAULT '{}',  -- JSON blob
      high_risk_count        INTEGER NOT NULL DEFAULT 0,
      mission_ready_count    INTEGER NOT NULL DEFAULT 0,
      compliance_alert_count INTEGER NOT NULL DEFAULT 0,
      created_at             TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- Indexes
    -- ============================================================

    -- shipments: fast lookups by status, company, driver, vehicle, departure
    CREATE INDEX IF NOT EXISTS idx_shipments_status
      ON shipments(status);
    CREATE INDEX IF NOT EXISTS idx_shipments_company_id
      ON shipments(company_id);
    CREATE INDEX IF NOT EXISTS idx_shipments_driver_id
      ON shipments(driver_id);
    CREATE INDEX IF NOT EXISTS idx_shipments_vehicle_id
      ON shipments(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_shipments_departure_scheduled
      ON shipments(departure_scheduled);
    CREATE INDEX IF NOT EXISTS idx_shipments_compound
      ON shipments(status, company_id, departure_scheduled);

    -- compliance_documents: expiry tracking and entity lookups
    CREATE INDEX IF NOT EXISTS idx_compliance_expiry
      ON compliance_documents(expiry_date);
    CREATE INDEX IF NOT EXISTS idx_compliance_status
      ON compliance_documents(status);
    CREATE INDEX IF NOT EXISTS idx_compliance_shipment
      ON compliance_documents(shipment_id);
    CREATE INDEX IF NOT EXISTS idx_compliance_driver
      ON compliance_documents(driver_id);
    CREATE INDEX IF NOT EXISTS idx_compliance_compound
      ON compliance_documents(expiry_date, status);

    -- trip_events: chronological lookups per shipment
    CREATE INDEX IF NOT EXISTS idx_trip_events_shipment
      ON trip_events(shipment_id);
    CREATE INDEX IF NOT EXISTS idx_trip_events_recorded
      ON trip_events(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_trip_events_compound
      ON trip_events(shipment_id, recorded_at);

    -- alerts: unresolved first, then by severity and recency
    CREATE INDEX IF NOT EXISTS idx_alerts_resolved
      ON alerts(is_resolved);
    CREATE INDEX IF NOT EXISTS idx_alerts_severity
      ON alerts(severity);
    CREATE INDEX IF NOT EXISTS idx_alerts_created
      ON alerts(created_at);
    CREATE INDEX IF NOT EXISTS idx_alerts_compound
      ON alerts(is_resolved, severity, created_at);

    -- drivers: status and company filtering
    CREATE INDEX IF NOT EXISTS idx_drivers_status
      ON drivers(status);
    CREATE INDEX IF NOT EXISTS idx_drivers_company
      ON drivers(company_id);
    CREATE INDEX IF NOT EXISTS idx_drivers_compound
      ON drivers(status, company_id);

    -- vehicles: status and company filtering
    CREATE INDEX IF NOT EXISTS idx_vehicles_status
      ON vehicles(status);
    CREATE INDEX IF NOT EXISTS idx_vehicles_company
      ON vehicles(company_id);
    CREATE INDEX IF NOT EXISTS idx_vehicles_compound
      ON vehicles(status, company_id);

    -- intelligence_briefs: one brief per company per day
    CREATE UNIQUE INDEX IF NOT EXISTS idx_briefs_company_date
      ON intelligence_briefs(company_id, brief_date);
  `);
}
