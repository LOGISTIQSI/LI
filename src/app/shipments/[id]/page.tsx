"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Package,
  MapPin,
  User,
  Truck,
  ShieldCheck,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Flag,
  Loader2,
  ChevronRight,
  FileText,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  XCircle,
} from "lucide-react";
import ScoreGauge from "@/components/ui/ScoreGauge";

// Dynamic Leaflet import (no SSR)
const ShipmentMap = dynamic(() => import("./ShipmentMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
      <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
    </div>
  ),
});

// ── Types ──

interface ShipmentDetail {
  id: number;
  shipment_id: string;
  origin: string;
  destination: string;
  origin_country: string;
  destination_country: string;
  cargo_type: string;
  cargo_description: string;
  cargo_hs_code: string;
  cargo_value: number;
  cargo_weight_kg: number;
  is_dangerous_goods: number;
  dg_class: string | null;
  border_crossings: string;
  status: string;
  departure_scheduled: string;
  departure_actual: string | null;
  eta: string | null;
  arrival_actual: string | null;
  mission_readiness_score: number | null;
  operational_confidence_score: number | null;
  driver_name: string | null;
  driver_license: string | null;
  driver_license_type: string | null;
  driver_status: string | null;
  vehicle_registration: string | null;
  vehicle_type: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  logistics_company_name: string | null;
  mining_company_name: string | null;
  created_at: string;
}

interface TripEvent {
  id: number;
  event_type: string;
  location_description: string;
  recorded_at: string;
  latitude: number | null;
  longitude: number | null;
}

interface ComplianceDoc {
  id: number;
  document_type: string;
  document_number: string;
  status: string;
  expiry_date: string | null;
  issuing_authority: string;
  ai_verified: number;
}

interface FactorResult {
  factor: string;
  label: string;
  weight: number;
  rawScore: number;
  weightedScore: number;
  details: string[];
}

interface ReadinessResult {
  score: number;
  threshold: string;
  hardGateTriggered: boolean;
  hardGateReason: string | null;
  factors: FactorResult[];
  calculatedAt: string;
}

interface ConfidenceResult {
  score: number;
  threshold: string;
  factors: FactorResult[];
  calculatedAt: string;
}

// ── Event helpers ──

const EVENT_LABELS: Record<string, string> = {
  departed: "Departed",
  en_route: "En Route",
  border_arrival: "Border Arrival",
  border_departure: "Border Departure",
  checkpoint: "Checkpoint",
  delay: "Delay",
  arrived: "Arrived",
  delivered: "Delivered",
};

const EVENT_DOT_CLASSES: Record<string, string> = {
  departed: "bg-blue-100 dark:bg-blue-950/50 text-blue-500 border-blue-300 dark:border-blue-800",
  en_route: "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700",
  border_arrival: "bg-purple-100 dark:bg-purple-950/50 text-purple-500 border-purple-300 dark:border-purple-800",
  border_departure: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-500 border-emerald-300 dark:border-emerald-800",
  checkpoint: "bg-amber-100 dark:bg-amber-950/50 text-amber-500 border-amber-300 dark:border-amber-800",
  delay: "bg-red-100 dark:bg-red-950/50 text-red-500 border-red-300 dark:border-red-800",
  arrived: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-500 border-emerald-300 dark:border-emerald-800",
  delivered: "bg-green-100 dark:bg-green-950/50 text-green-500 border-green-300 dark:border-green-800",
};

