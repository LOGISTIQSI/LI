// ── Enums / Union Types ──

export type CompanyType = "mining" | "logistics" | "transporter";

export type UserRole = "admin" | "manager" | "operator" | "driver";

export type DriverStatus = "available" | "on_trip" | "off_duty" | "suspended";

export type VehicleStatus = "available" | "on_trip" | "maintenance" | "retired";

export type ShipmentStatus =
  | "draft"
  | "pending"
  | "ready"
  | "in_transit"
  | "at_border"
  | "delayed"
  | "completed"
  | "cancelled";

export type DocumentStatus =
  | "valid"
  | "expiring_soon"
  | "expired"
  | "missing"
  | "under_review";

export type TripEventType =
  | "departed"
  | "en_route"
  | "border_arrival"
  | "border_departure"
  | "checkpoint"
  | "delay"
  | "arrived"
  | "delivered";

export type AlertType =
  | "compliance"
  | "border"
  | "gps"
  | "delay"
  | "expiry"
  | "risk"
  | "system";

export type AlertSeverity = "info" | "warning" | "critical";

// ── Core Entities ──

export interface Company {
  id: number;
  name: string;
  type: CompanyType;
  email: string;
  phone: string;
  country: string;
  registration_number: string;
  tax_id: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  company_id: number;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  phone: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: number;
  user_id: number | null;
  company_id: number;
  license_number: string;
  license_type: string;
  license_expiry: string; // DATE
  pdp_number: string;
  pdp_expiry: string; // DATE
  dg_endorsement: boolean;
  dg_expiry: string | null; // DATE, nullable
  medical_certificate_expiry: string; // DATE
  passport_number: string;
  passport_expiry: string; // DATE
  yellow_fever_cert: boolean;
  hiv_cert_expiry: string | null; // DATE, nullable
  status: DriverStatus;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: number;
  company_id: number;
  registration_number: string;
  vehicle_type: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  gvm: number; // kg
  max_payload: number; // kg
  registration_expiry: string; // DATE
  roadworthiness_expiry: string; // DATE
  insurance_type: string;
  insurance_expiry: string; // DATE
  cross_border_permit_number: string;
  cross_border_permit_expiry: string; // DATE
  is_dg_capable: boolean;
  status: VehicleStatus;
  created_at: string;
  updated_at: string;
}

export interface Shipment {
  id: number;
  shipment_id: string; // format SHIP-YYYY-NNNNN
  company_id: number;
  logistics_company_id: number | null;
  driver_id: number | null;
  vehicle_id: number | null;
  origin: string;
  destination: string;
  origin_country: string;
  destination_country: string;
  cargo_type: string;
  cargo_description: string;
  cargo_hs_code: string;
  cargo_value: number; // cents USD
  cargo_weight_kg: number;
  is_dangerous_goods: boolean;
  dg_class: string | null;
  border_crossings: string; // JSON array of border names
  status: ShipmentStatus;
  departure_scheduled: string; // DATETIME
  departure_actual: string | null; // DATETIME
  eta: string | null; // DATETIME
  arrival_actual: string | null; // DATETIME
  mission_readiness_score: number | null; // 0-100
  readiness_calculated_at: string | null; // DATETIME
  operational_confidence_score: number | null; // 0-1
  confidence_calculated_at: string | null; // DATETIME
  created_at: string;
  updated_at: string;
}

export interface ComplianceDocument {
  id: number;
  shipment_id: number | null;
  driver_id: number | null;
  vehicle_id: number | null;
  document_type: string;
  document_number: string;
  document_file_path: string | null;
  issuing_authority: string;
  issued_date: string; // DATE
  expiry_date: string | null; // DATE
  status: DocumentStatus;
  ai_verified: boolean;
  ai_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripEvent {
  id: number;
  shipment_id: number;
  event_type: TripEventType;
  latitude: number | null;
  longitude: number | null;
  speed_kmh: number | null;
  heading: number | null;
  location_description: string;
  recorded_at: string; // DATETIME
  created_at: string;
}

export interface Alert {
  id: number;
  shipment_id: number | null;
  driver_id: number | null;
  vehicle_id: number | null;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  is_resolved: boolean;
  resolved_at: string | null; // DATETIME
  resolution_notes: string | null;
  created_at: string;
}

export interface IntelligenceBrief {
  id: number;
  company_id: number;
  brief_date: string; // DATE
  generated_at: string; // DATETIME
  summary_json: string; // JSON blob
  high_risk_count: number;
  mission_ready_count: number;
  compliance_alert_count: number;
  created_at: string;
}
