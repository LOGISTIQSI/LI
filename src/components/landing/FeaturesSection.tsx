import { FileText, Gauge, MapPin, ShieldCheck, TrendingUp, Truck } from "lucide-react";
import SectionHeading from "~/components/ui/SectionHeading";

const FEATURES = [
  {
    icon: Truck,
    title: "Shipment Management",
    description:
      "Create, assign, and track every shipment from mine to destination. Full lifecycle visibility.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance Intelligence",
    description:
      "Automated document verification and border-readiness checks before the truck ever leaves.",
  },
  {
    icon: MapPin,
    title: "Real-Time GPS & ETA",
    description:
      "Live position tracking with intelligent ETA predictions across Southern African transport corridors.",
  },
  {
    icon: Gauge,
    title: "Mission Readiness Score",
    description:
      "A 0–100 AI-generated score assessing every shipment's departure readiness across all risk dimensions.",
  },
  {
    icon: TrendingUp,
    title: "Operational Confidence Score",
    description:
      "The probability of successful completion, continuously updated as conditions change en route.",
  },
  {
    icon: FileText,
    title: "Daily Intelligence Brief",
    description:
      "A morning brief delivered to decision-makers with prioritised actions, risk assessments, and fleet status.",
  },
];

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="py-24 sm:py-32"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Everything You Need to Run Cross-Border Transport Operations"
          subtitle="Six integrated capabilities, one command centre."
        />

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="card">
              <div
                className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: "var(--primary-subtle)" }}
              >
                <Icon size={20} style={{ color: "var(--primary)" }} />
              </div>
              <h3
                className="text-base font-semibold"
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
