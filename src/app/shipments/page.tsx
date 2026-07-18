import type { Metadata } from "next";
import { Package, Search, Plus, Filter } from "lucide-react";

export const metadata: Metadata = {
  title: "Shipments — LOGISTIQS Intelligence",
  description: "Manage and monitor all shipments across your transport operations.",
};

export default function ShipmentsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Shipments
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage and monitor all active and completed shipments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <Filter className="h-4 w-4" />
            Filter
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4" />
            New Shipment
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search shipments by ID, origin, destination, or driver..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none"
          />
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
              Shipment management
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
              Full shipment listing with Mission Readiness Scores and Operational
              Confidence Scores will appear here. Create your first shipment to get started.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
