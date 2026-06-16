import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

const trust = [
  "No credit card required",
  "Cancel anytime",
  "Full feature access during beta",
] as const;

export function FinalLandingCta() {
  return (
    <section className="landing-section is-tight-top">
      <div className="landing-container">
        <div className="final-cta" data-reveal>
          <h2>
            Your guests are waiting
            <br />
            for a <em>better experience.</em>
          </h2>
          <p>
            Set up your first GuestNix guidebook in under 10 minutes. It is
            free to start, no credit card required.
          </p>
          <div>
            <Link href="/signup" className="landing-btn landing-btn-mint">
              Create Your Free Guidebook
              <ArrowRight size={18} aria-hidden />
            </Link>
            <Link href="#demo" className="landing-btn landing-btn-dark-ghost">
              Book a Demo
            </Link>
          </div>
          <ul>
            {trust.map((item) => (
              <li key={item}>
                <Check size={14} aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
