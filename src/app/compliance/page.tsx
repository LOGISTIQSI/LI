import type { Metadata } from "next";
import { ShieldCheck, FileText, AlertCircle, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Compliance — LOGISTIQS Intelligence",
  description: "Monitor compliance status across vehicles, drivers, and documentation.",
};

export default function CompliancePage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Compliance
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Monitor regulatory compliance across your fleet and operations
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Fully Compliant", value: "89%", icon: CheckCircle, color: "text-emerald-500" },
          { label: "Expiring Soon", value: "14 docs", icon: AlertCircle, color: "text-amber-500" },
          { label: "Non-Compliant", value: "3 items", icon: ShieldCheck, color: "text-red-500" },
        ].map((item, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5"
          >
            <div className="flex items-center gap-3">
              <item.icon className={`h-5 w-5 ${item.color}`} />
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{item.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            Compliance Dashboard
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
            Detailed compliance analysis, document tracking, and regulatory alert management
            will be available here. The AI compliance engine continuously monitors all
            documentation and legal requirements.
          </p>
        </div>
      </div>
    </div>
  );
}
