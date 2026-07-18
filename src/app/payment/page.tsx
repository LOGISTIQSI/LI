"use client";

import {
  Building2,
  CreditCard,
  Hash,
  Landmark,
  Mail,
  FileText,
  Clock,
  ShieldCheck,
  Copy,
  Check,
} from "lucide-react";
import { useState } from "react";

// ── Banking details ──

const bankingDetails = [
  { label: "Bank", value: "First National Bank (FNB)", icon: Building2 },
  { label: "Account Name", value: "LOGISTIQS Intelligence", icon: Landmark },
  {
    label: "Business Account Number",
    value: "63212422769",
    icon: CreditCard,
  },
  { label: "Branch Code", value: "250655", icon: Hash },
  { label: "Payment Reference", value: "LOGISTIQS", icon: FileText },
];

// ── Page Component ──

export default function PaymentPage() {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  async function copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Payment
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          EFT payment details for your LOGISTIQS Intelligence subscription
        </p>
      </div>

      {/* Banking Details Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Card header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
              <Landmark className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                FNB Banking Details
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Use these details for your EFT payment
              </p>
            </div>
          </div>
        </div>

        {/* Details rows */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {bankingDetails.map((detail) => {
            const Icon = detail.icon;
            const isCopied = copiedField === detail.label;

            return (
              <div
                key={detail.label}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {detail.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white text-right">
                    {detail.value}
                  </span>
                  <button
                    onClick={() => copyToClipboard(detail.value, detail.label)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
                    title={`Copy ${detail.label}`}
                  >
                    {isCopied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Proof of Payment Instruction */}
      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800 p-5">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
            <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
              After completing payment
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Email proof of payment to:{" "}
              <a
                href="mailto:logistiqs.intelligence@proton.me"
                className="font-semibold underline underline-offset-2 hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
              >
                logistiqs.intelligence@proton.me
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Important Notes */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              EFT payments only
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Service activation will begin once payment is confirmed. Please
              allow 1–2 business days for processing.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-emerald-500 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              Secure banking
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              All payments are processed through FNB&apos;s secure banking
              infrastructure. We do not store any banking credentials.
            </p>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
        For billing inquiries, contact us at{" "}
        <a
          href="mailto:logistiqs.intelligence@proton.me"
          className="underline underline-offset-2 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          logistiqs.intelligence@proton.me
        </a>
      </p>
    </div>
  );
}
