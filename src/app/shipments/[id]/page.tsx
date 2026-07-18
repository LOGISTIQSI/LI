"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
} from "lucide-react";
import ScoreGauge from "@/components/ui/ScoreGauge";

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

const EVENT_ICONS: Record<string, React.ReactNode> = {
  departed: <Flag className="h-4 w-4 text-blue-500" />,
  en_route: <Truck className="h-4 w-4 text-slate-400" />,
  border_arrival: <Flag className="h-4 w-4 text-purple-500" />,
  border_departure: <Flag className="h-4 w-4 text-emerald-500" />,
  checkpoint: <MapPin className="h-4 w-4 text-amber-500" />,
  delay: <AlertTriangle className="h-4 w-4 text-red-500" />,
  arrived: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  delivered: <CheckCircle2 className="h-4 w-4 text-green-600" />,
};

function statusBadge(status: string) {
  const map: Record<string, { label: string; classes: string }> = {
    draft: {
      label: "Draft",
      classes:
        "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
    },
    ready: {
      label: "Ready",
      classes:
        "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    },
    in_transit: {
      label: "In Transit",
      classes:
        "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    },
    at_border: {
      label: "At Border",
      classes:
        "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    },
    delayed: {
      label: "Delayed",
      classes:
        "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    },
    completed: {
      label: "Completed",
      classes:
        "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
    },
    cancelled: {
      label: "Cancelled",
      classes:
        "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
    },
    pending: {
      label: "Pending",
      classes:
        "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
    },
  };
  const s = map[status] || map.draft;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${s.classes}`}
    >
      {s.label}
    </span>
  );
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.replace(" ", "T"));
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.replace(" ", "T"));
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/shipments/${params.id}`);
        if (!res.ok) throw new Error("Shipment not found");
        const json = await res.json();
        setData(json);
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
      const res = await fetch(`/api/shipments/${data.shipment.id}/readiness`, {
        method: "POST",
      });
      if (res.ok) {
        const result: ReadinessResult = await res.json();
        setMrsResult(result);
        // Also update the local shipment data with the new score
        setData((prev) =>
          prev
            ? { ...prev, shipment: { ...prev.shipment, mission_readiness_score: result.score } }
            : prev
        );
      }
    } catch (err) {
      console.error("Failed to re-evaluate readiness:", err);
    }

    // Also recalculate confidence
    try {
      const res = await fetch(`/api/shipments/${data.shipment.id}/confidence`, {
        method: "POST",
      });
      if (res.ok) {
        const result: ConfidenceResult = await res.json();
        setOcsResult(result);
        setData((prev) =>
          prev
            ? {
                ...prev,
                shipment: {
                  ...prev.shipment,
                  operational_confidence_score: result.score,
                },
              }
            : prev
        );
      }
    } catch (err) {
      console.error("Failed to re-evaluate confidence:", err);
    }

    setRecalculating(false);
  }, [data]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto py-20 text-center">
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
          {error || "Shipment not found"}
        </h2>
        <Link
          href="/shipments"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Back to shipments
        </Link>
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

  // Determine MRS threshold label
  const mrsThresholdLabel =
    mrsResult?.threshold === "green"
      ? "Mission Ready"
      : mrsResult?.threshold === "amber"
      ? "Caution"
      : mrsResult?.threshold === "red"
      ? "Not Ready"
      : mrsScore !== null
      ? mrsScore >= 80
        ? "Mission Ready"
        : mrsScore >= 50
        ? "Caution"
        : "Not Ready"
      : "Unknown";

  // Determine OCS threshold label
  const ocsThresholdLabel =
    ocsResult?.threshold === "on_track"
      ? "On Track"
      : ocsResult?.threshold === "at_risk"
      ? "At Risk"
      : ocsResult?.threshold === "critical"
      ? "Critical"
      : ocsPct !== null
      ? ocsPct >= 85
        ? "On Track"
        : ocsPct >= 60
        ? "At Risk"
        : "Critical"
      : "Unknown";

  // MRS color thresholds
  const mrsColorThresholds = [
    { upTo: 49, color: "text-red-500", bgColor: "text-red-500" },
    { upTo: 79, color: "text-amber-500", bgColor: "text-amber-500" },
    { upTo: 100, color: "text-emerald-500", bgColor: "text-emerald-500" },
  ];

  // OCS color thresholds
  const ocsColorThresholds = [
    { upTo: 59, color: "text-red-500", bgColor: "text-red-500" },
    { upTo: 84, color: "text-amber-500", bgColor: "text-amber-500" },
    { upTo: 100, color: "text-emerald-500", bgColor: "text-emerald-500" },
  ];

  // Doc stats
  const totalDocs = documents.length;
  const validDocs = documents.filter((d) => d.status === "valid").length;
  const missingDocs = documents.filter((d) => d.status === "missing").length;
  const expiringDocs = documents.filter(
    (d) => d.status === "expiring_soon" || d.status === "expired"
  ).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back + header */}
      <div className="flex items-center gap-4">
        <Link
          href="/shipments"
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {shipment.shipment_id}
            </h1>
            {statusBadge(shipment.status)}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Created {formatDate(shipment.created_at)}
          </p>
        </div>
      </div>

      {/* Status Bar: Scores */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Mission Readiness Score */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4">
          <ScoreGauge
            value={mrsScore ?? 0}
            size={80}
            label=""
            colorThresholds={mrsColorThresholds}
            thresholdLabel={mrsThresholdLabel}
          />
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              Mission Readiness
            </p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {mrsThresholdLabel}
            </p>
            {mrsResult?.hardGateTriggered && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Hard gate triggered
              </p>
            )}
          </div>
        </div>

        {/* Operational Confidence */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4">
          <ScoreGauge
            value={ocsPct ?? 0}
            size={80}
            label=""
            colorThresholds={ocsColorThresholds}
            thresholdLabel={ocsThresholdLabel}
          />
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              Operational Confidence
            </p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {ocsThresholdLabel}
            </p>
            {ocsResult && (
              <p className="text-xs text-slate-400 mt-1">
                Score: {ocsResult.score.toFixed(3)}
              </p>
            )}
          </div>
        </div>

        {/* Trip Progress */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mb-2">
            Trip Progress
          </p>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span className="text-slate-900 dark:text-white font-medium truncate">
              {shipment.origin}
            </span>
            <ChevronRight className="h-4 w-4 text-slate-300" />
            <MapPin className="h-4 w-4 text-blue-500" />
            <span className="text-slate-900 dark:text-white font-medium truncate">
              {shipment.destination}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {borders.length > 0
              ? `via ${borders.join(", ")}`
              : "No border crossings"}
          </p>
        </div>
      </div>

      {/* Re-evaluate Button */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleReevaluateReadiness}
          disabled={recalculating}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
        >
          {recalculating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {recalculating ? "Re-evaluating…" : "Re-evaluate Readiness"}
        </button>
        {mrsResult && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Last calculated: {formatDateTime(mrsResult.calculatedAt)}
          </span>
        )}
      </div>

      {/* Factor Breakdown */}
      {(mrsFactors || ocsFactors) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* MRS Factor Breakdown */}
          {mrsFactors && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <button
                onClick={() => setShowMrsFactors(!showMrsFactors)}
                className="w-full flex items-center justify-between"
              >
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-500" />
                  Mission Readiness Breakdown
                </h3>
                {showMrsFactors ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </button>

              {showMrsFactors && (
                <div className="mt-4 space-y-3">
                  {mrsResult?.hardGateTriggered && mrsResult.hardGateReason && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50">
                      <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">
                        ⚠ Hard Gate Triggered — Score Capped at 49
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {mrsResult.hardGateReason}
                      </p>
                    </div>
                  )}
                  {mrsFactors.map((f) => (
                    <div
                      key={f.factor}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                              f.rawScore >= 80
                                ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                                : f.rawScore >= 50
                                ? "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                                : "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400"
                            }`}
                          >
                            {f.rawScore}%
                          </span>
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            {f.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Weight: {Math.round(f.weight * 100)}%
                        </span>
                      </div>
                      <div className="px-3 py-2">
                        {f.details.map((d, i) => (
                          <p
                            key={i}
                            className={`text-[11px] leading-relaxed ${
                              d.startsWith("✓")
                                ? "text-emerald-600 dark:text-emerald-400"
                                : d.startsWith("⚠")
                                ? "text-amber-600 dark:text-amber-400"
                                : d.startsWith("✗")
                                ? "text-red-600 dark:text-red-400"
                                : "text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {d}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* OCS Factor Breakdown */}
          {ocsFactors && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <button
                onClick={() => setShowOcsFactors(!showOcsFactors)}
                className="w-full flex items-center justify-between"
              >
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  Operational Confidence Breakdown
                </h3>
                {showOcsFactors ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </button>

              {showOcsFactors && (
                <div className="mt-4 space-y-3">
                  {ocsFactors.map((f) => (
                    <div
                      key={f.factor}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                              f.rawScore >= 0.85
                                ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                                : f.rawScore >= 0.60
                                ? "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                                : "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400"
                            }`}
                          >
                            {Math.round(f.rawScore * 100)}%
                          </span>
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            {f.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Weight: {Math.round(f.weight * 100)}%
                        </span>
                      </div>
                      <div className="px-3 py-2">
                        {f.details.map((d, i) => (
                          <p
                            key={i}
                            className={`text-[11px] leading-relaxed ${
                              d.startsWith("✓")
                                ? "text-emerald-600 dark:text-emerald-400"
                                : d.startsWith("⚠")
                                ? "text-amber-600 dark:text-amber-400"
                                : d.startsWith("✗")
                                ? "text-red-600 dark:text-red-400"
                                : "text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {d}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Timeline + Events */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trip Timeline */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Trip Timeline
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Tracking {events.length} events for this shipment
            </p>

            <div className="relative pl-8 space-y-0">
              {events.length === 0 && (
                <div className="flex items-center gap-3 py-2">
                  <Circle className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                  <span className="text-sm text-slate-400 dark:text-slate-500">
                    No events recorded yet
                  </span>
                </div>
              )}
              {events.map((event, i) => {
                const isDelay = event.event_type === "delay";
                const isCompleted = ["arrived", "delivered"].includes(event.event_type);
                return (
                  <div key={event.id} className="relative pb-4 last:pb-0">
                    {i < events.length - 1 && (
                      <div className="absolute left-[7px] top-5 w-px h-full bg-slate-200 dark:bg-slate-700" />
                    )}
                    <div className="flex items-start gap-3">
                      <div
                        className={`relative z-10 flex items-center justify-center h-4 w-4 rounded-full flex-shrink-0 mt-0.5 ${
                          isDelay
                            ? "bg-red-100 dark:bg-red-950/50 text-red-500"
                            : isCompleted
                            ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-500"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                        }`}
                      >
                        {EVENT_ICONS[event.event_type] || (
                          <Circle className="h-3 w-3" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm font-medium ${
                              isDelay
                                ? "text-red-700 dark:text-red-400"
                                : "text-slate-900 dark:text-white"
                            }`}
                          >
                            {EVENT_LABELS[event.event_type] || event.event_type}
                          </span>
                          <span className="text-xs text-slate-400">
                            {formatDateTime(event.recorded_at)}
                          </span>
                        </div>
                        {event.location_description && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            {event.location_description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shipment Info */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-500" />
              Shipment Information
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  Shipment ID
                </dt>
                <dd className="text-sm font-mono font-semibold text-slate-900 dark:text-white mt-0.5">
                  {shipment.shipment_id}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  Status
                </dt>
                <dd className="mt-0.5">{statusBadge(shipment.status)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  Cargo Type
                </dt>
                <dd className="text-sm text-slate-900 dark:text-white mt-0.5 font-medium">
                  {shipment.cargo_type}
                  {shipment.is_dangerous_goods ? (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400">
                      DG
                    </span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  HS Code
                </dt>
                <dd className="text-sm text-slate-900 dark:text-white mt-0.5">
                  {shipment.cargo_hs_code || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  Weight
                </dt>
                <dd className="text-sm text-slate-900 dark:text-white mt-0.5 font-medium">
                  {shipment.cargo_weight_kg.toLocaleString()} kg
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  Declared Value
                </dt>
                <dd className="text-sm text-slate-900 dark:text-white mt-0.5 font-medium">
                  ${(shipment.cargo_value / 100).toLocaleString()} USD
                </dd>
              </div>
              {shipment.is_dangerous_goods && shipment.dg_class && (
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                    DG Class
                  </dt>
                  <dd className="text-sm text-amber-700 dark:text-amber-400 mt-0.5 font-medium">
                    {shipment.dg_class}
                  </dd>
                </div>
              )}
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  Cargo Description
                </dt>
                <dd className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">
                  {shipment.cargo_description || "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  Border Crossings
                </dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {borders.length === 0 ? (
                    <span className="text-sm text-slate-400">None</span>
                  ) : (
                    borders.map((b) => (
                      <span
                        key={b}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300"
                      >
                        {b}
                      </span>
                    ))
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Right column: Assignment, Compliance, Schedule */}
        <div className="space-y-6">
          {/* Schedule */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              Schedule
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Scheduled Departure
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {formatDateTime(shipment.departure_scheduled)}
                </p>
              </div>
              {shipment.departure_actual && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Actual Departure
                  </p>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    {formatDateTime(shipment.departure_actual)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">ETA</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {formatDateTime(shipment.eta)}
                </p>
              </div>
              {shipment.arrival_actual && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Actual Arrival
                  </p>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    {formatDateTime(shipment.arrival_actual)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Assignment */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-500" />
              Assignment
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Driver</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {shipment.driver_name || "Unassigned"}
                </p>
                {shipment.driver_license && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    License: {shipment.driver_license} ({shipment.driver_license_type})
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Vehicle</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {shipment.vehicle_registration || "Unassigned"}
                </p>
                {shipment.vehicle_make && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {shipment.vehicle_make} {shipment.vehicle_model} ({shipment.vehicle_type})
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Logistics Company
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {shipment.logistics_company_name || "None"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Mining Company
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {shipment.mining_company_name || "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Compliance */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-500" />
              Compliance
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {validDocs}
                </p>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-semibold">
                  Valid
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                  {expiringDocs}
                </p>
                <p className="text-[10px] text-amber-700 dark:text-amber-400 uppercase tracking-wider font-semibold">
                  Expiring
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                  {missingDocs}
                </p>
                <p className="text-[10px] text-red-700 dark:text-red-400 uppercase tracking-wider font-semibold">
                  Missing
                </p>
              </div>
            </div>
            {documents.length > 0 ? (
              <div className="space-y-2">
                {documents.slice(0, 5).map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-700 dark:text-slate-300 truncate">
                          {doc.document_type.replace(/_/g, " ")}
                        </p>
                        <p className="text-slate-400 truncate">
                          {doc.document_number}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        doc.status === "valid"
                          ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                          : doc.status === "expiring_soon"
                          ? "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                          : doc.status === "expired"
                          ? "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {doc.status.replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-3">
                No documents on file
              </p>
            )}
            <Link
              href="/compliance"
              className="mt-3 inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              View all compliance documents
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
