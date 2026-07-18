"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  MapPin,
  User,
  Truck,
  Calendar,
  AlertTriangle,
  Check,
  Loader2,
} from "lucide-react";

const COUNTRIES = [
  "South Africa",
  "Zimbabwe",
  "Zambia",
  "Botswana",
  "Mozambique",
  "Namibia",
  "DRC",
  "Tanzania",
  "Malawi",
  "Angola",
];

const BORDER_CROSSINGS = [
  "Beitbridge",
  "Kazungula",
  "Chirundu",
  "Kasumbalesa",
  "Katima Mulilo",
  "Ressano Garcia",
  "Nakonde",
  "Groblersbrug",
  "Lebombo",
  "Plumtree",
  "Forbes",
  "Mwanza",
];

const CARGO_TYPES = [
  "Copper Cathode",
  "Copper Concentrate",
  "Cobalt Hydroxide",
  "Coal",
  "Lithium Ore",
  "Diamonds",
  "Mining Equipment",
  "Explosives",
  "Other",
];

const DG_CLASSES = [
  "1 — Explosives",
  "2 — Gases",
  "3 — Flammable Liquids",
  "4 — Flammable Solids",
  "5 — Oxidizing Substances",
  "6 — Toxic Substances",
  "7 — Radioactive Material",
  "8 — Corrosive Substances",
  "9 — Miscellaneous Dangerous Goods",
];

interface Driver {
  id: number;
  full_name: string;
  license_number: string;
  status: string;
}

interface Vehicle {
  id: number;
  registration_number: string;
  vehicle_type: string;
  make: string;
  model: string;
  status: string;
}

interface Company {
  id: number;
  name: string;
  type: string;
}

