import { X } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

const audiences = [
  {
    number: "01",
    label: "Airbnb & Short-Let Hosts",
    title: "1 property or 50 - GuestNix scales with you.",
    body: "Whether it is your first listing or a growing portfolio, every property gets the same polished experience with zero extra effort from you.",
    accent: "accent-blue",
  },
  {
    number: "02",
    label: "Self-Managing Hosts",
    title: "Done answering the same five questions every weekend?",
    body: "One link puts guests in control of their own check-in. The AI handles the rest, even at 3am and in another language.",
    accent: "accent-violet",
  },
  {
    number: "03",
    label: "Professional Operators",
    title: "Your properties are polished. Your guest experience should match.",
    body: "GuestNix gives every stay a 5-star first impression, from a boutique suite to a mountain cabin.",
    accent: "accent-coral",
  },
  {
    number: "04",
    label: "Co-Hosts & Managers",
    title: "Manage for others. Stay consistent, stay professional.",
    body: "Keep every property in your portfolio on-brand and on-point without rebuilding the wheel each time.",
    accent: "accent-caramel",
  },
] as const;

const notFor = [
  "Only do long-term lets",
  "Prefer paper binders",
  "Enjoy answering the WiFi question at midnight",
] as const;

export function AudienceSection() {
  return (
    <section className="landing-section is-tight-top">
      <div className="landing-container">
        <SectionHeader
          eyebrow="Who it is for"
          title={
            <>
              Built for hosts who care about
              <br />
              the experience and their own time.
            </>
          }
        />

        <div className="audience-grid">
          {audiences.map((audience, index) => (
            <article
              key={audience.label}
              className={`audience-card ${audience.accent}`}
              data-reveal
              data-delay={index + 1}
            >
              <span className="audience-number">{audience.number}</span>
              <p className="audience-tag">{audience.label}</p>
              <h3>{audience.title}</h3>
              <p>{audience.body}</p>
            </article>
          ))}
        </div>

        <div className="not-for-panel" data-reveal data-delay="2">
          <p>Not the right fit if you:</p>
          <div>
            {notFor.map((item) => (
              <span key={item}>
                <X size={13} aria-hidden />
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
