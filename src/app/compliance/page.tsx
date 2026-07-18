"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  FileText,
  Download,
  Eye,
  Search,
  ChevronDown,
  Calendar,
  Clock,
  Sparkles,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

interface ComplianceDoc {
  id: number;
  document_type: string;
  document_number: string;
  document_file_path: string | null;
  issuing_authority: string;
  issued_date: string;
  expiry_date: string | null;
  status: string;
  ai_verified: number;
  ai_notes: string | null;
  shipment_id: number | null;
  driver_id: number | null;
  vehicle_id: number | null;
  shipment_ref: string | null;
  driver_name: string | null;
  vehicle_registration: string | null;
  created_at: string;
}

interface Stats {
  verifiedCount: number;
  expiringSoonCount: number;
  criticalCount: number;
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

const ENTITY_TYPE_OPTIONS = [
  { value: "all", label: "All Entities" },
  { value: "shipment", label: "Shipment" },
  { value: "driver", label: "Driver" },
  { value: "vehicle", label: "Vehicle" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "valid", label: "Valid" },
  { value: "expiring_soon", label: "Expiring Soon" },
  { value: "expired", label: "Expired" },
  { value: "missing", label: "Missing" },
  { value: "under_review", label: "Under Review" },
];

const DOC_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "driver_license", label: "Driver License" },
  { value: "pdp", label: "PDP" },
  { value: "passport", label: "Passport" },
  { value: "medical_certificate", label: "Medical Certificate" },
  { value: "dg_endorsement", label: "DG Endorsement" },
  { value: "vehicle_registration", label: "Vehicle Registration" },
  { value: "roadworthiness", label: "Roadworthiness" },
  { value: "insurance", label: "Insurance" },
  { value: "cross_border_permit", label: "Cross-Border Permit" },
  { value: "customs_bond", label: "Customs Bond" },
  { value: "cargo_manifest", label: "Cargo Manifest" },
  { value: "dg_permit", label: "DG Permit" },
  { value: "export_permit", label: "Export Permit" },
  { value: "border_documentation", label: "Border Documentation" },
];

