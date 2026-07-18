import { Cpu, PlusCircle, ShieldCheck } from "lucide-react";
import SectionHeading from "~/components/ui/SectionHeading";

const STEPS = [
  {
    number: "01",
    icon: PlusCircle,
    title: "Create Shipment",
    description:
      "Define routes, assign verified drivers and vehicles, and attach all compliance documentation in one place.",
  },
  {
    number: "02",
    icon: Cpu,
    title: "AI Monitors",
    description:
      "Every shipment gets a Mission Readiness Score before departure. Live GPS, ETA predictions, and Operational Confidence Scores update in real time.",
  },
  {
    number: "03",
    icon: ShieldCheck,
    title: "Prevent Failures",
    description:
      "Receive a Daily Intelligence Brief each morning with prioritised decisions. Predictive alerts surface risks before they become costly failures.",
  },
];

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="py-24 sm:py-32"
      style={{ backgroundColor: "var(--bg-surface)" }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="How It Works"
          subtitle="Three steps from shipment creation to failure prevention."
        />

        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {STEPS.map(({ number, icon: Icon, title, description }, i) => (
            <div key={number} className="relative text-center">
              {/* Connector line between steps (desktop only) */}
              {i < STEPS.length - 1 && (
                <div
                  className="absolute left-1/2 top-12 hidden h-px w-full sm:block"
                  style={{ backgroundColor: "var(--border-default)" }}
                />
              )}

              {/* Step number badge */}
              <div className="relative z-10 mx-auto flex h-24 w-24 items-center justify-center">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: "var(--accent-subtle)",
                    border: "2px solid var(--accent)",
                  }}
                >
                  <Icon size={28} style={{ color: "var(--accent)" }} />
                </div>
              </div>

              <span
                className="mt-2 inline-block text-xs font-bold tracking-widest"
                style={{ color: "var(--accent)" }}
              >
                {number}
              </span>

              <h3
                className="mt-3 text-lg font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {title}
              </h3>
              <p
                className="mt-2 text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
