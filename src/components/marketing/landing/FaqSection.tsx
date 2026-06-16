import { SectionHeader } from "./SectionHeader";

const faqs = [
  {
    question: "Does Airbnb already replace this?",
    answer:
      "No. Airbnb covers basic arrival info. GuestNix gives you a branded stay hub with AI answers, analytics, host chat, QR sharing, and custom domains.",
  },
  {
    question: "Why not use Canva, Word, or a PDF?",
    answer:
      "Those are static files. GuestNix is a living guide: update, search, track, and let AI answer guest questions in real time.",
  },
  {
    question: "Do guests need an account?",
    answer: "No. Guests open a link and use the guide immediately; no login or download.",
  },
  {
    question: "Can I update guides after publishing?",
    answer: "Yes. The same link always points to the latest version.",
  },
  {
    question: "Can I protect sensitive info like door codes?",
    answer:
      "Absolutely. Password-protect guides and use timed access-code blocks with reveal behavior.",
  },
  {
    question: "Can I use my own domain?",
    answer:
      "Yes, GuestNix supports custom domains and subdomains for a fully branded guest experience for plans above Plus.",
  },
  {
    question: "Does the AI make things up?",
    answer:
      "No. The AI is instructed to answer only from your guidebook content, and escalates to you when needed.",
  },
] as const;

export function FaqSection() {
  return (
    <section className="landing-section is-tight-top" id="faqs">
      <div className="landing-container">
        <SectionHeader eyebrow="For Curious People" title="Frequently Asked Questions" align="center" />

        <div className="faq-list" data-reveal data-delay="2">
          {faqs.map((faq) => (
            <details key={faq.question} className="faq-item">
              <summary>
                {faq.question}
                <span aria-hidden>+</span>
              </summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
