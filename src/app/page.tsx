"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  ShieldAlert,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Truck,
  BrainCircuit,
  Plus,
  ChevronRight,
  MapPin,
} from "lucide-react";

// ── Types ──

interface ShipmentRow {
  id: number;
  shipment_id: string;
  origin: string;
  destination: string;
  origin_country: string;
  destination_country: string;
  status: string;
  eta: string | null;
  cargo_value: number;
  mission_readiness_score: number | null;
  operational_confidence_score: number | null;
  driver_name: string | null;
  vehicle_registration: string | null;
}

interface AlertRow {
  id: number;
  alert_type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  shipment_ref: string | null;
  created_at: string;
}

// ── Helpers ──

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatCurrency(cents: number): string {
  return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; classes: string }> = {
    draft: { label: "Draft", classes: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700" },
    pending: { label: "Pending", classes: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700" },
    ready: { label: "Ready", classes: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
    in_transit: { label: "In Transit", classes: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
    at_border: { label: "At Border", classes: "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800" },
    delayed: { label: "Delayed", classes: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
    completed: { label: "Completed", classes: "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800" },
    cancelled: { label: "Cancelled", classes: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800" },
  };
  const s = map[status] || map.draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${s.classes}`}>
      {s.label}
    </span>
  );
}

function riskPill(score: number | null) {
  if (score === null) return <span className="text-xs text-slate-400">—</span>;
  const color = score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";
  const label = score >= 80 ? "Good" : score >= 50 ? "Caution" : "At Risk";
  const textColor = score >= 80 ? "text-emerald-600 dark:text-emerald-400" : score >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-[11px] font-semibold ${textColor}`}>{score}</span>
    </div>
  );
}

function severityIcon(severity: string) {
  switch (severity) {
    case "critical": return <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />;
    case "warning": return <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />;
    default: return <AlertTriangle className="h-4 w-4 text-blue-500 flex-shrink-0" />;
  }
}

// ── StatCard Component ──

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeUp?: boolean;
  icon: React.ReactNode;
  color: "blue" | "amber" | "red" | "emerald";
}

const colorClasses: Record<StatCardProps["color"], string> = {
  blue: "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900",
  amber: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900",
  red: "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900",
  emerald: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900",
};

function StatCard({ label, value, change, changeUp, icon, color }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {label}
        </span>
        <div className={`h-10 w-10 rounded-lg border flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[2rem] font-bold leading-none text-slate-900 dark:text-white">
          {value}
        </span>
        {change && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
            changeUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          }`}>
            {changeUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {change}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──

export default function DashboardPage() {
  const [greeting] = useState(() => getGreeting());
  const [now] = useState(() => new Date());
  const [lastUpdated, setLastUpdated] = useState(formatTime(new Date()));
  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Refresh timestamp every 30s
    const timer = setInterval(() => setLastUpdated(formatTime(new Date())), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [shipRes, alertRes] = await Promise.all([
          fetch("/api/shipments?limit=10"),
          fetch("/api/alerts?limit=5"),
        ]);
        if (shipRes.ok) {
          const data = await shipRes.json();
          setShipments(Array.isArray(data) ? data.slice(0, 10) : []);
        }
        if (alertRes.ok) {
          const data = await alertRes.json();
          setAlerts(Array.isArray(data) ? data : []);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Compute stats
  const activeShipments = shipments.filter((s) => ["in_transit", "at_border", "ready", "pending"].includes(s.status));
  const atRiskShipments = shipments.filter((s) => s.mission_readiness_score !== null && s.mission_readiness_score < 50 || s.operational_confidence_score !== null && s.operational_confidence_score < 0.6);
  const criticalAlerts = alerts.filter((a) => a.severity === "critical");

  const completedCount = shipments.filter((s) => s.status === "completed").length;
  const totalRelevant = shipments.length;
  const onTimePct = totalRelevant > 0 ? 94.2 : 100; // simulated — in production, compute from actual data

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {greeting}, Kalahari Copper Mining
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {formatDate(now)}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span>Last updated: {lastUpdated}</span>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Shipments"
          value={activeShipments.length}
          change="8.2%"
          changeUp={true}
          icon={<Package className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          label="Compliance Alerts"
          value={alerts.filter((a) => a.alert_type === "compliance" || a.alert_type === "expiry").length}
          change="2.1%"
          changeUp={false}
          icon={<ShieldAlert className="h-5 w-5" />}
          color="amber"
        />
        <StatCard
          label="At-Risk Shipments"
          value={atRiskShipments.length}
          change="1.4%"
          changeUp={false}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="red"
        />
        <StatCard
          label="On-Time %"
          value={`${onTimePct}%`}
          change="1.1%"
          changeUp={true}
          icon={<TrendingUp className="h-5 w-5" />}
          color="emerald"
        />
      </div>

      {/* ── Main Content: Recent Shipments + Active Alerts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Shipments — takes 2/3 */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-500" />
                Recent Shipments
              </h2>
              <Link
                href="/shipments"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {loading ? (
              <div className="p-12 text-center text-sm text-slate-400">Loading shipments...</div>
            ) : shipments.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No shipments yet</p>
                <Link href="/shipments/new" className="mt-2 inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  Create your first shipment
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ID</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Route</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Risk</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ETA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipments.map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                        onClick={() => window.location.href = `/shipments/${s.shipment_id}`}
                      >
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono font-semibold text-slate-900 dark:text-white">
                            {s.shipment_id}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-xs">
                            <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" />
                            <span className="text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                              {s.origin_country} → {s.destination_country}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">{statusBadge(s.status)}</td>
                        <td className="px-4 py-3">
                          {riskPill(s.mission_readiness_score ?? s.operational_confidence_score ? Math.round((s.operational_confidence_score ?? 0) * 100) : null)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {s.eta ? new Date(s.eta.replace(" ", "T")).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Active Alerts — takes 1/3 */}
        <div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Active Alerts
              </h2>
              <Link
                href="/compliance"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-400">Loading alerts...</div>
            ) : alerts.length === 0 ? (
              <div className="p-8 text-center">
                <div className="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">All clear</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">No unresolved alerts</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {alerts.map((alert) => {
                  const sevBorder =
                    alert.severity === "critical"
                      ? "border-l-red-500"
                      : alert.severity === "warning"
                      ? "border-l-amber-500"
                      : "border-l-blue-500";
                  return (
                    <div
                      key={alert.id}
                      className={`px-4 py-3 border-l-[3px] ${sevBorder} hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors`}
                    >
                      <div className="flex items-start gap-2.5">
                        {severityIcon(alert.severity)}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                            {alert.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {alert.description}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                            {alert.shipment_ref && (
                              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                                {alert.shipment_ref}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              {new Date(alert.created_at.replace(" ", "T")).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/shipments/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Shipment
        </Link>
        <Link
          href="/fleet"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Truck className="h-4 w-4" />
          View Fleet
        </Link>
        <Link
          href="/intelligence-brief"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <BrainCircuit className="h-4 w-4" />
          Daily Brief
        </Link>
      </div>
    </div>
  );
}
