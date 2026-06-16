import {
  BadgeCheck,
  ClipboardList,
  Home,
  KeyRound,
  Mail,
  ShoppingBag,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { SectionHeader } from "./SectionHeader";

const roadmap = [
  {
    icon: Mail,
    title: "Automated Guest Messaging",
    body: "Check-in instructions, mid-stay tips, and checkout reminders sent automatically without you hitting send once.",
    accent: "accent-blue",
  },
  {
    icon: ShoppingBag,
    title: "Upsell Store & Payments",
    body: "Offer early check-in, late checkout, or local experiences through your guidebook. Collect payment without leaving the platform.",
    accent: "accent-pink",
  },
  {
    icon: Star,
    title: "Cleaning Operations",
    body: "Coordinate your cleaning team, track turnover schedules, and know when a property is guest-ready.",
    accent: "accent-teal",
  },
  {
    icon: Home,
    title: "Direct Booking Tools",
    body: "Turn your guidebook link into a direct booking engine. Reduce OTA fees and own your guest relationship end-to-end.",
    accent: "accent-coral",
  },
  {
    icon: KeyRound,
    title: "Smart Lock Integration",
    body: "Connect your digital locks and let guests manage access without a key exchange. Arrival made frictionless.",
    accent: "accent-violet",
  },
  {
    icon: Zap,
    title: "PMS Integrations",
    body: "Sync with your Property Management System so booking details, guest data, and messaging flow into GuestNix automatically.",
    accent: "accent-amber",
  },
  {
    icon: BadgeCheck,
    title: "Guest Verification",
    body: "Collect and verify guest identity before check-in. OTA-compliant and built directly into the guest flow.",
    accent: "accent-teal",
  },
  {
    icon: ClipboardList,
    title: "Data Collection Forms",
    body: "Gather preferences, arrival times, and custom info before the stay. OTA-compliant and fully automatic.",
    accent: "accent-caramel",
  },
  {
    icon: Users,
    title: "Partner & Agency Program",
    body: "Manage multiple clients, white-label the platform, and grow your business on top of GuestNix. Applications opening soon.",
    accent: "accent-blue",
  },
] as const;

export function RoadmapSection() {
  return (
    <section className="landing-section is-tight-top" id="roadmap">
      <div className="landing-container">
        <SectionHeader
          eyebrow="What is coming to GuestNix"
          title="We are just getting started."
          description="These features are in active development. Join now and get first access when they launch."
        />

        <div className="roadmap-grid">
          {roadmap.map((item, index) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className={`roadmap-card ${item.accent}`}
                data-reveal
                data-delay={(index % 3) + 1}
              >
                <span className="coming-soon">Coming Soon</span>
                <Icon size={27} aria-hidden />
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