export default function NewShipmentPage() {
  const router = useRouter();

  // Dropdown data
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form state
  const [form, setForm] = useState({
    origin: "",
    origin_country: "",
    destination: "",
    destination_country: "",
    border_crossings: [] as string[],
    cargo_type: "",
    cargo_description: "",
    cargo_hs_code: "",
    cargo_weight_kg: "",
    cargo_value: "",
    is_dangerous_goods: false,
    dg_class: "",
    driver_id: "",
    vehicle_id: "",
    logistics_company_id: "",
    departure_scheduled: "",
    eta: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    async function loadData() {
      const [driversRes, vehiclesRes] = await Promise.all([
        fetch("/api/drivers"),
        fetch("/api/vehicles"),
      ]);
      const driversData = await driversRes.json();
      const vehiclesData = await vehiclesRes.json();
      setDrivers(driversData);
      setVehicles(vehiclesData);
      // Companies — we can infer from the existing data or use a hardcoded set
      setCompanies([
        { id: 1, name: "Kalahari Copper Mining Ltd", type: "mining" },
        { id: 2, name: "SADC Cross-Border Logistics", type: "logistics" },
        { id: 3, name: "Zambezi Transporters Ltd", type: "transporter" },
      ]);
      setLoadingData(false);
    }
    loadData();
  }, []);

  function updateField(field: string, value: string | boolean | string[]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field on change
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function toggleBorder(border: string) {
    const current = form.border_crossings;
    if (current.includes(border)) {
      updateField("border_crossings", current.filter((b) => b !== border));
    } else {
      updateField("border_crossings", [...current, border]);
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (!form.origin.trim()) errs.origin = "Origin is required";
    if (!form.origin_country) errs.origin_country = "Origin country is required";
    if (!form.destination.trim()) errs.destination = "Destination is required";
    if (!form.destination_country) errs.destination_country = "Destination country is required";
    if (!form.cargo_type) errs.cargo_type = "Cargo type is required";
    if (!form.cargo_weight_kg || Number(form.cargo_weight_kg) <= 0) errs.cargo_weight_kg = "Valid weight is required";
    if (form.is_dangerous_goods && !form.dg_class) errs.dg_class = "DG Class is required for dangerous goods";
    if (!form.departure_scheduled) errs.departure_scheduled = "Departure date is required";
    if (!form.eta) errs.eta = "Estimated arrival is required";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");

    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          cargo_weight_kg: Number(form.cargo_weight_kg),
          cargo_value: Number(form.cargo_value) || 0,
          driver_id: form.driver_id ? Number(form.driver_id) : null,
          vehicle_id: form.vehicle_id ? Number(form.vehicle_id) : null,
          logistics_company_id: form.logistics_company_id
            ? Number(form.logistics_company_id)
            : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create shipment");
      }

      const shipment = await res.json();
      router.push(`/shipments/${shipment.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  if (loadingData) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back + header */}
      <div className="flex items-center gap-4">
        <Link
          href="/shipments"
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            New Shipment
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Create a new cross-border transport shipment
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section A — Shipment Details */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-5">
            <MapPin className="h-5 w-5 text-blue-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Shipment Details
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Origin <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.origin}
                onChange={(e) => updateField("origin", e.target.value)}
                placeholder="e.g. Solwezi, Zambia"
                className={`w-full px-3 py-2 rounded-lg border ${
                  errors.origin
                    ? "border-red-300 dark:border-red-700"
                    : "border-slate-200 dark:border-slate-700"
                } bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
              />
              {errors.origin && (
                <p className="text-xs text-red-500 mt-1">{errors.origin}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Origin Country <span className="text-red-500">*</span>
              </label>
              <select
                value={form.origin_country}
                onChange={(e) => updateField("origin_country", e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  errors.origin_country
                    ? "border-red-300 dark:border-red-700"
                    : "border-slate-200 dark:border-slate-700"
                } bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
              >
                <option value="">Select country</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {errors.origin_country && (
                <p className="text-xs text-red-500 mt-1">{errors.origin_country}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Destination <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.destination}
                onChange={(e) => updateField("destination", e.target.value)}
                placeholder="e.g. Durban, South Africa"
                className={`w-full px-3 py-2 rounded-lg border ${
                  errors.destination
                    ? "border-red-300 dark:border-red-700"
                    : "border-slate-200 dark:border-slate-700"
                } bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
              />
              {errors.destination && (
                <p className="text-xs text-red-500 mt-1">{errors.destination}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Destination Country <span className="text-red-500">*</span>
              </label>
              <select
                value={form.destination_country}
                onChange={(e) => updateField("destination_country", e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  errors.destination_country
                    ? "border-red-300 dark:border-red-700"
                    : "border-slate-200 dark:border-slate-700"
                } bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
              >
                <option value="">Select country</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {errors.destination_country && (
                <p className="text-xs text-red-500 mt-1">{errors.destination_country}</p>
              )}
            </div>
          </div>

          {/* Border Crossings */}
          <div className="mt-5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Border Crossings
            </label>
            <div className="flex flex-wrap gap-2">
              {BORDER_CROSSINGS.map((border) => {
                const selected = form.border_crossings.includes(border);
                return (
                  <button
                    key={border}
                    type="button"
                    onClick={() => toggleBorder(border)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      selected
                        ? "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    {selected && <Check className="h-3 w-3" />}
                    {border}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section B — Cargo Details */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Package className="h-5 w-5 text-blue-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Cargo Details
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Cargo Type <span className="text-red-500">*</span>
              </label>
              <select
                value={form.cargo_type}
                onChange={(e) => updateField("cargo_type", e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  errors.cargo_type
                    ? "border-red-300 dark:border-red-700"
                    : "border-slate-200 dark:border-slate-700"
                } bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
              >
                <option value="">Select cargo type</option>
                {CARGO_TYPES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {errors.cargo_type && (
                <p className="text-xs text-red-500 mt-1">{errors.cargo_type}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                HS Code
              </label>
              <input
                type="text"
                value={form.cargo_hs_code}
                onChange={(e) => updateField("cargo_hs_code", e.target.value)}
                placeholder="e.g. 7403.11"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Weight (kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.cargo_weight_kg}
                onChange={(e) => updateField("cargo_weight_kg", e.target.value)}
                placeholder="e.g. 28000"
                min="0"
                className={`w-full px-3 py-2 rounded-lg border ${
                  errors.cargo_weight_kg
                    ? "border-red-300 dark:border-red-700"
                    : "border-slate-200 dark:border-slate-700"
                } bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
              />
              {errors.cargo_weight_kg && (
                <p className="text-xs text-red-500 mt-1">{errors.cargo_weight_kg}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Declared Value (USD)
              </label>
              <input
                type="number"
                value={form.cargo_value}
                onChange={(e) => updateField("cargo_value", e.target.value)}
                placeholder="e.g. 125000"
                min="0"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Cargo Description
              </label>
              <textarea
                value={form.cargo_description}
                onChange={(e) => updateField("cargo_description", e.target.value)}
                rows={3}
                placeholder="Describe the cargo being transported..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
              />
            </div>
          </div>

          {/* Dangerous Goods */}
          <div className="mt-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_dangerous_goods}
                onChange={(e) => {
                  updateField("is_dangerous_goods", e.target.checked);
                  if (!e.target.checked) updateField("dg_class", "");
                }}
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Dangerous Goods
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                  Check if this shipment contains hazardous materials
                </span>
              </div>
            </label>
            {form.is_dangerous_goods && (
              <div className="mt-3 pl-7">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  DG Class <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.dg_class}
                  onChange={(e) => updateField("dg_class", e.target.value)}
                  className={`w-full max-w-xs px-3 py-2 rounded-lg border ${
                    errors.dg_class
                      ? "border-red-300 dark:border-red-700"
                      : "border-slate-200 dark:border-slate-700"
                  } bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
                >
                  <option value="">Select DG class</option>
                  {DG_CLASSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {errors.dg_class && (
                  <p className="text-xs text-red-500 mt-1">{errors.dg_class}</p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Section C — Assignment */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-5">
            <User className="h-5 w-5 text-blue-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Assignment
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Driver
              </label>
              <select
                value={form.driver_id}
                onChange={(e) => updateField("driver_id", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="">Unassigned</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name || `Driver #${d.id}`} — {d.license_number}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Vehicle
              </label>
              <select
                value={form.vehicle_id}
                onChange={(e) => updateField("vehicle_id", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="">Unassigned</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration_number} — {v.make} {v.model} ({v.vehicle_type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Logistics Company
              </label>
              <select
                value={form.logistics_company_id}
                onChange={(e) => updateField("logistics_company_id", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="">None</option>
                {companies
                  .filter((c) => c.type === "logistics")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </section>

        {/* Section D — Schedule */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Calendar className="h-5 w-5 text-blue-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Schedule
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Scheduled Departure <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={form.departure_scheduled}
                onChange={(e) => updateField("departure_scheduled", e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  errors.departure_scheduled
                    ? "border-red-300 dark:border-red-700"
                    : "border-slate-200 dark:border-slate-700"
                } bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
              />
              {errors.departure_scheduled && (
                <p className="text-xs text-red-500 mt-1">{errors.departure_scheduled}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Estimated Arrival <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={form.eta}
                onChange={(e) => updateField("eta", e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  errors.eta
                    ? "border-red-300 dark:border-red-700"
                    : "border-slate-200 dark:border-slate-700"
                } bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
              />
              {errors.eta && (
                <p className="text-xs text-red-500 mt-1">{errors.eta}</p>
              )}
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
            href="/shipments"
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
                Creating...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Create Shipment
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
