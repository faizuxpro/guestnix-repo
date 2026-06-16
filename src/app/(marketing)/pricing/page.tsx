import Link from "next/link";
import {
  LandingRevealController,
  PricingSection,
} from "@/components/marketing/landing";
import { TRIAL_DAYS } from "@/lib/billing/plans";

export const metadata = {
  title: "Pricing",
  description:
    "Simple per-property pricing for vacation rental hosts. Start with a 7-day free trial, then pick the plan that fits your portfolio.",
};

const faqs = [
  {
    q: "Do I need a credit card to start?",
    a: `No. Every host starts with a ${TRIAL_DAYS}-day free trial with no card required.`,
  },
  {
    q: "What happens when my trial ends?",
    a: "If you have not subscribed, your published guides go offline until you choose a plan. Your content is kept safe and comes right back when you subscribe.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes. Switch plans anytime during your trial or after subscribing.",
  },
] as const;

export default function PricingPage() {
  return (
    <>
      <LandingRevealController />

      <section className="landing-section-sm pricing-page-hero">
        <div className="landing-container">
          <div className="landing-section-header is-centered" data-reveal>
            <p className="landing-label">Pricing</p>
            <h1 className="landing-h2">Simple pricing for every host</h1>
            <p className="landing-header-copy">
              Start with a {TRIAL_DAYS}-day free trial. Pick the plan that fits
              your portfolio, see what unlocks by tier, and upgrade anytime.
            </p>
          </div>
        </div>
      </section>

      <PricingSection />

      <section className="landing-section-sm pricing-page-faq">
        <div className="landing-container">
          <div className="pricing-faq-grid">
            {faqs.map((faq) => (
              <article key={faq.q} className="pricing-faq-card" data-reveal>
                <h2>{faq.q}</h2>
                <p>{faq.a}</p>
              </article>
            ))}
          </div>

          <div className="pricing-page-actions" data-reveal>
            <Link href="/signup" className="landing-btn landing-btn-mint">
              Start your free trial
            </Link>
            <Link href="/" className="landing-btn landing-btn-outline">
              Back to home
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
