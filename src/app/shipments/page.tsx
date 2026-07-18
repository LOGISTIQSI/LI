"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  Search,
  Plus,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
} from "lucide-react";

interface Shipment {
  id: number;
  shipment_id: string;
  origin: string;
  destination: string;
  origin_country: string;
  destination_country: string;
  cargo_type: string;
  status: string;
  driver_name: string | null;
  driver_license: string | null;
  vehicle_registration: string | null;
  vehicle_type: string | null;
  mission_readiness_score: number | null;
  operational_confidence_score: number | null;
  eta: string | null;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "ready", label: "Ready" },
  { value: "in_transit", label: "In Transit" },
  { value: "delayed", label: "Delayed" },
  { value: "completed", label: "Completed" },
  { value: "draft", label: "Draft" },
];

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
  };
  const s = map[status] || map.draft;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.classes}`}
    >
      {s.label}
    </span>
  );
}

function readinessColor(score: number | null): string {
  if (score === null) return "text-slate-400 dark:text-slate-500";
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function readinessBg(score: number | null): string {
  if (score === null) return "bg-slate-100 dark:bg-slate-800";
  if (score >= 80) return "bg-emerald-50 dark:bg-emerald-950/30";
  if (score >= 50) return "bg-amber-50 dark:bg-amber-950/30";
  return "bg-red-50 dark:bg-red-950/30";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.replace(" ", "T"));
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type SortField = "shipment_id" | "origin" | "cargo_type" | "status" | "mission_readiness_score" | "eta";

export default function ShipmentsPage() {
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("mission_readiness_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search) params.set("search", search);

    const res = await fetch(`/api/shipments?${params.toString()}`);
    const data = await res.json();
    setShipments(data);
    setLoading(false);
  }, [statusFilter, search]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  const sorted = [...shipments].sort((a, b) => {
    let aVal: string | number = "";
    let bVal: string | number = "";
    if (sortField === "mission_readiness_score") {
      aVal = a.mission_readiness_score ?? -1;
      bVal = b.mission_readiness_score ?? -1;
    } else if (sortField === "eta") {
      aVal = a.eta ?? "";
      bVal = b.eta ?? "";
    } else {
      aVal = (a[sortField] ?? "").toString().toLowerCase();
      bVal = (b[sortField] ?? "").toString().toLowerCase();
    }
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field)
      return <ChevronDown className="h-3 w-3 text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100" />;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 text-blue-500" />
    ) : (
      <ChevronDown className="h-3 w-3 text-blue-500" />
    );
  }

  const Th = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="group px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      onClick={() => toggleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <SortIcon field={field} />
      </div>
    </th>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Shipments
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage and monitor cross-border mining transport shipments
          </p>
        </div>
        <Link
          href="/shipments/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Shipment
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by shipment ID, origin, destination, or driver..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
              No shipments yet
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-4">
              Create your first shipment to get started.
            </p>
            <Link
              href="/shipments/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Shipment
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <Th field="shipment_id" label="Shipment ID" />
                  <Th field="origin" label="Origin → Destination" />
                  <Th field="cargo_type" label="Cargo" />
                  <Th field="status" label="Status" />
                  <Th field="status" label="Driver / Vehicle" />
                  <Th field="mission_readiness_score" label="Readiness" />
                  <Th field="eta" label="ETA" />
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sorted.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/shipments/${s.id}`)}
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">
                        {s.shipment_id}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-slate-900 dark:text-white truncate max-w-[200px]">
                            {s.origin}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                            → {s.destination}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {s.cargo_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">{statusBadge(s.status)}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-900 dark:text-white">
                        {s.driver_name || "—"}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {s.vehicle_registration || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {s.mission_readiness_score !== null ? (
                        <span
                          className={`inline-flex items-center justify-center h-8 w-10 rounded-lg text-sm font-bold ${readinessColor(s.mission_readiness_score)} ${readinessBg(s.mission_readiness_score)}`}
                        >
                          {s.mission_readiness_score}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {formatDate(s.eta)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/shipments/${s.id}`}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
