"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Shield,
  UserCheck,
  TruckIcon,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

interface Driver {
  id: number;
  user_id: number | null;
  company_id: number;
  license_number: string;
  license_type: string;
  license_expiry: string;
  pdp_number: string;
  pdp_expiry: string;
  medical_certificate_expiry: string;
  passport_number: string;
  passport_expiry: string;
  dg_endorsement: number;
  dg_expiry: string | null;
  yellow_fever_cert: number;
  hiv_cert_expiry: string | null;
  is_verified: number;
  status: string;
  full_name: string;
  company_name: string;
}

interface Vehicle {
  id: number;
  company_id: number;
  registration_number: string;
  vehicle_type: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  gvm: number;
  max_payload: number;
  registration_expiry: string;
  roadworthiness_expiry: string;
  insurance_type: string;
  insurance_expiry: string;
  cross_border_permit_number: string;
  cross_border_permit_expiry: string;
  is_dg_capable: number;
  is_verified: number;
  status: string;
  company_name: string;
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function expiryBadge(dateStr: string | null): {
  text: string;
  color: string;
} {
  if (!dateStr) return { text: "N/A", color: "text-slate-400" };
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const exp = new Date(dateStr + "T00:00:00");
  const days = Math.floor(
    (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (days < 0)
    return {
      text: `Expired ${Math.abs(days)}d ago`,
      color: "text-red-600 dark:text-red-400 font-semibold",
    };
  if (days === 0)
    return {
      text: "Expires today",
      color: "text-red-600 dark:text-red-400 font-semibold",
    };
  if (days <= 7)
    return {
      text: `${days}d remaining`,
      color: "text-red-600 dark:text-red-400 font-semibold",
    };
  if (days <= 30)
    return {
      text: `${days}d remaining`,
      color: "text-amber-600 dark:text-amber-400",
    };
  return {
    text: `${days}d remaining`,
    color: "text-emerald-600 dark:text-emerald-400",
  };
}

// ═══════════════════════════════════════════════════════════════════
// Page Component
// ═══════════════════════════════════════════════════════════════════

export default function VerificationPage() {
  const [activeTab, setActiveTab] = useState<"drivers" | "vehicles">(
    "drivers"
  );
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {}
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [drRes, vhRes] = await Promise.all([
        fetch("/api/drivers"),
        fetch("/api/vehicles"),
      ]);
      const drData: Driver[] = await drRes.json();
      const vhData: Vehicle[] = await vhRes.json();
      setDrivers(drData.filter((d) => d.is_verified === 0));
      setVehicles(vhData.filter((v) => v.is_verified === 0));
    } catch (err) {
      console.error("Failed to fetch verification data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleVerification = async (
    type: "driver" | "vehicle",
    id: number,
    approved: boolean
  ) => {
    const key = `${type}-${id}`;
    setActionLoading((prev) => ({ ...prev, [key]: true }));

    try {
      const url =
        type === "driver"
          ? `/api/drivers/${id}`
          : `/api/vehicles/${id}`;

      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_verified: approved }),
      });

      if (res.ok) {
        // Remove from pending list
        if (type === "driver") {
          setDrivers((prev) => prev.filter((d) => d.id !== id));
        } else {
          setVehicles((prev) => prev.filter((v) => v.id !== id));
        }
      } else {
        const err = await res.json();
        console.error(`Failed to ${approved ? "approve" : "reject"}:`, err);
      }
    } catch (err) {
      console.error("Verification action failed:", err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const pendingDriversCount = drivers.length;
  const pendingVehiclesCount = vehicles.length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Verification
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Review and approve pending drivers and vehicles
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          className={`bg-white dark:bg-slate-900 rounded-xl border p-5 cursor-pointer transition-all ${
            activeTab === "drivers"
              ? "border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20"
              : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
          onClick={() => setActiveTab("drivers")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {pendingDriversCount}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pending Drivers
              </p>
            </div>
          </div>
        </div>

        <div
          className={`bg-white dark:bg-slate-900 rounded-xl border p-5 cursor-pointer transition-all ${
            activeTab === "vehicles"
              ? "border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20"
              : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
          onClick={() => setActiveTab("vehicles")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center">
              <TruckIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {pendingVehiclesCount}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pending Vehicles
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Pending Drivers Table */}
            {activeTab === "drivers" && (
              <>
                {drivers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <CheckCircle className="h-12 w-12 text-emerald-300 dark:text-emerald-600 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                      All drivers verified
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                      No pending driver verifications. New driver registrations
                      will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Driver
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Company
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            License
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            PDP Expiry
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Medical Expiry
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Passport Expiry
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {drivers.map((driver) => {
                          const pdpBadge = expiryBadge(driver.pdp_expiry);
                          const medicalBadge = expiryBadge(
                            driver.medical_certificate_expiry
                          );
                          const passportBadge = expiryBadge(
                            driver.passport_expiry
                          );
                          const licenseBadge = expiryBadge(
                            driver.license_expiry
                          );
                          const key = `driver-${driver.id}`;
                          const isLoading = actionLoading[key];

                          return (
                            <tr
                              key={driver.id}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                            >
                              <td className="px-4 py-3">
                                <div>
                                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                                    {driver.full_name || `Driver #${driver.id}`}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                    Lic: {driver.license_number} (
                                    {driver.license_type})
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                  {driver.company_name || "—"}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-sm ${licenseBadge.color}`}>
                                  {formatDate(driver.license_expiry)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div>
                                  <span className={`text-sm ${pdpBadge.color}`}>
                                    {formatDate(driver.pdp_expiry)}
                                  </span>
                                  <p className="text-[10px] text-slate-400 font-mono">
                                    {driver.pdp_number}
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`text-sm ${medicalBadge.color}`}
                                >
                                  {formatDate(
                                    driver.medical_certificate_expiry
                                  )}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`text-sm ${passportBadge.color}`}
                                >
                                  {formatDate(driver.passport_expiry)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() =>
                                      handleVerification(
                                        "driver",
                                        driver.id,
                                        true
                                      )
                                    }
                                    disabled={isLoading}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 transition-colors disabled:opacity-50"
                                  >
                                    {isLoading ? (
                                      <div className="h-3.5 w-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <CheckCircle className="h-3.5 w-3.5" />
                                    )}
                                    Approve
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleVerification(
                                        "driver",
                                        driver.id,
                                        false
                                      )
                                    }
                                    disabled={isLoading}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-950/70 transition-colors disabled:opacity-50"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                    Reject
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
              </>
            )}

            {/* Pending Vehicles Table */}
            {activeTab === "vehicles" && (
              <>
                {vehicles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <CheckCircle className="h-12 w-12 text-emerald-300 dark:text-emerald-600 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                      All vehicles verified
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                      No pending vehicle verifications. New vehicle
                      registrations will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Vehicle
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Company
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Reg. Expiry
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Roadworthy Expiry
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Insurance Expiry
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            CB Permit
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {vehicles.map((vehicle) => {
                          const regBadge = expiryBadge(
                            vehicle.registration_expiry
                          );
                          const rwBadge = expiryBadge(
                            vehicle.roadworthiness_expiry
                          );
                          const insBadge = expiryBadge(
                            vehicle.insurance_expiry
                          );
                          const cbBadge = expiryBadge(
                            vehicle.cross_border_permit_expiry
                          );
                          const key = `vehicle-${vehicle.id}`;
                          const isLoading = actionLoading[key];

                          return (
                            <tr
                              key={vehicle.id}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                            >
                              <td className="px-4 py-3">
                                <div>
                                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                                    {vehicle.registration_number}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {vehicle.make} {vehicle.model} (
                                    {vehicle.year})
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                  {vehicle.company_name || "—"}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  {vehicle.vehicle_type}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-sm ${regBadge.color}`}>
                                  {formatDate(vehicle.registration_expiry)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-sm ${rwBadge.color}`}>
                                  {formatDate(vehicle.roadworthiness_expiry)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div>
                                  <span
                                    className={`text-sm ${insBadge.color}`}
                                  >
                                    {formatDate(vehicle.insurance_expiry)}
                                  </span>
                                  <p className="text-[10px] text-slate-400">
                                    {vehicle.insurance_type}
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div>
                                  <span className={`text-sm ${cbBadge.color}`}>
                                    {formatDate(
                                      vehicle.cross_border_permit_expiry
                                    )}
                                  </span>
                                  <p className="text-[10px] text-slate-400 font-mono">
                                    {vehicle.cross_border_permit_number}
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() =>
                                      handleVerification(
                                        "vehicle",
                                        vehicle.id,
                                        true
                                      )
                                    }
                                    disabled={isLoading}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 transition-colors disabled:opacity-50"
                                  >
                                    {isLoading ? (
                                      <div className="h-3.5 w-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <CheckCircle className="h-3.5 w-3.5" />
                                    )}
                                    Approve
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleVerification(
                                        "vehicle",
                                        vehicle.id,
                                        false
                                      )
                                    }
                                    disabled={isLoading}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-950/70 transition-colors disabled:opacity-50"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                    Reject
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
              </>
            )}
          </>
        )}
      </div>

      {/* Footer summary */}
      {!loading && (
        <div className="text-xs text-slate-500 dark:text-slate-400 text-right">
          {activeTab === "drivers"
            ? `${drivers.length} driver${drivers.length !== 1 ? "s" : ""} pending verification`
            : `${vehicles.length} vehicle${vehicles.length !== 1 ? "s" : ""} pending verification`}
        </div>
      )}
    </div>
  );
}
