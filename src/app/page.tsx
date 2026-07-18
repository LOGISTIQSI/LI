"use client";

import { useEffect, useState } from "react";
import {
  Package,
  ShieldAlert,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from "lucide-react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

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
  amber:
    "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900",
  red: "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900",
  emerald:
    "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900",
};

function StatCard({ label, value, change, changeUp, icon, color }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          {label}
        </span>
        <div
          className={`h-9 w-9 rounded-lg border flex items-center justify-center ${colorClasses[color]}`}
        >
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900 dark:text-white">
          {value}
        </span>
        {change && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
              changeUp
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {changeUp ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {change}
          </span>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {greeting}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {today}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span>
            Last updated: {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Shipments"
          value={142}
          change="8.2%"
          changeUp={true}
          icon={<Package className="h-4 w-4" />}
          color="blue"
        />
        <StatCard
          label="Compliance Alerts"
          value={7}
          change="2.1%"
          changeUp={false}
          icon={<ShieldAlert className="h-4 w-4" />}
          color="amber"
        />
        <StatCard
          label="At-Risk Shipments"
          value={12}
          change="1.4%"
          changeUp={false}
          icon={<AlertTriangle className="h-4 w-4" />}
          color="red"
        />
        <StatCard
          label="On-Time %"
          value="94.2%"
          change="1.1%"
          changeUp={true}
          icon={<TrendingUp className="h-4 w-4" />}
          color="emerald"
        />
      </div>

      {/* Quick insight cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Top Risks Today
          </h2>
          <div className="space-y-3">
            {[
              {
                title: "Weather disruption — Johannesburg corridor",
                detail: "3 shipments may be delayed due to forecast storms",
                severity: "high",
              },
              {
                title: "Border post congestion — Beitbridge",
                detail: "Average wait time increased to 4.2 hours",
                severity: "medium",
              },
              {
                title: "Vehicle VIN-782 maintenance overdue",
                detail: "Preventive check due 2 days ago",
                severity: "low",
              },
            ].map((risk, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
              >
                <span
                  className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${
                    risk.severity === "high"
                      ? "bg-red-500"
                      : risk.severity === "medium"
                      ? "bg-amber-500"
                      : "bg-blue-500"
                  }`}
                />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {risk.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {risk.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <BrainCircuitIcon />
            Intelligence Brief
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Today&apos;s AI-generated operational summary
          </p>
          <div className="space-y-3">
            {[
              "Overall fleet readiness is at 92%. 3 vehicles require immediate attention for compliance documentation.",
              "Cross-border shipments to Zambia are experiencing 18% longer clearance times this week. Recommend pre-clearing documentation.",
              "Driver pool utilization is optimal. No fatigue risk alerts active across the 142 active shipments.",
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
              >
                <span className="text-blue-500 font-bold mt-0.5">•</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BrainCircuitIcon() {
  return (
    <svg
      className="h-4 w-4 text-blue-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
      />
    </svg>
  );
}