function statusBadge(status: string) {
  const map: Record<string, { label: string; classes: string }> = {
    draft: { label: "Draft", classes: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700" },
    ready: { label: "Ready", classes: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
    in_transit: { label: "In Transit", classes: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
    at_border: { label: "At Border", classes: "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800" },
    delayed: { label: "Delayed", classes: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
    completed: { label: "Completed", classes: "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800" },
    cancelled: { label: "Cancelled", classes: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800" },
    pending: { label: "Pending", classes: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700" },
  };
  const s = map[status] || map.draft;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${s.classes}`}>
      {s.label}
    </span>
  );
}

function docStatusBadge(status: string) {
  const map: Record<string, { icon: React.ReactNode; classes: string }> = {
    valid: { icon: <CheckCircle2 className="h-3 w-3" />, classes: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
    expiring_soon: { icon: <Clock className="h-3 w-3" />, classes: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
    expired: { icon: <XCircle className="h-3 w-3" />, classes: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800" },
    missing: { icon: <AlertTriangle className="h-3 w-3" />, classes: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700" },
    under_review: { icon: <Clock className="h-3 w-3" />, classes: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800" },
  };
  const s = map[status] || map.missing;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.classes}`}>
      {s.icon}
      {status.replace(/_/g, " ")}
    </span>
  );
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.replace(" ", "T"));
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso.replace(" ", "T")).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ── Main Page ──

export default function ShipmentDetailPage() {
  const params = useParams();
  const [data, setData] = useState<{
    shipment: ShipmentDetail;
    events: TripEvent[];
    documents: ComplianceDoc[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recalculating, setRecalculating] = useState(false);
  const [mrsResult, setMrsResult] = useState<ReadinessResult | null>(null);
  const [ocsResult, setOcsResult] = useState<ConfidenceResult | null>(null);
  const [showMrsFactors, setShowMrsFactors] = useState(false);
  const [showOcsFactors, setShowOcsFactors] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "tracking" | "timeline" | "documents">("overview");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/shipments/${params.id}`);
        if (!res.ok) throw new Error("Shipment not found");
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load shipment");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  const handleReevaluateReadiness = useCallback(async () => {
    if (!data) return;
    setRecalculating(true);
    try {
      const [mrsRes, ocsRes] = await Promise.all([
        fetch(`/api/shipments/${data.shipment.id}/readiness`, { method: "POST" }),
        fetch(`/api/shipments/${data.shipment.id}/confidence`, { method: "POST" }),
      ]);
      if (mrsRes.ok) {
        const result: ReadinessResult = await mrsRes.json();
        setMrsResult(result);
        setData((prev) => prev ? { ...prev, shipment: { ...prev.shipment, mission_readiness_score: result.score } } : prev);
      }
      if (ocsRes.ok) {
        const result: ConfidenceResult = await ocsRes.json();
        setOcsResult(result);
        setData((prev) => prev ? { ...prev, shipment: { ...prev.shipment, operational_confidence_score: result.score } } : prev);
      }
    } catch { /* ignore */ }
    setRecalculating(false);
  }, [data]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-6xl mx-auto py-20 text-center">
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">{error || "Shipment not found"}</h2>
        <Link href="/shipments" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">← Back to shipments</Link>
      </div>
    );
  }

  const { shipment, events, documents } = data;
  const borders: string[] = JSON.parse(shipment.border_crossings || "[]");
  const mrsScore = mrsResult?.score ?? shipment.mission_readiness_score;
  const ocsScore = ocsResult?.score ?? shipment.operational_confidence_score;
  const ocsPct = ocsScore !== null ? Math.round(ocsScore * 100) : null;
  const mrsFactors = mrsResult?.factors ?? null;
  const ocsFactors = ocsResult?.factors ?? null;

  const mrsThresholdLabel = mrsResult?.threshold === "green" ? "Mission Ready" :
    mrsResult?.threshold === "amber" ? "Caution" :
    mrsResult?.threshold === "red" ? "Not Ready" :
    mrsScore !== null ? (mrsScore >= 80 ? "Mission Ready" : mrsScore >= 50 ? "Caution" : "Not Ready") : "Unknown";

  const ocsThresholdLabel = ocsResult?.threshold === "on_track" ? "On Track" :
    ocsResult?.threshold === "at_risk" ? "At Risk" :
    ocsResult?.threshold === "critical" ? "Critical" :
    ocsPct !== null ? (ocsPct >= 85 ? "On Track" : ocsPct >= 60 ? "At Risk" : "Critical") : "Unknown";

  const mrsColorThresholds = [
    { upTo: 49, color: "text-red-500", bgColor: "text-red-500" },
    { upTo: 79, color: "text-amber-500", bgColor: "text-amber-500" },
    { upTo: 100, color: "text-emerald-500", bgColor: "text-emerald-500" },
  ];
  const ocsColorThresholds = [
    { upTo: 59, color: "text-red-500", bgColor: "text-red-500" },
    { upTo: 84, color: "text-amber-500", bgColor: "text-amber-500" },
    { upTo: 100, color: "text-emerald-500", bgColor: "text-emerald-500" },
  ];

  const validDocs = documents.filter((d) => d.status === "valid").length;
  const missingDocs = documents.filter((d) => d.status === "missing").length;
  const expiringDocs = documents.filter((d) => d.status === "expiring_soon" || d.status === "expired").length;

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: Package },
    { key: "tracking" as const, label: "Tracking", icon: MapPin },
    { key: "timeline" as const, label: "Timeline", icon: Clock },
    { key: "documents" as const, label: "Documents", icon: FileText },
  ];

  // Route coordinates for map
  const routePoints: [number, number][] = events
    .filter((e) => e.latitude && e.longitude)
    .map((e) => [e.latitude!, e.longitude!]);
  const currentPos = routePoints.length > 0 ? routePoints[routePoints.length - 1] : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Back + Header ── */}
      <div className="flex items-center gap-4">
        <Link href="/shipments" className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <ArrowLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{shipment.shipment_id}</h1>
            {statusBadge(shipment.status)}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Created {formatDate(shipment.created_at)}</p>
        </div>
      </div>

      {/* ── Status Bar: Scores ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4">
          <ScoreGauge value={mrsScore ?? 0} size={80} label="" colorThresholds={mrsColorThresholds} thresholdLabel={mrsThresholdLabel} />
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Mission Readiness</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{mrsThresholdLabel}</p>
            {mrsResult?.hardGateTriggered && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Hard gate triggered
              </p>
            )}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4">
          <ScoreGauge value={ocsPct ?? 0} size={80} label="" colorThresholds={ocsColorThresholds} thresholdLabel={ocsThresholdLabel} />
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Operational Confidence</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{ocsThresholdLabel}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mb-2">Trip Route</p>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <span className="text-slate-900 dark:text-white font-medium truncate">{shipment.origin}</span>
            <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0" />
            <MapPin className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <span className="text-slate-900 dark:text-white font-medium truncate">{shipment.destination}</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {borders.length > 0 ? `via ${borders.join(", ")}` : "No border crossings"}
          </p>
        </div>
      </div>

      {/* ── Re-evaluate Button ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleReevaluateReadiness}
          disabled={recalculating}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
        >
          {recalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {recalculating ? "Re-evaluating…" : "Re-evaluate Readiness"}
        </button>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex items-center gap-0 border-b border-slate-200 dark:border-slate-800">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === t.key
                ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Shipment Info */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-500" /> Shipment Information
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  ["Shipment ID", shipment.shipment_id, "font-mono"],
                  ["Status", statusBadge(shipment.status), ""],
                  ["Cargo Type", shipment.cargo_type + (shipment.is_dangerous_goods ? " ⚠ DG" : ""), "font-medium"],
                  ["HS Code", shipment.cargo_hs_code || "—", ""],
                  ["Weight", `${shipment.cargo_weight_kg.toLocaleString()} kg`, "font-medium"],
                  ["Declared Value", `$${(shipment.cargo_value / 100).toLocaleString()} USD`, "font-medium"],
                ].map(([label, value, extra], i) => (
                  <div key={i}>
                    <dt className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">{label}</dt>
                    <dd className={`text-sm mt-0.5 ${extra} text-slate-900 dark:text-white`}>{value}</dd>
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Description</dt>
                  <dd className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{shipment.cargo_description || "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Border Crossings</dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {borders.length === 0 ? <span className="text-sm text-slate-400">None</span> : borders.map((b) => (
                      <span key={b} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300">{b}</span>
                    ))}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Factor breakdowns */}
            {(mrsFactors || ocsFactors) && (
              <div className="grid grid-cols-1 gap-4">
                {mrsFactors && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                    <button onClick={() => setShowMrsFactors(!showMrsFactors)} className="w-full flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-blue-500" /> Mission Readiness Breakdown
                      </h3>
                      {showMrsFactors ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </button>
                    {showMrsFactors && (
                      <div className="mt-4 space-y-2">
                        {mrsResult?.hardGateTriggered && (
                          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 mb-3">
                            <p className="text-xs font-semibold text-red-700 dark:text-red-400">⚠ Hard Gate — Score Capped at 49</p>
                            <p className="text-xs text-red-600 dark:text-red-400">{mrsResult.hardGateReason}</p>
                          </div>
                        )}
                        {mrsFactors.map((f) => (
                          <div key={f.factor} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                            <span className="text-sm text-slate-700 dark:text-slate-300">{f.label}</span>
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                              f.rawScore >= 80 ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" :
                              f.rawScore >= 50 ? "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400" :
                              "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400"
                            }`}>{f.rawScore}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {ocsFactors && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                    <button onClick={() => setShowOcsFactors(!showOcsFactors)} className="w-full flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" /> Operational Confidence Breakdown
                      </h3>
                      {showOcsFactors ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </button>
                    {showOcsFactors && (
                      <div className="mt-4 space-y-2">
                        {ocsFactors.map((f) => (
                          <div key={f.factor} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                            <span className="text-sm text-slate-700 dark:text-slate-300">{f.label}</span>
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                              f.rawScore >= 0.85 ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" :
                              f.rawScore >= 0.60 ? "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400" :
                              "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400"
                            }`}>{Math.round(f.rawScore * 100)}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar: Assignment, Schedule, Compliance */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" /> Schedule
              </h3>
              <div className="space-y-2">
                {[
                  ["Scheduled Departure", formatDateTime(shipment.departure_scheduled)],
                  ...(shipment.departure_actual ? [["Actual Departure", formatDateTime(shipment.departure_actual)]] as const : []),
                  ["ETA", formatDateTime(shipment.eta)],
                  ...(shipment.arrival_actual ? [["Actual Arrival", formatDateTime(shipment.arrival_actual)]] as const : []),
                ].map(([label, value], i) => (
                  <div key={i}>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <User className="h-4 w-4 text-blue-500" /> Assignment
              </h3>
              <div className="space-y-2">
                <div><p className="text-xs text-slate-500 dark:text-slate-400">Driver</p><p className="text-sm font-medium text-slate-900 dark:text-white">{shipment.driver_name || "Unassigned"}</p></div>
                <div><p className="text-xs text-slate-500 dark:text-slate-400">Vehicle</p><p className="text-sm font-medium text-slate-900 dark:text-white">{shipment.vehicle_registration || "Unassigned"}</p></div>
                <div><p className="text-xs text-slate-500 dark:text-slate-400">Logistics Co.</p><p className="text-sm font-medium text-slate-900 dark:text-white">{shipment.logistics_company_name || "—"}</p></div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-500" /> Compliance
              </h3>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{validDocs}</p>
                  <p className="text-[9px] text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-semibold">Valid</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{expiringDocs}</p>
                  <p className="text-[9px] text-amber-700 dark:text-amber-400 uppercase tracking-wider font-semibold">Expiring</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-red-50 dark:bg-red-950/20">
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">{missingDocs}</p>
                  <p className="text-[9px] text-red-700 dark:text-red-400 uppercase tracking-wider font-semibold">Missing</p>
                </div>
              </div>
              <Link href="/compliance" className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                View all compliance <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {activeTab === "tracking" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <ShipmentMap
              origin={shipment.origin}
              destination={shipment.destination}
              events={events}
              currentPosition={currentPos}
              routePoints={routePoints}
            />
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Trip Progress</h3>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${shipment.status === "completed" ? 100 : shipment.status === "delayed" ? 65 : shipment.status === "in_transit" ? 45 : 10}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{shipment.origin_country}</span>
              <span>{shipment.destination_country}</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === "timeline" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" /> Trip Timeline
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">{events.length} events recorded</p>
          {events.length === 0 ? (
            <div className="flex items-center gap-3 py-2">
              <Circle className="h-4 w-4 text-slate-300 dark:text-slate-600" />
              <span className="text-sm text-slate-400 dark:text-slate-500">No events recorded yet</span>
            </div>
          ) : (
            <div className="relative pl-8">
              {/* Vertical line */}
              <div className="absolute left-[11px] top-1 bottom-1 w-0.5 bg-slate-200 dark:bg-slate-700" />
              <div className="space-y-0">
                {events.map((event, i) => {
                  const dotClass = EVENT_DOT_CLASSES[event.event_type] || EVENT_DOT_CLASSES.en_route;
                  return (
                    <div key={event.id} className="relative pb-5 last:pb-0">
                      {/* Dot */}
                      <div className={`absolute left-[-20px] top-1 z-10 flex items-center justify-center h-[22px] w-[22px] rounded-full border-2 ${dotClass}`}>
                        {event.event_type === "delay" ? (
                          <AlertTriangle className="h-3 w-3" />
                        ) : event.event_type === "border_arrival" || event.event_type === "border_departure" ? (
                          <Flag className="h-3 w-3" />
                        ) : event.event_type === "arrived" || event.event_type === "delivered" ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <Circle className="h-3 w-3" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">
                            {EVENT_LABELS[event.event_type] || event.event_type}
                          </span>
                          <span className="text-xs text-slate-400">{formatDateTime(event.recorded_at)}</span>
                        </div>
                        {event.location_description && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{event.location_description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "documents" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{validDocs}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Valid</p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-center">
                <Clock className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{expiringDocs}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Expiring</p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-center">
                <XCircle className="h-5 w-5 text-red-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{missingDocs}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Missing</p>
              </div>
            </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Compliance Documents ({documents.length})
              </h3>
            </div>
            {documents.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No documents on file for this shipment</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white capitalize truncate">
                          {doc.document_type.replace(/_/g, " ")}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{doc.document_number}</span>
                          <span className="text-xs text-slate-400">{doc.issuing_authority}</span>
                          {doc.expiry_date && (
                            <span className="text-xs text-slate-400">Expires: {formatDate(doc.expiry_date)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {doc.ai_verified ? (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> AI Verified
                        </span>
                      ) : null}
                      {docStatusBadge(doc.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
