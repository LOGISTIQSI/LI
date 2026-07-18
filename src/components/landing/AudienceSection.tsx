import { Building2, Package, UserCheck } from "lucide-react";
import SectionHeading from "~/components/ui/SectionHeading";

const AUDIENCES = [
  {
    icon: Building2,
    title: "Mining Companies",
    quote:
      "Know where every shipment is, whether it will arrive on time, and what risks threaten your supply chain — before your operations team asks.",
  },
  {
    icon: Package,
    title: "Logistics Firms",
    quote:
      "Demonstrate reliability with data. Prove compliance, track fleet performance, and win more contracts by showing mining clients your operational excellence.",
  },
  {
    icon: UserCheck,
    title: "Transport Operators & Drivers",
    quote:
      "Reduce border delays and paperwork rejections. Get clear, actionable instructions before departure so you spend less time waiting and more time moving.",
  },
];

export default function AudienceSection() {
  return (
    <section
      id="audience"
      className="py-24 sm:py-32"
      style={{ backgroundColor: "var(--bg-surface)" }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Built for the People Who Move Africa's Resources"
          subtitle="Purpose-built for every stakeholder in the cross-border mining supply chain."
        />

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {AUDIENCES.map(({ icon: Icon, title, quote }) => (
            <div key={title} className="card text-center">
              <div
                className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl"
                style={{ backgroundColor: "var(--accent-subtle)" }}
              >
                <Icon size={26} style={{ color: "var(--accent)" }} />
              </div>
              <h3
                className="text-lg font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {title}
              </h3>
              <p
                className="mt-3 text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {quote}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
