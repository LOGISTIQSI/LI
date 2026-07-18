import { createFileRoute } from "@tanstack/react-router";
import Navbar from "~/components/landing/Navbar";
import HeroSection from "~/components/landing/HeroSection";
import ProblemSection from "~/components/landing/ProblemSection";
import HowItWorksSection from "~/components/landing/HowItWorksSection";
import FeaturesSection from "~/components/landing/FeaturesSection";
import AudienceSection from "~/components/landing/AudienceSection";
import TrustSection from "~/components/landing/TrustSection";
import CTASection from "~/components/landing/CTASection";
import Footer from "~/components/landing/Footer";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <FeaturesSection />
        <AudienceSection />
        <TrustSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
