import { BadgeCheck, ClipboardCheck, MessageCircleHeart } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

const proofPoints = [
  {
    icon: BadgeCheck,
    label: "Built from a real host tool",
    body:
      "GuestNix is the SaaS evolution of a simpler welcome guide creator already used by vacation rental hosts.",
    note: "Same guidebook foundation, deeper setup and automation.",
    accent: "accent-coral",
  },
  {
    icon: MessageCircleHeart,
    label: "Early hosts are being invited now",
    body:
      "The first access group will test the new SaaS flow, AI concierge, templates, and publishing experience before broad launch.",
    note: "Founder-led onboarding, feedback, and fixes.",
    accent: "accent-amber",
  },
  {
    icon: ClipboardCheck,
    label: "Fresh testimonials will come later",
    body:
      "We will only publish GuestNix reviews after hosts have used this product and have agreed to be quoted.",
    note: "No borrowed names. No placeholder praise.",
    accent: "accent-violet",
  },
] as const;

export function TestimonialsSection() {
  return (
    <section className="landing-section is-tight-top">
      <div className="landing-container">
        <SectionHeader
          eyebrow="Early access proof"
          align="center"
          title={
            <>
              New SaaS.
              <br />
              Real product roots.
            </>
          }
          description="GuestNix is new, so we are not pretending to have SaaS testimonials yet. The product builds on a simpler guide creator and is now opening to early hosts."
        />

        <div className="testimonial-grid">
          {proofPoints.map((point, index) => {
            const Icon = point.icon;

            return (
              <article
                key={point.label}
                className={`testimonial-card ${point.accent}`}
                data-reveal
                data-delay={index + 1}
              >
                <span className="testimonial-proof-icon">
                  <Icon size={24} aria-hidden />
                </span>
                <h3>{point.label}</h3>
                <p className="testimonial-quote">{point.body}</p>
                <p className="testimonial-note">{point.note}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
