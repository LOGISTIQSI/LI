"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Truck,
  FileText,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  Check,
  Loader2,
} from "lucide-react";

export default function NewVehiclePage() {
  const router = useRouter();

  const [form, setForm] = useState({
    registration_number: "",
    make: "",
    model: "",
    year: "",
    vin: "",
    insurance_expiry: "",
    roadworthiness_expiry: "",
    permit_number: "",
    permit_expiry: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (!form.registration_number.trim()) errs.registration_number = "Registration number is required";
    if (!form.make.trim()) errs.make = "Make is required";
    if (!form.model.trim()) errs.model = "Model is required";
    if (!form.year || Number(form.year) < 1980 || Number(form.year) > 2035) {
      errs.year = "Valid year is required (1980–2035)";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");

    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add vehicle");
      }

      router.push("/fleet");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back + header */}
      <div className="flex items-center gap-4">
        <Link
          href="/fleet"
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Add Vehicle
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Register a new transport vehicle for cross-border operations
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vehicle Details */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Truck className="h-5 w-5 text-blue-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Vehicle Details
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Registration Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.registration_number}
                onChange={(e) => updateField("registration_number", e.target.value)}
                placeholder="e.g. ABC 123 GP"
                className={`w-full px-3 py-2 rounded-lg border ${
                  errors.registration_number
                    ? "border-red-300 dark:border-red-700"
                    : "border-slate-200 dark:border-slate-700"
                } bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
              />
              {errors.registration_number && (
                <p className="text-xs text-red-500 mt-1">{errors.registration_number}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                VIN
              </label>
              <input
                type="text"
                value={form.vin}
                onChange={(e) => updateField("vin", e.target.value)}
                placeholder="e.g. 1HGCM82633A123456"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Make <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.make}
                onChange={(e) => updateField("make", e.target.value)}
                placeholder="e.g. Volvo"
                className={`w-full px-3 py-2 rounded-lg border ${
                  errors.make
                    ? "border-red-300 dark:border-red-700"
                    : "border-slate-200 dark:border-slate-700"
                } bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
              />
              {errors.make && (
                <p className="text-xs text-red-500 mt-1">{errors.make}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Model <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => updateField("model", e.target.value)}
                placeholder="e.g. FH16"
                className={`w-full px-3 py-2 rounded-lg border ${
                  errors.model
                    ? "border-red-300 dark:border-red-700"
                    : "border-slate-200 dark:border-slate-700"
                } bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
              />
              {errors.model && (
                <p className="text-xs text-red-500 mt-1">{errors.model}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Year <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.year}
                onChange={(e) => updateField("year", e.target.value)}
                placeholder="e.g. 2023"
                min="1980"
                max="2035"
                className={`w-full px-3 py-2 rounded-lg border ${
                  errors.year
                    ? "border-red-300 dark:border-red-700"
                    : "border-slate-200 dark:border-slate-700"
                } bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
              />
              {errors.year && (
                <p className="text-xs text-red-500 mt-1">{errors.year}</p>
              )}
            </div>
          </div>
        </section>

        {/* Compliance & Permits */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-5">
            <ShieldCheck className="h-5 w-5 text-blue-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Compliance &amp; Permits
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Insurance Expiry
              </label>
              <input
                type="date"
                value={form.insurance_expiry}
                onChange={(e) => updateField("insurance_expiry", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Roadworthiness Expiry
              </label>
              <input
                type="date"
                value={form.roadworthiness_expiry}
                onChange={(e) => updateField("roadworthiness_expiry", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Cross-Border Permit Number
              </label>
              <input
                type="text"
                value={form.permit_number}
                onChange={(e) => updateField("permit_number", e.target.value)}
                placeholder="e.g. CBP-2025-7890"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Cross-Border Permit Expiry
              </label>
              <input
                type="date"
                value={form.permit_expiry}
                onChange={(e) => updateField("permit_expiry", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        </section>

        {/* Submit / Cancel */}
        {submitError && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {submitError}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/fleet"
            className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Add Vehicle
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
