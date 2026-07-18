"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  AlertTriangle,
  Info,
  Shield,
  Clock,
  MapPin,
  AlertCircle,
  Check,
  X,
} from "lucide-react";

interface Alert {
  id: number;
  shipment_id: number | null;
  driver_id: number | null;
  vehicle_id: number | null;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  is_resolved: number;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  shipment_ref: string | null;
}

const SEVERITY_ICONS: Record<string, React.ElementType> = {
  critical: AlertTriangle,
  warning: AlertCircle,
  info: Info,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-red-500 dark:text-red-400",
  warning: "text-amber-500 dark:text-amber-400",
  info: "text-blue-500 dark:text-blue-400",
};

const SEVERITY_BG: Record<string, string> = {
  critical: "bg-red-100 dark:bg-red-950/50",
  warning: "bg-amber-100 dark:bg-amber-950/50",
  info: "bg-blue-100 dark:bg-blue-950/50",
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  compliance: Shield,
  border: MapPin,
  delay: Clock,
  expiry: Clock,
  risk: AlertTriangle,
  gps: MapPin,
  system: Info,
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr.replace(" ", "T") + "Z");
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationBell() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts?limit=10&unread=1");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch {
      // Silently fail polling
    }
  }, []);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts?unread=1&count=1");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count || 0);
      }
    } catch {
      // Silently fail polling
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    fetchAlerts();
    fetchCount();
    const interval = setInterval(() => {
      fetchAlerts();
      fetchCount();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts, fetchCount]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", handleKey);
    }
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const markAllRead = async () => {
    try {
      await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
      setAlerts([]);
      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  };

  const navigateToAlert = (alert: Alert) => {
    setOpen(false);
    if (alert.shipment_id && alert.shipment_ref) {
      router.push(`/shipments/${alert.shipment_ref}`);
    } else {
      router.push("/alerts");
    }
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={bellRef}
        onClick={() => {
          setOpen(!open);
          if (!open) {
            fetchAlerts();
            fetchCount();
          }
        }}
        className="relative flex items-center justify-center w-full px-3 py-2.5 rounded-lg text-sm font-medium
          text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 
          hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
        aria-label={`Notifications — ${unreadCount} unread`}
      >
        <Bell className="h-4 w-4 flex-shrink-0 mr-1.5" />
        <span className="flex-1 text-left">Notifications</span>
        {unreadCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold
            bg-red-500 text-white rounded-full leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-0 mb-1 w-80 max-h-[420px] overflow-hidden
            bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700
            rounded-xl shadow-xl z-50 flex flex-col"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-xs text-slate-500 dark:text-slate-400 font-normal">
                  ({unreadCount} unread)
                </span>
              )}
            </h3>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Alert list */}
          <div className="flex-1 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Check className="h-8 w-8 mx-auto text-emerald-400 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  All clear — no unread alerts
                </p>
              </div>
            ) : (
              alerts.map((alert) => {
                const SeverityIcon = SEVERITY_ICONS[alert.severity] || Info;
                const TypeIcon = TYPE_ICONS[alert.alert_type] || Info;
                const severityColor = SEVERITY_COLORS[alert.severity] || "text-slate-500";
                const severityBg = SEVERITY_BG[alert.severity] || "bg-slate-100";

                return (
                  <button
                    key={alert.id}
                    onClick={() => navigateToAlert(alert)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50
                      border-b border-slate-100 dark:border-slate-800 last:border-0
                      transition-colors flex items-start gap-3"
                  >
                    {/* Severity icon */}
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-lg ${severityBg} flex items-center justify-center`}
                    >
                      <SeverityIcon className={`h-4 w-4 ${severityColor}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {alert.title}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-1">
                        {alert.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <TypeIcon className="h-3 w-3" />
                          {alert.alert_type}
                        </span>
                        {alert.shipment_ref && (
                          <span className="text-[10px] text-blue-500 dark:text-blue-400">
                            {alert.shipment_ref}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto">
                          {timeAgo(alert.created_at)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {alerts.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                Mark all as read
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/alerts");
                }}
                className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                View all alerts →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
