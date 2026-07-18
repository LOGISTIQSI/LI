import type { Metadata } from "next";
import { Settings, Bell, Users, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Settings — LOGISTIQS Intelligence",
  description: "Configure your LOGISTIQS Intelligence platform preferences and integrations.",
};

export default function SettingsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Platform configuration, user management, and integration settings
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "General", desc: "Platform preferences", icon: Settings },
          { label: "Notifications", desc: "Alert configuration", icon: Bell },
          { label: "Team", desc: "User management", icon: Users },
          { label: "Security", desc: "Access & API keys", icon: ShieldCheck },
        ].map((item, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-md transition-shadow cursor-pointer"
          >
            <item.icon className="h-5 w-5 text-slate-400 dark:text-slate-500 mb-3" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-0.5">
              {item.label}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Settings className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            Settings Panel
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
            Configure your LOGISTIQS Intelligence platform — manage users, set notification
            preferences, connect external data sources, and customise your operational
            thresholds.
          </p>
        </div>
      </div>
    </div>
  );
}
