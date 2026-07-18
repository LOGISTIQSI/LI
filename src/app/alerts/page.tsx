"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  Info,
  Shield,
  Clock,
  MapPin,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  CheckCircle2,
} from "lucide-react";

interface Alert {
  id: number;
  shipment_id: number | null;
  driver_id: number | null;
  vehicle_id: number | null;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  is_resolved: number;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  shipment_ref: string | null;
}

const SEVERITY_ICONS: Record<string, React.ElementType> = {
  critical: AlertTriangle,
  warning: AlertCircle,
  info: Info,
};

const SEVERITY_BORDER: Record<string, string> = {
  critical: "border-l-red-500",
  warning: "border-l-amber-500",
  info: "border-l-blue-500",
};

const SEVERITY_TEXT: Record<string, string> = {
  critical: "text-red-600 dark:text-red-400",
  warning: "text-amber-600 dark:text-amber-400",
  info: "text-blue-600 dark:text-blue-400",
};

const SEVERITY_BG: Record<string, string> = {
  critical: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900",
  warning: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900",
  info: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900",
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  compliance: Shield,
  border: MapPin,
  delay: Clock,
  expiry: Clock,
  risk: AlertTriangle,
  gps: MapPin,
  system: Info,
};

const SEVERITY_ORDER = ["all", "critical", "warning", "info"];
const TYPE_ORDER = [
  "all",
  "compliance",
  "border",
  "delay",
  "expiry",
  "risk",
  "gps",
  "system",
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr.replace(" ", "T") + "Z");
  return date.toLocaleString();
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr.replace(" ", "T") + "Z");
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  // Filters
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showResolved, setShowResolved] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (severityFilter !== "all") params.set("severity", severityFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      params.set("resolved", showResolved ? "1" : "0");

      const res = await fetch(`/api/alerts?${params.toString()}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [severityFilter, typeFilter, showResolved]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleResolve = async (alertId: number) => {
    setResolving(true);
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_resolved: true,
          resolution_notes: resolutionNotes || null,
        }),
      });
      if (res.ok) {
        setExpandedId(null);
        setResolutionNotes("");
        fetchAlerts();
      }
    } catch {
      // ignore
    } finally {
      setResolving(false);
    }
  };

  const handleBulkResolveWarnings = async () => {
    try {
      await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve_all_warnings" }),
      });
      fetchAlerts();
    } catch {
      // ignore
    }
  };

  const handleBulkDismissInfo = async () => {
    try {
      await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss_all_info" }),
      });
      fetchAlerts();
    } catch {
      // ignore
    }
  };

  const stats = {
    total: alerts.length,
    critical: alerts.filter((a) => a.severity === "critical").length,
    warning: alerts.filter((a) => a.severity === "warning").length,
    info: alerts.filter((a) => a.severity === "info").length,
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Alerts & Notifications
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Real-time operational alerts from compliance, risk, and monitoring engines
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Total alerts</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 rounded-xl p-4">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.critical}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Critical</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 rounded-xl p-4">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.warning}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Warnings</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900 rounded-xl p-4">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.info}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Info</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="h-4 w-4 text-slate-400 flex-shrink-0" />

          {/* Severity filter */}
          <div className="flex items-center gap-1">
            {SEVERITY_ORDER.map((s) => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  severityFilter === s
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {s === "all" ? "All Severities" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <span className="text-slate-300 dark:text-slate-700">|</span>

          {/* Type filter */}
          <div className="flex items-center gap-1 flex-wrap">
            {TYPE_ORDER.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  typeFilter === t
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {t === "all" ? "All Types" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <span className="text-slate-300 dark:text-slate-700">|</span>

          {/* Resolved toggle */}
          <button
            onClick={() => setShowResolved(!showResolved)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              showResolved
                ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {showResolved ? "Showing Resolved" : "Show Resolved"}
          </button>
        </div>
      </div>

      {/* Bulk actions */}
      {!showResolved && alerts.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleBulkResolveWarnings}
            className="px-3 py-1.5 bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400
              rounded-lg text-xs font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
          >
            Resolve all warnings
          </button>
          <button
            onClick={handleBulkDismissInfo}
            className="px-3 py-1.5 bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400
              rounded-lg text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
          >
            Dismiss all info
          </button>
        </div>
      )}

      {/* Alerts list */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
          <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading alerts...</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
          <Check className="h-10 w-10 mx-auto text-emerald-400 mb-3" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            No alerts found
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {showResolved
              ? "No resolved alerts match your filters"
              : "All clear — no active alerts matching your filters"}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {alerts.map((alert) => {
              const SeverityIcon = SEVERITY_ICONS[alert.severity] || Info;
              const TypeIcon = TYPE_ICONS[alert.alert_type] || Info;
              const isExpanded = expandedId === alert.id;

              return (
                <div
                  key={alert.id}
                  className={`border-l-4 ${SEVERITY_BORDER[alert.severity]} ${
                    alert.is_resolved ? "opacity-60" : ""
                  }`}
                >
                  {/* Alert row */}
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : alert.id)
                    }
                    className="w-full text-left px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors
                      flex items-start gap-3"
                  >
                    {/* Severity + type icon */}
                    <div
                      className={`flex-shrink-0 w-9 h-9 rounded-lg ${SEVERITY_BG[alert.severity]} flex items-center justify-center`}
                    >
                      <SeverityIcon className={`h-4.5 w-4.5 ${SEVERITY_TEXT[alert.severity]}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {alert.title}
                        </span>
                        {alert.is_resolved ? (
                          <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 rounded-full font-medium flex-shrink-0">
                            Resolved
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                              alert.severity === "critical"
                                ? "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400"
                                : alert.severity === "warning"
                                  ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400"
                                  : "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400"
                            }`}
                          >
                            {alert.severity}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-1.5">
                        {alert.description}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <TypeIcon className="h-3 w-3" />
                          {alert.alert_type}
                        </span>
                        {alert.shipment_ref && (
                          <span className="text-[10px] font-mono text-blue-500 dark:text-blue-400">
                            {alert.shipment_ref}
                          </span>
                        )}
                        {alert.driver_id && (
                          <span className="text-[10px] text-slate-400">
                            Driver #{alert.driver_id}
                          </span>
                        )}
                        {alert.vehicle_id && (
                          <span className="text-[10px] text-slate-400">
                            Vehicle #{alert.vehicle_id}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {timeAgo(alert.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex-shrink-0 text-slate-400">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </button>

                  {/* Expanded panel */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pl-16">
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                        {alert.is_resolved ? (
                          <div>
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Resolution Notes
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                              {alert.resolution_notes || "No notes provided"}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Resolved at: {alert.resolved_at ? formatDate(alert.resolved_at) : "Unknown"}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                              Resolve this alert
                            </p>
                            <textarea
                              value={resolutionNotes}
                              onChange={(e) => setResolutionNotes(e.target.value)}
                              placeholder="Add resolution notes (optional)..."
                              rows={2}
                              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-600 
                                bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100
                                px-3 py-2 mb-3 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleResolve(alert.id)}
                                disabled={resolving}
                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg 
                                  text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                              >
                                <Check className="h-3.5 w-3.5" />
                                {resolving ? "Resolving..." : "Mark as Resolved"}
                              </button>
                              <button
                                onClick={() => setExpandedId(null)}
                                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
