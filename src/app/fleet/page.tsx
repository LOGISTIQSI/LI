import type { Metadata } from "next";
import { Truck, Wrench, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Fleet — LOGISTIQS Intelligence",
  description: "Manage your vehicle fleet, maintenance schedules, and driver assignments.",
};

export default function FleetPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Fleet
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Vehicle management, maintenance tracking, and driver roster
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Vehicles", value: "68", icon: Truck, color: "text-blue-500" },
          { label: "In Maintenance", value: "5", icon: Wrench, color: "text-amber-500" },
          { label: "Active Drivers", value: "94", icon: Users, color: "text-emerald-500" },
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
          <Truck className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            Fleet Management
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
            Complete fleet overview with vehicle status, maintenance schedules, driver
            assignments, and utilisation metrics will be available here.
          </p>
        </div>
      </div>
    </div>
  );
}
