"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Truck,
} from "lucide-react";

const COUNTRIES = [
  "South Africa",
  "Zimbabwe",
  "Botswana",
  "Mozambique",
  "Zambia",
  "Namibia",
  "Tanzania",
  "Democratic Republic of Congo",
  "Angola",
  "Malawi",
  "Eswatini",
  "Lesotho",
];

type RegistrationType = "company" | "driver";

export default function RegisterPage() {
  const router = useRouter();
  const [registrationType, setRegistrationType] = useState<RegistrationType>("company");
  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (registrationType === "company") {
      if (
        !companyName.trim() ||
        !companyType ||
        !fullName.trim() ||
        !email.trim() ||
        !phone.trim() ||
        !country ||
        !password
      ) {
        setError("All fields are required.");
        return;
      }
    } else {
      if (
        !fullName.trim() ||
        !email.trim() ||
        !phone.trim() ||
        !country ||
        !password
      ) {
        setError("All fields are required.");
        return;
      }
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const body: Record<string, string> = {
        registrationType,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        country,
        password,
      };

      if (registrationType === "company") {
        body.companyName = companyName.trim();
        body.companyType = companyType;
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      setSuccess(true);

      // Redirect based on registration type
      setTimeout(() => {
        if (registrationType === "driver") {
          router.push("/drivers/new");
        } else {
          router.push("/");
        }
        router.refresh();
      }, 1500);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  }

  if (success) {
    const isDriver = registrationType === "driver";
    return (
      <div className="w-full max-w-md px-4 text-center">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <div className="h-14 w-14 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
            Registration successful
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isDriver
              ? "Redirecting you to complete your driver profile..."
              : "Redirecting you to your dashboard..."}
          </p>
        </div>
      </div>
    );
  }

  const isCompany = registrationType === "company";

  return (
    <div className="w-full max-w-md px-4 py-8">
      {/* Branding */}
      <div className="text-center mb-6">
        <Link href="/" className="inline-flex items-center gap-2 mb-3">
          <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-teal-500 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-base">LI</span>
          </div>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Create your account
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Join LOGISTIQS Intelligence — preventing transport failures before
          they happen.
        </p>
      </div>

      {/* Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
        {/* Role Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            I am registering as a
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRegistrationType("company")}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-left ${
                isCompany
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-sm"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <div
                className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  isCompany
                    ? "bg-blue-500 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                }`}
              >
                <Building2 className="h-5 w-5" />
              </div>
              <div className="text-center">
                <span
                  className={`text-sm font-semibold block ${
                    isCompany
                      ? "text-blue-700 dark:text-blue-300"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  Company
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Mining or logistics firm
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRegistrationType("driver")}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-left ${
                !isCompany
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-sm"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <div
                className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  !isCompany
                    ? "bg-blue-500 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                }`}
              >
                <Truck className="h-5 w-5" />
              </div>
              <div className="text-center">
                <span
                  className={`text-sm font-semibold block ${
                    !isCompany
                      ? "text-blue-700 dark:text-blue-300"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  Independent Driver/Operator
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Owner-operator
                </span>
              </div>
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-3 mb-5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Company fields — only for company registration */}
          {isCompany && (
            <>
              {/* Company Name */}
              <div>
                <label
                  htmlFor="companyName"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Company name
                </label>
                <input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Kalahari Copper Mining"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-colors"
                />
              </div>

              {/* Company Type */}
              <div>
                <label
                  htmlFor="companyType"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Company type
                </label>
                <select
                  id="companyType"
                  value={companyType}
                  onChange={(e) => setCompanyType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-colors"
                >
                  <option value="">Select type...</option>
                  <option value="mining">Mining Company</option>
                  <option value="logistics">Logistics Company</option>
                </select>
              </div>
            </>
          )}

          {/* Full Name */}
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              {isCompany ? "Your full name" : "Full name"}
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Smith"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-colors"
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              {isCompany ? "Company email" : "Email address"}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isCompany ? "you@company.com" : "you@email.com"}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-colors"
            />
          </div>

          {/* Phone + Country row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+27 82 123 4567"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-colors"
              />
            </div>
            <div>
              <label
                htmlFor="country"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Country
              </label>
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-colors"
              >
                <option value="">Select...</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full px-4 py-2.5 pr-11 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isCompany ? (
              <Building2 className="h-4 w-4" />
            ) : (
              <User className="h-4 w-4" />
            )}
            {loading
              ? "Creating account..."
              : isCompany
              ? "Register company"
              : "Register as driver"}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-5">
        Already registered?{" "}
        <Link
          href="/login"
          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
