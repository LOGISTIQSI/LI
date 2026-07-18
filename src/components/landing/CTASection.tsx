import SectionHeading from "~/components/ui/SectionHeading";

export default function CTASection() {
  return (
    <section
      id="early-access"
      className="py-24 sm:py-32"
      style={{ backgroundColor: "var(--bg-surface)" }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading title="Ready to prevent transport failures before they happen?" />

          <div className="mt-10 flex flex-col items-center gap-4">
            <a
              href="mailto:logistiqs.intelligence@proton.me"
              className="btn-primary h-14 px-10 text-lg"
            >
              Request Early Access
            </a>
            <a
              href="mailto:logistiqs.intelligence@proton.me"
              className="text-sm transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "var(--text-secondary)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "var(--text-tertiary)";
              }}
            >
              logistiqs.intelligence@proton.me
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