function statusBadge(status: string) {
  const map: Record<string, { label: string; classes: string }> = {
    valid: {
      label: "Valid",
      classes:
        "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    },
    expiring_soon: {
      label: "Expiring",
      classes:
        "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    },
    expired: {
      label: "Expired",
      classes:
        "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
    },
    missing: {
      label: "Missing",
      classes:
        "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
    },
    under_review: {
      label: "Under Review",
      classes:
        "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    },
  };
  const s = map[status] || {
    label: status,
    classes:
      "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.classes}`}
    >
      {s.label}
    </span>
  );
}

function daysRemainingBadge(expiry: string | null): { text: string; color: string } {
  if (!expiry) return { text: "N/A", color: "text-slate-400" };
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const exp = new Date(expiry + "T00:00:00");
  const days = Math.floor((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (days < 0)
    return { text: `${Math.abs(days)}d ago`, color: "text-red-600 dark:text-red-400 font-bold" };
  if (days === 0)
    return { text: "Today", color: "text-red-600 dark:text-red-400 font-bold" };
  if (days <= 7)
    return { text: `${days}d`, color: "text-red-600 dark:text-red-400 font-bold" };
  if (days <= 30)
    return { text: `${days}d`, color: "text-amber-600 dark:text-amber-400" };
  return { text: `${days}d`, color: "text-emerald-600 dark:text-emerald-400" };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function entityLabel(doc: ComplianceDoc): string {
  if (doc.shipment_ref) return `Shipment ${doc.shipment_ref}`;
  if (doc.driver_name) return `Driver: ${doc.driver_name}`;
  if (doc.vehicle_registration) return `Vehicle: ${doc.vehicle_registration}`;
  if (doc.shipment_id) return `Shipment #${doc.shipment_id}`;
  if (doc.driver_id) return `Driver #${doc.driver_id}`;
  if (doc.vehicle_id) return `Vehicle #${doc.vehicle_id}`;
  return "—";
}

function formatDocType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ═══════════════════════════════════════════════════════════════════
// Page Component
// ═══════════════════════════════════════════════════════════════════

export default function CompliancePage() {
  const [docs, setDocs] = useState<ComplianceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Stats
  const [stats, setStats] = useState<Stats>({
    verifiedCount: 0,
    expiringSoonCount: 0,
    criticalCount: 0,
  });

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (typeFilter !== "all") params.set("document_type", typeFilter);
    if (search) params.set("search", search);

    const res = await fetch(`/api/documents?${params.toString()}`);
    const data: ComplianceDoc[] = await res.json();
    setDocs(data);

    // Compute stats
    const verified = data.filter((d) => d.ai_verified === 1).length;
    const expiringSoon = data.filter((d) => d.status === "expiring_soon").length;
    const critical = data.filter((d) => d.status === "expired" || d.status === "missing").length;

    setStats({ verifiedCount: verified, expiringSoonCount: expiringSoon, criticalCount: critical });
    setLoading(false);
  }, [statusFilter, typeFilter, search]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  // Filter by entity type client-side (since our API doesn't distinguish this without entity_id)
  const filtered = docs.filter((doc) => {
    if (entityFilter === "all") return true;
    if (entityFilter === "shipment") return doc.shipment_id !== null;
    if (entityFilter === "driver") return doc.driver_id !== null;
    if (entityFilter === "vehicle") return doc.vehicle_id !== null;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Compliance
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            AI-powered document verification and compliance monitoring across your fleet
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Documents Verified */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.verifiedCount}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Documents Verified
                <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  AI
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.expiringSoonCount}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Expiring Soon (≤30 days)</p>
            </div>
          </div>
        </div>

        {/* Critical Issues */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-50 dark:bg-red-950/50 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.criticalCount}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Critical Issues (Expired / Missing)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by document number or entity name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
        >
          {ENTITY_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
        >
          {DOC_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Document Status Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
              No documents found
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
              {search || statusFilter !== "all" || typeFilter !== "all" || entityFilter !== "all"
                ? "Try adjusting your filters or search terms."
                : "Upload compliance documents to start monitoring your fleet's regulatory status."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Document Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Expiry Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Days Remaining
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((doc) => {
                  const days = daysRemainingBadge(doc.expiry_date);
                  const expiryClasses =
                    doc.status === "expired"
                      ? "text-red-600 dark:text-red-400 font-semibold"
                      : doc.status === "expiring_soon"
                        ? "text-amber-600 dark:text-amber-400 font-semibold"
                        : "text-slate-700 dark:text-slate-300";

                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {formatDocType(doc.document_type)}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            {doc.document_number}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm text-slate-900 dark:text-white">
                            {entityLabel(doc)}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {doc.shipment_id ? "Shipment" : doc.driver_id ? "Driver" : doc.vehicle_id ? "Vehicle" : "—"}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {statusBadge(doc.status)}
                          {doc.ai_verified === 1 && (
                            <Sparkles className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" title="AI Verified" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          <span className={`text-sm ${expiryClasses}`}>
                            {formatDate(doc.expiry_date)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-mono ${days.color}`}>
                          {days.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {doc.document_file_path && (
                            <a
                              href={doc.document_file_path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Download"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <button
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick summary footer */}
      {filtered.length > 0 && !loading && (
        <div className="text-xs text-slate-500 dark:text-slate-400 text-right">
          Showing {filtered.length} document{filtered.length !== 1 ? "s" : ""}
          {entityFilter !== "all" && ` • Filtered by ${entityFilter}`}
          {statusFilter !== "all" && ` • Status: ${statusFilter}`}
          {typeFilter !== "all" && ` • Type: ${typeFilter}`}
        </div>
      )}
    </div>
  );
}
