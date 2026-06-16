import {
  AiConciergeSection,
  AudienceSection,
  BeforeAfterSection,
  FaqSection,
  FeatureTicker,
  FinalLandingCta,
  ImpactSection,
  LandingFeaturesSection,
  LandingHeroSection,
  LandingHowItWorksSection,
  LandingRevealController,
  PricingSection,
  RoadmapSection,
  TestimonialsSection,
} from "@/components/marketing/landing";

export default function MarketingHome() {
  return (
    <>
      <LandingRevealController />
      <LandingHeroSection />
      <FeatureTicker />
      <BeforeAfterSection />
      <AudienceSection />
      <LandingHowItWorksSection />
      <LandingFeaturesSection />
      <AiConciergeSection />
      <ImpactSection />
      <RoadmapSection />
      <TestimonialsSection />
      <PricingSection />
      <FaqSection />
      <FinalLandingCta />
    </>
  );
}
