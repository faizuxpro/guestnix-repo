import { Leaf } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

const impacts = [
  {
    number: "01",
    title: "Get your time back",
    body: "Every question your guidebook answers is a message you never have to write. Every conversation the AI handles is a midnight ping that never reaches you. Spend those hours on the hospitality that actually earns reviews.",
    accent: "accent-teal",
  },
  {
    number: "02",
    title: "Make every guest feel taken care of",
    body: "Guests who arrive with clear instructions and an AI that answers their questions feel looked after from the moment they book. That feeling shows up in your reviews, repeat bookings, and referrals.",
    accent: "accent-violet",
  },
  {
    number: "03",
    title: "Run a professional operation at any scale",
    body: "Whether you manage one property or fifty, GuestNix gives every stay the same polished, consistent experience. No details fall through the cracks. No guest ever feels like an afterthought.",
    accent: "accent-amber",
  },
] as const;

export function ImpactSection() {
  return (
    <section className="landing-section">
      <div className="landing-container">
        <SectionHeader
          eyebrow="The real impact"
          align="center"
          title={
            <>
              Less friction. Happier guests.
              <br />
              Fewer interruptions. Better reviews.
            </>
          }
        />

        <div className="impact-grid">
          {impacts.map((impact, index) => (
            <article
              key={impact.title}
              className={`impact-card ${impact.accent}`}
              data-reveal
              data-delay={index + 1}
            >
              <span>{impact.number}</span>
              <h3>{impact.title}</h3>
              <p>{impact.body}</p>
            </article>
          ))}
        </div>

        <div className="eco-panel" data-reveal data-delay="1">
          <span aria-hidden>
            <Leaf size={30} />
          </span>
          <div>
            <h3>Paper binders are over.</h3>
            <p>
              GuestNix is 100% digital: no printing costs, no paper waste, and
              no outdated handouts walking out the door. Update anything
              instantly, for free, from anywhere in the world.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
