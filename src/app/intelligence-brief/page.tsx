"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BrainCircuit,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Truck,
  MapPin,
  ShieldCheck,
  FileText,
  Loader2,
  Package,
  ArrowRight,
} from "lucide-react";

// ── Types ──

interface CriticalAlertItem {
  id: number;
  title: string;
  severity: "critical" | "warning" | "info";
  description: string;
  affectedShipment: string | null;
  recommendedAction: string;
  deadline: string | null;
}

interface PrioritisedDecision {
  priority: number;
  severity: "critical" | "warning" | "info";
  decision: string;
  context: string;
  affectedShipments: string[];
  options: string[];
  aiRecommendation: string;
  deadline: string;
  priorityScore: number;
}

interface ComplianceWatchItem {
  entity: string;
  entityType: "driver" | "vehicle" | "shipment";
  documentType: string;
  expiryDate: string;
  daysRemaining: number;
  affectedShipments: number;
}

interface BorderCondition {
  border: string;
  waitTimeMinutes: number;
  status: "clear" | "congested" | "closed";
  trend: "up" | "down" | "stable";
  affectedShipments: number;
  lastUpdated: string;
}

interface FleetOverview {
  totalActive: number;
  inTransit: number;
  atBorder: number;
  delayed: number;
  missionReady: number;
  pending: number;
}

interface YesterdayOutcome {
  onTimeRate: number;
  completedCount: number;
  cancelledCount: number;
  avgBorderWaitMinutes: number;
}

interface IntelligenceBriefData {
  date: string;
  generatedAt: string;
  companyId: number;
  executiveSummary: string;
  criticalAlerts: CriticalAlertItem[];
  prioritisedDecisions: PrioritisedDecision[];
  complianceWatchlist: ComplianceWatchItem[];
  borderConditions: BorderCondition[];
  fleetOverview: FleetOverview;
  yesterdayOutcomes: YesterdayOutcome;
}

// ── Helpers ──

function formatTime(iso: string): string {
  try {
    return new Date(iso.replace(" ", "T")).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function formatWaitTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function severityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "text-red-600 dark:text-red-400";
    case "warning":
      return "text-amber-600 dark:text-amber-400";
    default:
      return "text-blue-600 dark:text-blue-400";
  }
}

function severityBg(severity: string): string {
  switch (severity) {
    case "critical":
      return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300";
    case "warning":
      return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300";
    default:
      return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";
  }
}

function daysColor(days: number): string {
  if (days <= 7) return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20";
  if (days <= 14) return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20";
  return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20";
}

// ── Sub-components ──

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Analysing fleet data, scanning compliance records, building your intelligence brief…
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <AlertTriangle className="h-10 w-10 text-red-400 mb-4" />
      <p className="text-sm text-red-600 dark:text-red-400 mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
      >
        <RefreshCw className="h-4 w-4" />
        Retry
      </button>
    </div>
  );
}

function EmptyState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <BrainCircuit className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
        No Brief Generated Today
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md text-center mb-6">
        The daily intelligence brief hasn&apos;t been generated yet. Click below to
        analyse your fleet, compliance records, and active shipments.
      </p>
      <button
        onClick={onGenerate}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition shadow-sm"
      >
        <BrainCircuit className="h-4 w-4" />
        Generate Brief
      </button>
    </div>
  );
}

// ── Main Page ──

