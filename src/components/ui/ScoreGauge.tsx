"use client";

import React from "react";

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export interface ColorThreshold {
  /** Upper bound (inclusive) for this color */
  upTo: number;
  /** Tailwind text color class for the arc + value (e.g. "text-emerald-500") */
  color: string;
  /** Tailwind background class (used for stroke) */
  bgColor: string;
}

export interface ScoreGaugeProps {
  /** Score value 0–100 */
  value: number;
  /** Diameter in px (default 120) */
  size?: number;
  /** Label displayed below the value */
  label: string;
  /** Color thresholds — color changes based on value falling within range */
  colorThresholds?: ColorThreshold[];
  /** Show value as percentage (default true) */
  showPercent?: boolean;
  /** Sub-label for the threshold text */
  thresholdLabel?: string;
}

// ═══════════════════════════════════════════════════════════════════
// Default thresholds (green/amber/red)
// ═══════════════════════════════════════════════════════════════════

const DEFAULT_THRESHOLDS: ColorThreshold[] = [
  { upTo: 49, color: "text-red-500", bgColor: "text-red-500" },
  { upTo: 79, color: "text-amber-500", bgColor: "text-amber-500" },
  { upTo: 100, color: "text-emerald-500", bgColor: "text-emerald-500" },
];

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export default function ScoreGauge({
  value,
  size = 120,
  label,
  colorThresholds = DEFAULT_THRESHOLDS,
  showPercent = true,
  thresholdLabel,
}: ScoreGaugeProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.max(0, Math.min(100, value));
  const dashOffset = circumference - (clampedValue / 100) * circumference;

  // Determine active color
  const activeThreshold =
    colorThresholds.find((t) => clampedValue <= t.upTo) ??
    colorThresholds[colorThresholds.length - 1];

  // Center position
  const center = size / 2;

  // Determine threshold label
  const computedThresholdLabel =
    thresholdLabel ??
    (clampedValue >= 80 ? "Green" : clampedValue >= 50 ? "Amber" : "Red");

  return (
    <div className="inline-flex flex-col items-center gap-1.5">
      {/* SVG Ring Gauge */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          {/* Background arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-200 dark:text-slate-700"
          />
          {/* Value arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={`transition-all duration-700 ease-out ${activeThreshold.bgColor}`}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`text-xl font-bold leading-none ${activeThreshold.color}`}
            style={{ fontSize: size * 0.18 }}
          >
            {clampedValue}
            {showPercent && (
              <span
                className="text-[0.6em]"
                style={{ verticalAlign: "super" }}
              >
                %
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Label */}
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center leading-tight max-w-[140px]">
        {label}
      </span>

      {/* Threshold indicator */}
      <span
        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${getThresholdBadgeColor(
          clampedValue
        )}`}
      >
        {computedThresholdLabel}
      </span>
    </div>
  );
}

function getThresholdBadgeColor(value: number): string {
  if (value >= 80)
    return "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400";
  if (value >= 50)
    return "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400";
  return "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400";
}
