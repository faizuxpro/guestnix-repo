import { Check } from "lucide-react";

const perks = [
  "Answers guest questions 24/7 using your guidebook as its knowledge base",
  "Email alerts whenever a guest reaches out, whether resolved by AI or needing your attention",
  "Builds your contact list automatically with every guest interaction",
  "Full conversation history in your host inbox so you never miss anything",
] as const;

export function AiConciergeSection() {
  return (
    <section className="landing-section is-tight-top">
      <div className="landing-container">
        <div className="concierge-panel" data-reveal>
          <div>
            <p className="landing-label is-dark">AI Concierge</p>
            <h2 className="landing-h2 is-dark">
              Your most patient,
              <br />
              most available
              <br />
              team member.
            </h2>
            <p className="concierge-copy">
              The GuestNix AI Concierge is always on, answering guest questions
              at 3am, in multiple languages, trained on your exact guidebook.
              Every conversation is visible in your host inbox.
            </p>
            <div className="concierge-perks">
              {perks.map((perk) => (
                <div key={perk}>
                  <span aria-hidden>
                    <Check size={13} />
                  </span>
                  {perk}
                </div>
              ))}
            </div>
          </div>

          <div className="concierge-intro" data-reveal data-delay="2">
            <div className="concierge-video-shell">
              <video
                className="concierge-video"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                aria-hidden="true"
              >
                <source src="/marketing/chatmeetme.webm" type="video/webm" />
              </video>
              <div className="concierge-hello-card" aria-hidden>
                <span>Hi, I am GuestNix</span>
                <strong>Ready whenever guests are.</strong>
              </div>
              <div className="concierge-status-card" aria-hidden>
                <i />
                Live in your guidebook
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
