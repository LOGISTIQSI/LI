"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sentTo, setSentTo] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      setSentTo(email.trim());
      setSuccess(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md px-4 text-center">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <div className="h-14 w-14 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
            Check your email
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            If an account with{" "}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {sentTo}
            </span>{" "}
            exists, we&apos;ve sent a password reset link. Check your inbox and
            follow the instructions to reset your password.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
            Didn&apos;t receive it? Check your spam folder, or{" "}
            <button
              onClick={() => { setSuccess(false); setEmail(sentTo); }}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              try again
            </button>
            .
          </p>
        </div>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md px-4">
      {/* Branding */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 mb-3">
          <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-teal-500 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-base">LI</span>
          </div>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Reset your password
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Enter your email to receive a password reset link
        </p>
      </div>

      {/* Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
        {error && (
          <div className="flex items-start gap-2.5 p-3 mb-5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-colors"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
