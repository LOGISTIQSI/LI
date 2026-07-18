"use client";

import { useEffect, useState } from "react";
import {
  BrainCircuit,
  ShieldCheck,
  MapPin,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Truck,
  Clock,
  CheckCircle2,
  Loader2,
  DollarSign,
  Gauge,
  Cpu,
  FileSearch,
  Globe,
  BarChart3,
} from "lucide-react";
import Link from "next/link";

// ── Types ──

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

interface IntelligenceBriefData {
  date: string;
  generatedAt: string;
  executiveSummary: string;
  prioritisedDecisions: PrioritisedDecision[];
  borderConditions: BorderCondition[];
  fleetOverview: FleetOverview;
  criticalAlerts: Array<{ id: number; title: string; severity: string }>;
}

// ── Helpers ──

function formatWaitTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

function severityBorder(severity: string): string {
  switch (severity) {
    case "critical": return "border-l-red-500";
    case "warning": return "border-l-amber-500";
    default: return "border-l-blue-500";
  }
}

function severityBg(severity: string): string {
  switch (severity) {
    case "critical": return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300";
    case "warning": return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300";
    default: return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";
  }
}

// ── Semi-circular gauge ──

function FleetReadinessGauge({ pct }: { pct: number }) {
  const radius = 80;
  const strokeWidth = 12;
  const circumference = Math.PI * radius;
  const clampedPct = Math.max(0, Math.min(100, pct));
  const offset = circumference - (clampedPct / 100) * circumference;

  const color = clampedPct >= 80 ? "#059669" : clampedPct >= 50 ? "#d97706" : "#dc2626";
  const label = clampedPct >= 80 ? "Strong" : clampedPct >= 50 ? "Moderate" : "At Risk";

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 180, height: 100 }}>
        <svg width="180" height="100" viewBox="0 0 180 100">
          <path
            d="M 10 90 A 80 80 0 0 1 170 90"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-200 dark:text-slate-700"
          />
          <path
            d="M 10 90 A 80 80 0 0 1 170 90"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 10 }}>
          <span className="text-3xl font-bold text-slate-900 dark:text-white">{clampedPct}%</span>
        </div>
      </div>
      <span className={`text-sm font-semibold px-3 py-0.5 rounded-full mt-1 ${
        clampedPct >= 80 ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" :
        clampedPct >= 50 ? "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400" :
        "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400"
      }`}>
        {label}
      </span>
    </div>
  );
}

// ── AI Engine Card ──

