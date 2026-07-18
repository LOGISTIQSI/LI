import { Quote } from "lucide-react";
import SectionHeading from "~/components/ui/SectionHeading";

export default function TrustSection() {
  return (
    <section
      id="trust"
      className="py-24 sm:py-32"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Trusted by mining and logistics operators across Southern Africa."
        />

        {/* Quote */}
        <div className="mx-auto mt-12 max-w-2xl text-center">
          <Quote
            size={40}
            className="mx-auto mb-4"
            style={{ color: "var(--accent)", opacity: 0.5 }}
          />
          <blockquote
            className="text-xl font-medium italic leading-relaxed sm:text-2xl"
            style={{ color: "var(--text-primary)" }}
          >
            "Trusted by mining and logistics operators across Southern Africa."
          </blockquote>
        </div>

        {/* Early Access CTA */}
        <div className="mx-auto mt-16 text-center">
          <a
            href="mailto:logistiqs.intelligence@proton.me"
            className="inline-flex items-center gap-2 rounded-lg px-8 py-4 text-base font-semibold transition-all hover:scale-105"
            style={{
              backgroundColor: "var(--accent)",
              color: "#fff",
            }}
          >
            Join our early access programme
            <span className="text-lg">&rarr;</span>
          </a>
        </div>
      </div>
    </section>
  );
}
