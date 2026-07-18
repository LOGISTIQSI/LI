"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShieldCheck,
  MapPin,
  BrainCircuit,
  BarChart3,
  Truck,
  CreditCard,
  Settings,
  Menu,
  X,
  LogOut,
  User,
} from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import NotificationBell from "@/components/ui/NotificationBell";
import { useAuth } from "@/components/auth/AuthProvider";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/shipments", label: "Shipments", icon: Package },
  { href: "/compliance", label: "Compliance", icon: ShieldCheck },
  { href: "/tracking", label: "Tracking", icon: MapPin },
  {
    href: "/intelligence-brief",
    label: "Intelligence Brief",
    icon: BrainCircuit,
  },
  { href: "/executive", label: "Executive", icon: BarChart3 },
  { href: "/fleet", label: "Fleet", icon: Truck },
  { href: "/payment", label: "Payment", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg
          bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
          text-slate-700 dark:text-slate-200 shadow-sm"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-full w-64
          bg-white dark:bg-slate-900
          border-r border-slate-200 dark:border-slate-800
          flex flex-col
          transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Branding */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-teal-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">LI</span>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                LOGISTIQS
              </h1>
              <p className="text-[10px] font-semibold tracking-widest text-blue-600 dark:text-blue-400 uppercase">
                Intelligence
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            Preventing Predictable Transport Failures Before They Happen.
          </p>
        </div>

        {/* User info */}
        {user && (
          <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {user.fullName}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  {user.role}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors
                  ${
                    isActive
                      ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                  }
                `}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom area */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          {/* Notifications */}
          <NotificationBell />

          <div className="mt-2">
            <ThemeToggle />
          </div>

          {/* Logout button */}
          <button
            onClick={logout}
            className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </button>

          <div className="mt-3 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-0.5">
              System Status
            </p>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs text-slate-600 dark:text-slate-400">
                All engines operational
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
