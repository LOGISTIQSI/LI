// ── Core Entities ──

export interface Shipment {
  id: string;
  externalRef: string;
  status: "draft" | "ready" | "in_transit" | "delivered" | "cancelled" | "delayed";
  origin: string;
  destination: string;
  cargoType: string;
  cargoDescription: string;
  weightKg: number;
  departureScheduled: string; // ISO datetime
  arrivalEstimated: string;
  arrivalActual: string | null;
  missionReadinessScore: number; // 0–100
  operationalConfidenceScore: number; // 0.0–1.0
  vehicleId: string;
  driverId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  licenseExpiry: string;
  medicalCertExpiry: string;
  status: "active" | "on_leave" | "suspended" | "inactive";
  certifications: string[]; // JSON array of certification codes
  fatigueRiskScore: number;
  totalHoursThisWeek: number;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  registrationNumber: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  type: "truck" | "trailer" | "light_commercial";
  capacityKg: number;
  status: "available" | "assigned" | "in_maintenance" | "out_of_service";
  lastMaintenanceDate: string;
  nextMaintenanceDue: string;
  insuranceExpiry: string;
  permitExpiry: string;
  gpsDeviceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceDocument {
  id: string;
  entityType: "driver" | "vehicle" | "shipment";
  entityId: string;
  documentType: string;
  documentNumber: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate: string;
  status: "valid" | "expiring_soon" | "expired" | "missing";
  filePath: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface TripEvent {
  id: string;
  shipmentId: string;
  eventType:
    | "departure"
    | "checkpoint"
    | "border_crossing"
    | "delay"
    | "incident"
    | "delivery";
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  locationDescription: string;
  notes: string;
  createdAt: string;
}

export interface Alert {
  id: string;
  alertType: "compliance" | "risk" | "delay" | "maintenance" | "fatigue" | "weather" | "border";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  entityType: "shipment" | "driver" | "vehicle";
  entityId: string;
  acknowledged: boolean;
  resolved: boolean;
  recommendedAction: string;
  createdAt: string;
  updatedAt: string;
}
