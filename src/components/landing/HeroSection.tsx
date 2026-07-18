import { ArrowDown, Zap } from "lucide-react";
import RouteLinesSVG from "~/components/landing/RouteLinesSVG";

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative flex min-h-dvh items-center overflow-hidden"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      {/* SVG background */}
      <RouteLinesSVG />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:grid lg:grid-cols-12 lg:gap-8 lg:px-8 lg:py-32">
        {/* Left column */}
        <div className="lg:col-span-7">
          <span className="overline">LOGISTIQS INTELLIGENCE</span>

          <h1
            className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl"
            style={{ color: "var(--text-primary)" }}
          >
            Preventing Predictable Cross-Border Mining Transport Failures Before
            They Happen.
          </h1>

          <p
            className="mt-6 max-w-xl text-lg leading-relaxed sm:text-xl"
            style={{ color: "var(--text-secondary)" }}
          >
            An AI-powered operations command centre for African cross-border
            mining logistics.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a href="#early-access" className="btn-primary h-12 px-8 text-base sm:h-14 sm:px-10 sm:text-lg">
              Request Early Access
            </a>
            <a
              href="#how-it-works"
              className="btn-ghost h-12 px-8 text-base sm:h-14 sm:px-10 sm:text-lg"
            >
              See how it works
              <ArrowDown size={18} />
            </a>
          </div>
        </div>

        {/* Right column — abstract command centre visual */}
        <div className="mt-16 hidden lg:col-span-5 lg:mt-0 lg:flex lg:items-center lg:justify-center">
          <div
            className="relative w-full rounded-2xl border p-8"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-default)",
            }}
          >
            {/* Mock command centre card */}
            <div className="flex items-center gap-2">
              <Zap size={16} style={{ color: "var(--accent)" }} />
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--text-tertiary)" }}>
                Mission Readiness
              </span>
            </div>
            <div className="mt-4">
              <span
                className="text-5xl font-bold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                87
              </span>
              <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                /100
              </span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full" style={{ backgroundColor: "var(--bg-muted)" }}>
              <div
                className="h-2 rounded-full"
                style={{ width: "87%", backgroundColor: "var(--accent)" }}
              />
            </div>
            <div
              className="mt-6 rounded-lg border p-3"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  Active shipments
                </span>
                <span className="text-xs font-bold" style={{ color: "var(--success)" }}>
                  12 on track
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  Border delay risk
                </span>
                <span className="text-xs font-bold" style={{ color: "var(--warning)" }}>
                  3 at risk
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
        style={{
          background:
            "linear-gradient(to top, var(--bg-primary), transparent)",
        }}
      />
    </section>
  );
}
