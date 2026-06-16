import Image from "next/image";
import {
  ArrowRight,
  Bot,
  Check,
  Clock3,
  FileText,
  Link2,
  MessageCircleQuestion,
  MessageSquareText,
  RefreshCw,
  Search,
  Smartphone,
  X,
} from "lucide-react";
import { SectionHeader } from "./SectionHeader";

const oldWay = [
  "Long check-in messages copy-pasted into every booking",
  "PDFs and screenshots that guests lose or ignore",
  "The same WiFi question at 11pm. Again.",
  "Paper binders that walk out the door with guests",
  "WhatsApp threads that spiral into a support queue",
  "Reprint everything just to fix one typo",
] as const;

const newWay = [
  "One polished link with everything, always up to date",
  "A mobile-friendly guidebook guests actually open",
  "AI concierge answers questions before you see them",
  "Digital, searchable, and impossible to misplace",
  "Guests self-serve while you stay out of the thread",
  "Edit once, published everywhere, instantly",
] as const;

const comparisonRows = [
  {
    old: oldWay[0],
    next: newWay[0],
    oldIcon: MessageSquareText,
    nextIcon: Link2,
    accent: "accent-teal",
  },
  {
    old: oldWay[1],
    next: newWay[1],
    oldIcon: FileText,
    nextIcon: Smartphone,
    accent: "accent-violet",
  },
  {
    old: oldWay[2],
    next: newWay[2],
    oldIcon: Clock3,
    nextIcon: Bot,
    accent: "accent-amber",
  },
  {
    old: oldWay[3],
    next: newWay[3],
    oldIcon: Search,
    nextIcon: Search,
    accent: "accent-blue",
  },
  {
    old: oldWay[4],
    next: newWay[4],
    oldIcon: MessageCircleQuestion,
    nextIcon: Check,
    accent: "accent-coral",
  },
  {
    old: oldWay[5],
    next: newWay[5],
    oldIcon: RefreshCw,
    nextIcon: RefreshCw,
    accent: "accent-pink",
  },
] as const;

export function BeforeAfterSection() {
  return (
    <section className="landing-section before-after-section" id="before-after">
      <div className="landing-container">
        <SectionHeader
          eyebrow="The old way vs. the GuestNix way"
          title={
            <>
              Every stay starts with the same chaos.  Until now.
              <br />
            </>
          }
        />

        <div className="before-after-panel" data-reveal data-delay="1">
          <div className="compare-stage" aria-hidden>
            <div className="chaos-card card-one">
              <span>11:07 pm</span>
              <strong>What is the WiFi?</strong>
            </div>
            <div className="chaos-card card-two">
              <span>PDF_v9_final_final.pdf</span>
              <strong>Outdated checkout notes</strong>
            </div>
            <div className="chaos-card card-three">
              <span>Host thread</span>
              <strong>Can you resend the code?</strong>
            </div>

            <div className="compare-bridge">
              <span>
                <ArrowRight size={18} />
              </span>
            </div>

            <div className="command-center-preview">
              <span className="command-center-halo halo-one" aria-hidden />
              <span className="command-center-halo halo-two" aria-hidden />
              <span className="command-center-halo halo-three" aria-hidden />
              <Image
                className="command-center-image"
                src="/marketing/g-command-center.png"
                alt=""
                width={2528}
                height={1686}
              />
            </div>
          </div>

          <div className="compare-story">
            <div className="compare-headline-row">
              <div className="compare-label muted">
                <span>The Old Way</span>
                <strong>Scattered and repetitive</strong>
              </div>
              <div className="compare-divider" aria-hidden>
                <span>vs</span>
                <i />
              </div>
              <div className="compare-label bright">
                <span>The GuestNix Way</span>
                <strong>Calm, live, self-serve</strong>
              </div>
            </div>

            <div className="compare-flow-list">
              {comparisonRows.map((row, index) => {
                const OldIcon = row.oldIcon;
                const NextIcon = row.nextIcon;

                return (
                  <article
                    key={row.old}
                    className={`compare-flow-card ${row.accent}`}
                    data-reveal
                    data-delay={(index % 3) + 2}
                  >
                    <div className="compare-flow-side is-old">
                      <span className="compare-flow-icon" aria-hidden>
                        <OldIcon size={17} />
                        <X size={11} />
                      </span>
                      <p>{row.old}</p>
                    </div>
                    <span className="compare-flow-arrow" aria-hidden>
                      <ArrowRight size={16} />
                    </span>
                    <div className="compare-flow-side is-new">
                      <span className="compare-flow-icon" aria-hidden>
                        <NextIcon size={17} />
                        <Check size={11} />
                      </span>
                      <p>{row.next}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
