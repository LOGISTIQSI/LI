"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  IdCard,
  Calendar,
  FileText,
  AlertTriangle,
  Check,
  Loader2,
  Landmark,
  CreditCard,
  Upload,
} from "lucide-react";

function FileUploadField({
  label,
  accept,
  file,
  onChange,
}: {
  label: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const inputId = `file-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
      >
        {label}
      </label>
      <label
        htmlFor={inputId}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
      >
        <Upload className="h-4 w-4 text-slate-400 flex-shrink-0" />
        <span
          className={
            file
              ? "text-slate-900 dark:text-slate-100 truncate"
              : "text-slate-400"
          }
        >
          {file ? file.name : "Choose file..."}
        </span>
        <input
          id={inputId}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] || null)}
        />
      </label>
      {file && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="mt-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
        >
          Remove
        </button>
      )}
    </div>
  );
}

export default function NewDriverPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    license_number: "",
    license_expiry: "",
    pdp_expiry: "",
    medical_certificate_expiry: "",
    passport_number: "",
    passport_expiry: "",
    bank_account_holder: "",
    bank_name: "",
    bank_account_number: "",
    bank_account_type: "cheque",
    bank_branch_code: "",
  });

  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [pdpFile, setPdpFile] = useState<File | null>(null);
  const [medicalFile, setMedicalFile] = useState<File | null>(null);
  const [bankConfirmationFile, setBankConfirmationFile] =
    useState<File | null>(null);

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

    if (!form.full_name.trim()) errs.full_name = "Full name is required";
    if (!form.license_number.trim())
      errs.license_number = "License number is required";
    if (!form.license_expiry) errs.license_expiry = "License expiry is required";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");

    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          passport_file: passportFile?.name || null,
          license_file: licenseFile?.name || null,
          pdp_file: pdpFile?.name || null,
          medical_file: medicalFile?.name || null,
          bank_confirmation_file: bankConfirmationFile?.name || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add driver");
      }

      router.push("/fleet");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong"
      );
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
            Add Driver
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Onboard a new cross-border transport driver
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-5">
            <User className="h-5 w-5 text-blue-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Personal Information
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => updateField("full_name", e.target.value)}
                placeholder="e.g. John Moyo"
                className={`w-full px-3 py-2 rounded-lg border ${
                  errors.full_name
                    ? "border-red-300 dark:border-red-700"
                    : "border-slate-200 dark:border-slate-700"
                } bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
              />
              {errors.full_name && (
                <p className="text-xs text-red-500 mt-1">{errors.full_name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="driver@company.com"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Passport Number
              </label>
              <input
                type="text"
                value={form.passport_number}
                onChange={(e) => updateField("passport_number", e.target.value)}
                placeholder="e.g. AA123456"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Passport Expiry
              </label>
              <input
                type="date"
                value={form.passport_expiry}
                onChange={(e) => updateField("passport_expiry", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <FileUploadField
                label="Passport Copy"
                accept=".jpg,.png,.pdf"
                file={passportFile}
                onChange={setPassportFile}
              />
            </div>
          </div>
        </section>

        {/* License & Credentials */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-5">
            <IdCard className="h-5 w-5 text-blue-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              License &amp; Credentials
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                License Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.license_number}
                onChange={(e) => updateField("license_number", e.target.value)}
                placeholder="e.g. EC-123456"
                className={`w-full px-3 py-2 rounded-lg border ${
                  errors.license_number
                    ? "border-red-300 dark:border-red-700"
                    : "border-slate-200 dark:border-slate-700"
                } bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
              />
              {errors.license_number && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.license_number}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                License Expiry <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.license_expiry}
                onChange={(e) => updateField("license_expiry", e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  errors.license_expiry
                    ? "border-red-300 dark:border-red-700"
                    : "border-slate-200 dark:border-slate-700"
                } bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
              />
              {errors.license_expiry && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.license_expiry}
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <FileUploadField
                label="Driver's License"
                accept=".jpg,.png,.pdf"
                file={licenseFile}
                onChange={setLicenseFile}
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                PDP Expiry
              </label>
              <input
                type="date"
                value={form.pdp_expiry}
                onChange={(e) => updateField("pdp_expiry", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Medical Certificate Expiry
              </label>
              <input
                type="date"
                value={form.medical_certificate_expiry}
                onChange={(e) =>
                  updateField("medical_certificate_expiry", e.target.value)
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <FileUploadField
                label="PDP Certificate"
                accept=".jpg,.png,.pdf"
                file={pdpFile}
                onChange={setPdpFile}
              />
            </div>
            <div>
              <FileUploadField
                label="Medical Certificate"
                accept=".jpg,.png,.pdf"
                file={medicalFile}
                onChange={setMedicalFile}
              />
            </div>
          </div>
        </section>

        {/* Banking Details */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Landmark className="h-5 w-5 text-blue-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Banking Details
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Account Holder Name
              </label>
              <input
                type="text"
                value={form.bank_account_holder}
                onChange={(e) =>
                  updateField("bank_account_holder", e.target.value)
                }
                placeholder="e.g. John Moyo"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Bank Name
              </label>
              <input
                type="text"
                value={form.bank_name}
                onChange={(e) => updateField("bank_name", e.target.value)}
                placeholder="e.g. First National Bank"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Account Number
              </label>
              <input
                type="text"
                value={form.bank_account_number}
                onChange={(e) =>
                  updateField("bank_account_number", e.target.value)
                }
                placeholder="e.g. 63212422769"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Account Type
              </label>
              <select
                value={form.bank_account_type}
                onChange={(e) =>
                  updateField("bank_account_type", e.target.value)
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="cheque">Cheque / Current</option>
                <option value="savings">Savings</option>
                <option value="transmission">Transmission</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Branch Code
              </label>
              <input
                type="text"
                value={form.bank_branch_code}
                onChange={(e) =>
                  updateField("bank_branch_code", e.target.value)
                }
                placeholder="e.g. 250655"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="sm:col-span-2">
              <FileUploadField
                label="Bank Confirmation / Proof of Account"
                accept=".jpg,.png,.pdf"
                file={bankConfirmationFile}
                onChange={setBankConfirmationFile}
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
                Add Driver
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
