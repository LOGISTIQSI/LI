"use client";

import { useEffect, useState } from "react";
import {
  Truck,
  Users,
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
} from "lucide-react";

// ── Types ──

interface DriverRow {
  id: number;
  full_name: string | null;
  license_number: string;
  license_type: string;
  license_expiry: string;
  pdp_number: string;
  pdp_expiry: string;
  status: string;
  company_name: string | null;
}

interface VehicleRow {
  id: number;
  registration_number: string;
  vehicle_type: string;
  make: string;
  model: string;
  roadworthiness_expiry: string;
  cross_border_permit_expiry: string;
  status: string;
  company_name: string | null;
}

// ── Helpers ──

function daysUntil(dateStr: string): { days: number; expired: boolean } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(dateStr + "T00:00:00");
  const diff = Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return { days: diff, expired: diff < 0 };
}

function expiryBadge(dateStr: string) {
  const { days, expired } = daysUntil(dateStr);
  if (expired) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
        <XCircle className="h-3 w-3" />
        Expired
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
        <Clock className="h-3 w-3" />
        {days}d left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
      <CheckCircle2 className="h-3 w-3" />
      Valid
    </span>
  );
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; classes: string }> = {
    available: { label: "Available", classes: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
    on_trip: { label: "On Trip", classes: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
    off_duty: { label: "Off Duty", classes: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700" },
    suspended: { label: "Suspended", classes: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800" },
    maintenance: { label: "Maintenance", classes: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
    retired: { label: "Retired", classes: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700" },
  };
  const s = map[status] || map.available;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${s.classes}`}>
      {s.label}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Main Page ──

export default function FleetPage() {
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "drivers" | "vehicles">("all");

  useEffect(() => {
    async function load() {
      try {
        const [dRes, vRes] = await Promise.all([
          fetch("/api/drivers?status=all"),
          fetch("/api/vehicles?status=all"),
        ]);
        if (dRes.ok) setDrivers(await dRes.json());
        if (vRes.ok) setVehicles(await vRes.json());
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Stats
  const driverStats = {
    total: drivers.length,
    available: drivers.filter((d) => d.status === "available").length,
    onTrip: drivers.filter((d) => d.status === "on_trip").length,
  };
  const vehicleStats = {
    total: vehicles.length,
    available: vehicles.filter((v) => v.status === "available").length,
    onTrip: vehicles.filter((v) => v.status === "on_trip").length,
  };

  const tabs = [
    { key: "all" as const, label: "All", icon: null },
    { key: "drivers" as const, label: "Drivers", icon: Users },
    { key: "vehicles" as const, label: "Vehicles", icon: Truck },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Fleet</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Vehicle management, maintenance tracking, and driver roster
        </p>
      </div>

      {/* ── Quick Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Drivers</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{driverStats.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Available</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{driverStats.available}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Truck className="h-4 w-4 text-blue-500" />
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Drivers On-Trip</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{driverStats.onTrip}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Truck className="h-4 w-4 text-purple-500" />
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Vehicles</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{vehicleStats.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Veh. Available</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{vehicleStats.available}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Truck className="h-4 w-4 text-blue-500" />
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Veh. On-Trip</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{vehicleStats.onTrip}</p>
        </div>
      </div>

      {/* ── Filter Tabs ── */}
      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {t.icon && <t.icon className="h-4 w-4" />}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <p className="text-sm text-slate-400">Loading fleet data...</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Drivers Table */}
          {(tab === "all" || tab === "drivers") && (
            <>
              {tab === "all" && (
                <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" />
                    Drivers ({drivers.length})
                  </h3>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">License</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">PDP Expiry</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Company</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                          No drivers found
                        </td>
                      </tr>
                    ) : (
                      drivers.map((d) => (
                        <tr
                          key={d.id}
                          className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                                <Users className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                              </div>
                              <span className="text-sm font-medium text-slate-900 dark:text-white">
                                {d.full_name || `Driver #${d.id}`}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                              {d.license_number}
                            </span>
                            <span className="text-[10px] text-slate-400 block">{d.license_type}</span>
                          </td>
                          <td className="px-4 py-3">{expiryBadge(d.pdp_expiry)}</td>
                          <td className="px-4 py-3">{statusBadge(d.status)}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-slate-500 dark:text-slate-400">{d.company_name || "—"}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Vehicles Table */}
          {(tab === "all" || tab === "vehicles") && (
            <>
              {tab === "all" && (
                <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 border-t bg-slate-50 dark:bg-slate-800/30">
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Truck className="h-3.5 w-3.5" />
                    Vehicles ({vehicles.length})
                  </h3>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Registration</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Roadworthiness</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cross-Border Permit</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                          No vehicles found
                        </td>
                      </tr>
                    ) : (
                      vehicles.map((v) => (
                        <tr
                          key={v.id}
                          className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center flex-shrink-0">
                                <Truck className="h-4 w-4 text-purple-500" />
                              </div>
                              <div>
                                <span className="text-sm font-semibold font-mono text-slate-900 dark:text-white">
                                  {v.registration_number}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  {v.make} {v.model}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-slate-600 dark:text-slate-400">{v.vehicle_type}</span>
                          </td>
                          <td className="px-4 py-3">{expiryBadge(v.roadworthiness_expiry)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-xs text-slate-600 dark:text-slate-400">
                                {formatDate(v.cross_border_permit_expiry)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">{statusBadge(v.status)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
