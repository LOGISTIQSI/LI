import type { Metadata } from "next";
import { MapPin, Navigation, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Tracking — LOGISTIQS Intelligence",
  description: "Real-time GPS tracking and ETA monitoring for all active shipments.",
};

export default function TrackingPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Tracking
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Real-time GPS tracking, route monitoring, and ETA predictions
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Active Trackers", value: "142", icon: MapPin, color: "text-blue-500" },
          { label: "Delayed", value: "8", icon: Clock, color: "text-amber-500" },
          { label: "On Route", value: "134", icon: Navigation, color: "text-emerald-500" },
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
          <MapPin className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            Live Map View
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
            An interactive map with real-time vehicle positions, route overlays, and ETA
            predictions will be displayed here. The AI operations engine continuously
            recalculates ETAs based on current conditions.
          </p>
        </div>
      </div>
    </div>
  );
}
