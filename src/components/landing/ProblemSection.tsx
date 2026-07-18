import { AlertTriangle, ClipboardList, EyeOff, FileWarning } from "lucide-react";
import SectionHeading from "~/components/ui/SectionHeading";

const PROBLEMS = [
  {
    icon: AlertTriangle,
    title: "Border Delays",
    copy: "60% of cross-border mining shipments face delays of 6+ hours at border posts across Southern Africa.",
  },
  {
    icon: FileWarning,
    title: "Compliance Failures",
    copy: "One missing document at the border can cost USD 15,000+ in demurrage, penalties, and idle fleet time.",
  },
  {
    icon: EyeOff,
    title: "No Real-Time Visibility",
    copy: "Most mining operators have zero live visibility once a truck leaves the site. You're flying blind across 2,000 km corridors.",
  },
  {
    icon: ClipboardList,
    title: "Manual Risk Tracking",
    copy: "Spreadsheets, phone calls, and WhatsApp groups are still the primary tools for managing cross-border fleet risk.",
  },
];

export default function ProblemSection() {
  return (
    <section
      id="problem"
      className="py-24 sm:py-32"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="The Cost of Unpredictable Cross-Border Transport"
          subtitle="Every delayed shipment costs more than you think."
        />

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PROBLEMS.map(({ icon: Icon, title, copy }) => (
            <div
              key={title}
              className="card group transition-all"
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--border-default)";
                (e.currentTarget as HTMLElement).style.boxShadow =
                  "0 4px 20px rgba(0,0,0,0.08)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--border-default)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            >
              <div
                className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: "var(--danger-subtle)" }}
              >
                <Icon size={20} style={{ color: "var(--danger)" }} />
              </div>
              <h3
                className="text-lg font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {title}
              </h3>
              <p
                className="mt-2 text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {copy}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
