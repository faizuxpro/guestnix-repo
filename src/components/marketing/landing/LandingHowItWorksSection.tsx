import { SectionHeader } from "./SectionHeader";

const steps = [
  {
    title: "Create your property",
    body: "Add details and pick a template. 10 real content sections, pre-filled and ready to tailor.",
  },
  {
    title: "Customize your guide",
    body: "Drag-and-drop editor. WiFi, check-in steps, house rules, local tips, your logo and colors.",
  },
  {
    title: "Turn on AI Concierge",
    body: "Your guide becomes the knowledge base. The AI is trained and ready with no config needed.",
  },
  {
    title: "Share the link",
    body: "Copy your link, scan a QR code, or paste the ready-made Airbnb message. Done.",
  },
  {
    title: "Watch it work",
    body: "Track views and top sections. Get notified when guests reach out. Update anytime.",
  },
] as const;

export function LandingHowItWorksSection() {
  return (
    <section className="landing-section landing-section-sm is-tight-top" id="how">
      <div className="landing-container">
        <SectionHeader
          eyebrow="Up and running in minutes"
          align="center"
          title={
            <>
              From zero to a live guidebook
              <br />
              in 10 minutes flat.
            </>
          }
        />

        <div className="how-grid">
          {steps.map((step, index) => (
            <article key={step.title} className="how-step" data-reveal data-delay={index + 1}>
              <span>{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