function EngineCard({ icon: Icon, name, metric, status }: {
  icon: React.ElementType;
  name: string;
  metric: string;
  status: "operational" | "degraded" | "offline";
}) {
  const statusColors = {
    operational: "bg-emerald-500",
    degraded: "bg-amber-500",
    offline: "bg-red-500",
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
          <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{name}</p>
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${statusColors[status]} animate-pulse`} />
            <span className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">{status}</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{metric}</p>
    </div>
  );
}

// ── Main Page ──

export default function ExecutiveDashboard() {
  const [brief, setBrief] = useState<IntelligenceBriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [financialExposure, setFinancialExposure] = useState(0);
  const [exposureCount, setExposureCount] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        // Fetch intelligence brief
        const briefRes = await fetch("/api/intelligence-brief?company_id=1");
        if (briefRes.ok) {
          const data = await briefRes.json();
          setBrief(data);
        } else if (briefRes.status === 404) {
          // Generate if not exists
          const genRes = await fetch("/api/intelligence-brief", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ company_id: 1 }),
          });
          if (genRes.ok) setBrief(await genRes.json());
        }

        // Fetch financial exposure from active shipments
        const shipRes = await fetch("/api/shipments?status=all");
        if (shipRes.ok) {
          const ships = await shipRes.json();
          const active = ships.filter((s: { status: string; cargo_value: number }) =>
            ["in_transit", "at_border", "delayed", "ready"].includes(s.status)
          );
          const totalValue = active.reduce((sum: number, s: { cargo_value: number }) => sum + (s.cargo_value || 0), 0);
          setFinancialExposure(totalValue / 100); // convert cents to USD
          setExposureCount(active.length);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const now = new Date();
  const todayFormatted = now.toLocaleDateString("en-US", { dateStyle: "long" });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const fleetReadiness = brief
    ? Math.round((brief.fleetOverview.missionReady / Math.max(brief.fleetOverview.totalActive, 1)) * 100)
    : 87;

  const fleetPct = {
    missionReady: brief ? Math.round((brief.fleetOverview.missionReady / Math.max(brief.fleetOverview.totalActive, 1)) * 100) : 87,
    atRisk: brief ? Math.round((brief.fleetOverview.delayed / Math.max(brief.fleetOverview.totalActive, 1)) * 100) : 8,
    pending: brief ? Math.round((brief.fleetOverview.pending / Math.max(brief.fleetOverview.totalActive, 1)) * 100) : 5,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Executive Command Centre
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {todayFormatted}
            {brief?.generatedAt && (
              <span className="ml-3 text-xs text-slate-400 dark:text-slate-500">
                Brief generated at {new Date(brief.generatedAt.replace(" ", "T")).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
              </span>
            )}
          </p>
        </div>
        <Link
          href="/intelligence-brief"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
        >
          <BrainCircuit className="h-4 w-4" />
          Full Intelligence Brief
        </Link>
      </div>

      {/* ── Hero: Fleet Readiness + Financial Exposure ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fleet Readiness */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Gauge className="h-3.5 w-3.5 text-blue-500" />
            Fleet Readiness
          </h2>
          <div className="flex items-center justify-center">
            <FleetReadinessGauge pct={fleetReadiness} />
          </div>
          {/* Breakdown bars */}
          <div className="mt-6 space-y-2">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Mission-Ready</span>
                <span className="text-slate-500 dark:text-slate-400">{fleetPct.missionReady}%</span>
              </div>
              <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${fleetPct.missionReady}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-amber-600 dark:text-amber-400 font-medium">At Risk</span>
                <span className="text-slate-500 dark:text-slate-400">{fleetPct.atRisk}%</span>
              </div>
              <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${fleetPct.atRisk}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Pending</span>
                <span className="text-slate-500 dark:text-slate-400">{fleetPct.pending}%</span>
              </div>
              <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-slate-400 rounded-full" style={{ width: `${fleetPct.pending}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Financial Exposure */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5 text-blue-500" />
            Financial Exposure
          </h2>
          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-4xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(financialExposure)}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">USD at risk</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <p className="text-xl font-bold text-slate-900 dark:text-white">{exposureCount}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Active Shipments</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
              <p className="text-xl font-bold text-red-600 dark:text-red-400">
                {brief?.fleetOverview.delayed ?? 0}
              </p>
              <p className="text-[10px] text-red-700 dark:text-red-400 uppercase tracking-wider font-semibold">At Risk</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {brief?.fleetOverview.missionReady ?? 0}
              </p>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-semibold">Ready</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Border Status Cards ── */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5" />
          Border Status
        </h2>
        {brief?.borderConditions && brief.borderConditions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {brief.borderConditions.map((bc) => {
              const topColor =
                bc.status === "clear" ? "border-t-emerald-500" :
                bc.status === "congested" ? "border-t-amber-500" :
                "border-t-red-500";

              return (
                <div key={bc.border} className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 border-t-[4px] ${topColor} p-4 shadow-sm`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-indigo-500" />
                      {bc.border}
                    </h3>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      bc.status === "clear"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                        : bc.status === "congested"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                        : "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300"
                    }`}>
                      {bc.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatWaitTime(bc.waitTimeMinutes)}
                    </span>
                    <span className={`flex items-center gap-1 ${
                      bc.trend === "up" ? "text-red-500" : bc.trend === "down" ? "text-emerald-500" : ""
                    }`}>
                      {bc.trend === "up" ? <TrendingUp className="h-3 w-3" /> : bc.trend === "down" ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      {bc.trend === "up" ? "Rising" : bc.trend === "down" ? "Falling" : "Stable"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      {bc.affectedShipments} en-route
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 text-center">
            <Globe className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No active border crossings. Generate an intelligence brief to see border conditions.</p>
          </div>
        )}
      </div>

      {/* ── Today's Decisions ── */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <BarChart3 className="h-3.5 w-3.5" />
          Today&apos;s Prioritised Decisions
        </h2>
        {brief?.prioritisedDecisions && brief.prioritisedDecisions.length > 0 ? (
          <div className="space-y-3">
            {brief.prioritisedDecisions.slice(0, 6).map((d) => (
              <div
                key={`${d.priority}-${d.decision.substring(0, 20)}`}
                className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 border-l-[4px] ${severityBorder(d.severity)} p-4 shadow-sm hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start gap-3">
                  <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    d.severity === "critical"
                      ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                      : d.severity === "warning"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                  }`}>
                    {d.priority}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{d.decision}</h3>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${severityBg(d.severity)}`}>{d.severity}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{d.context}</p>
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-100 dark:border-blue-900/40">
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        <span className="font-semibold">AI recommends:</span> {d.aiRecommendation}
                      </p>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">Deadline: {d.deadline}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No critical decisions required</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">All operations are running within expected parameters.</p>
          </div>
        )}
      </div>

      {/* ── AI Engine Status ── */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Cpu className="h-3.5 w-3.5" />
          AI Engine Status
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <EngineCard
            icon={Cpu}
            name="Operations Engine"
            metric="Monitoring 142 active shipments • ETA predictions up to date"
            status="operational"
          />
          <EngineCard
            icon={FileSearch}
            name="Compliance Engine"
            metric="Tracking 327 documents • 7 alerts this week"
            status="operational"
          />
          <EngineCard
            icon={Globe}
            name="Border & External Risk"
            metric="5 border crossings monitored • Real-time delay data active"
            status="operational"
          />
          <EngineCard
            icon={BrainCircuit}
            name="Decision Intelligence"
            metric="Brief generated today • 8 decisions prioritised"
            status="operational"
          />
        </div>
      </div>
    </div>
  );
}