export default function IntelligenceBriefPage() {
  const [brief, setBrief] = useState<IntelligenceBriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const fetchBrief = useCallback(async (forceGenerate = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = forceGenerate
        ? "/api/intelligence-brief"
        : "/api/intelligence-brief?company_id=1";

      const res = await fetch(url, {
        method: forceGenerate ? "POST" : "GET",
        ...(forceGenerate ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company_id: 1 }) } : {}),
      });

      if (res.status === 404) {
        setBrief(null);
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setBrief(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load brief");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrief();
  }, [fetchBrief]);

  const handleGenerate = async () => {
    setGenerating(true);
    await fetchBrief(true);
    setGenerating(false);
  };

  const now = new Date();
  const todayFormatted = now.toLocaleDateString("en-US", { dateStyle: "long" });

  const briefTime = brief?.generatedAt ? formatTime(brief.generatedAt) : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Daily Operational Intelligence Brief
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {todayFormatted}
            {briefTime && (
              <span className="ml-3 text-xs text-slate-400 dark:text-slate-500">
                Generated at {briefTime}
              </span>
            )}
          </p>
        </div>
        {(brief || generating) && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Generating…" : "Regenerate"}
          </button>
        )}
      </div>

      {/* ── States ── */}
      {loading && !generating && <LoadingState />}
      {error && <ErrorState message={error} onRetry={handleGenerate} />}
      {!loading && !error && !brief && <EmptyState onGenerate={handleGenerate} />}
      {generating && <LoadingState />}

      {/* ── Brief Content ── */}
      {brief && !generating && (
        <div className="space-y-6">
          {/* Executive Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-l-4 border-blue-500 rounded-xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <BrainCircuit className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <h2 className="text-sm font-semibold text-blue-800 dark:text-blue-200 uppercase tracking-wide">
                Executive Summary
              </h2>
            </div>
            <p className="text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed">
              {brief.executiveSummary}
            </p>
          </div>

          {/* Fleet Overview — 6 stat cards */}
          <div>
            <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Fleet Overview
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "Active", value: brief.fleetOverview.totalActive, icon: Truck, color: "text-blue-600" },
                { label: "In Transit", value: brief.fleetOverview.inTransit, icon: ArrowRight, color: "text-green-600" },
                { label: "At Border", value: brief.fleetOverview.atBorder, icon: MapPin, color: "text-amber-600" },
                { label: "Delayed", value: brief.fleetOverview.delayed, icon: Clock, color: "text-red-600" },
                { label: "Mission-Ready", value: brief.fleetOverview.missionReady, icon: ShieldCheck, color: "text-emerald-600" },
                { label: "Pending", value: brief.fleetOverview.pending, icon: Package, color: "text-purple-600" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    <span className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Critical Alerts & Decisions — side by side on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Critical Alerts */}
            <div>
              <h2 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                Critical Alerts ({brief.criticalAlerts.length})
              </h2>
              {brief.criticalAlerts.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 text-center shadow-sm">
                  <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No critical alerts. Fleet is operating normally.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {brief.criticalAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="bg-white dark:bg-slate-900 rounded-lg border-l-4 border-red-500 p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                          {alert.title}
                        </h3>
                        {alert.affectedShipment && (
                          <span className="text-xs font-mono text-slate-400 dark:text-slate-500 whitespace-nowrap">
                            {alert.affectedShipment}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">
                        {alert.description}
                      </p>
                      <div className="flex items-start gap-1.5 text-xs">
                        <span className="text-red-600 dark:text-red-400 font-medium">Action:</span>
                        <span className="text-slate-600 dark:text-slate-400">{alert.recommendedAction}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Today's Prioritised Decisions */}
            <div>
              <h2 className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5" />
                Today&apos;s Prioritised Decisions
              </h2>
              {brief.prioritisedDecisions.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 text-center shadow-sm">
                  <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No decisions pending. Operations are running smoothly.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {brief.prioritisedDecisions.map((d) => (
                    <div
                      key={`${d.priority}-${d.decision}`}
                      className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            d.severity === "critical"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                              : d.severity === "warning"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                          }`}
                        >
                          {d.priority}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                              {d.decision}
                            </h3>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${severityBg(d.severity)}`}>
                              {d.severity}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {d.context}
                          </p>
                          {d.affectedShipments.length > 0 && (
                            <p className="text-xs font-mono text-slate-400 mt-1">
                              {d.affectedShipments.join(", ")}
                            </p>
                          )}
                          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-100 dark:border-blue-900/40">
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                              <span className="font-semibold">AI recommends:</span> {d.aiRecommendation}
                            </p>
                          </div>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                            Deadline: {d.deadline}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Compliance Watchlist & Border Conditions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance Watchlist */}
            <div>
              <h2 className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                Compliance Watchlist ({brief.complianceWatchlist.length})
              </h2>
              {brief.complianceWatchlist.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 text-center shadow-sm">
                  <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">All documents current. No expiries within 30 days.</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                        <th className="text-left px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400">Entity</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400">Document</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400">Expiry</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400">Days</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400">Affects</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brief.complianceWatchlist.map((item, i) => (
                        <tr
                          key={i}
                          className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30"
                        >
                          <td className="px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 max-w-[160px] truncate">
                            {item.entity}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                            {item.documentType.replace(/_/g, " ")}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 text-right">
                            {item.expiryDate}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${daysColor(item.daysRemaining)}`}>
                              {item.daysRemaining}d
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 text-right">
                            {item.affectedShipments}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Border Conditions */}
            <div>
              <h2 className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                Border Conditions
              </h2>
              {brief.borderConditions.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 text-center shadow-sm">
                  <Info className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No active border crossings in current shipments.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {brief.borderConditions.map((bc) => (
                    <div
                      key={bc.border}
                      className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-indigo-500" />
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                            {bc.border}
                          </h3>
                        </div>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            bc.status === "clear"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                              : bc.status === "congested"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                          }`}
                        >
                          {bc.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatWaitTime(bc.waitTimeMinutes)} avg wait
                        </span>
                        <span className="flex items-center gap-1">
                          {bc.trend === "up" ? (
                            <TrendingUp className="h-3 w-3 text-red-500" />
                          ) : bc.trend === "down" ? (
                            <TrendingDown className="h-3 w-3 text-green-500" />
                          ) : (
                            <Minus className="h-3 w-3 text-slate-400" />
                          )}
                          {bc.trend === "up" ? "Increasing" : bc.trend === "down" ? "Decreasing" : "Stable"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Truck className="h-3 w-3" />
                          {bc.affectedShipments} shipment{bc.affectedShipments !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Yesterday's Outcomes */}
          <div>
            <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              Yesterday&apos;s Outcomes
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 shadow-sm text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {brief.yesterdayOutcomes.onTimeRate}%
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">On-Time Rate</p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 shadow-sm text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {brief.yesterdayOutcomes.completedCount}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Completed</p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 shadow-sm text-center">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {brief.yesterdayOutcomes.cancelledCount}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Cancelled</p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 shadow-sm text-center">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {formatWaitTime(brief.yesterdayOutcomes.avgBorderWaitMinutes)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Avg Border Wait</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
