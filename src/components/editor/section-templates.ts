import { DEFAULT_ICONS } from "@/lib/icons/defaults";

export type SectionTemplateBlock = {
  type: string;
  content: Record<string, unknown>;
};

export type SectionTemplate = {
  id: string;
  name: string;
  description: string;
  title: string;
  icon: string;
  blocks: SectionTemplateBlock[];
};

export const BLANK_SECTION_TEMPLATE: SectionTemplate = {
  id: "blank",
  name: "Blank Section",
  description: "Start empty and build with smaller blocks.",
  title: "New Section",
  icon: DEFAULT_ICONS.SECTION_DEFAULT,
  blocks: [],
};

export const SECTION_TEMPLATES: SectionTemplate[] = [
  BLANK_SECTION_TEMPLATE,
  {
    id: "welcome-intro",
    name: "Welcome Intro",
    description: "A friendly intro section with concise overview copy.",
    title: "Welcome",
    icon: DEFAULT_ICONS.SECTION_DEFAULT,
    blocks: [
      {
        type: "heading",
        content: {
          text: "Welcome {{guest_name}}",
          level: 2,
          alignment: "left",
        },
      },
      {
        type: "text",
        content: {
          html:
            "<p>We are excited to host you. This section is a great place to share the stay vibe, quick context, and what guests should do first.</p><p>{{temporary_notice}}</p>",
        },
      },
      {
        type: "text",
        content: {
          html:
            "<ul><li>How to use this guide</li><li>Property highlights</li><li>Best first stop after arrival</li></ul>",
        },
      },
    ],
  },
  {
    id: "arrival-access",
    name: "Arrival & Access",
    description: "Pre-written arrival instructions built from generic blocks.",
    title: "Arrival",
    icon: DEFAULT_ICONS.SECTION_DEFAULT,
    blocks: [
      {
        type: "heading",
        content: {
          text: "Arrival & Access",
          level: 2,
          alignment: "left",
        },
      },
      {
        type: "text",
        content: {
          html:
            "<p><strong>Check-in:</strong> {{checkin_time}}<br/><strong>Check-out:</strong> {{checkout_time}}</p><p><strong>Door code:</strong> {{door_code}}<br/><strong>Parking:</strong> {{parking_note}}</p>",
        },
      },
      {
        type: "text",
        content: {
          html:
            "<ul><li>{{early_checkin_note}}</li><li>{{late_checkout_note}}</li><li>{{temporary_notice}}</li></ul>",
        },
      },
    ],
  },
  {
    id: "wifi-info",
    name: "Wi-Fi Details",
    description: "Wi-Fi content scaffold using simple text blocks.",
    title: "Wi-Fi",
    icon: DEFAULT_ICONS.SECTION_DEFAULT,
    blocks: [
      {
        type: "heading",
        content: {
          text: "Wi-Fi Access",
          level: 2,
          alignment: "left",
        },
      },
      {
        type: "text",
        content: {
          html:
            "<p><strong>Network:</strong> {{wifi_network_name}}<br/><strong>Password:</strong> {{wifi_password}}</p><p>{{wifi_note}}</p>",
        },
      },
    ],
  },
  {
    id: "house-rules",
    name: "House Rules",
    description: "A quick rules section with heading + checklist copy.",
    title: "House Rules",
    icon: DEFAULT_ICONS.SECTION_DEFAULT,
    blocks: [
      {
        type: "heading",
        content: {
          text: "House Rules",
          level: 2,
          alignment: "left",
        },
      },
      {
        type: "text",
        content: {
          html:
            "<ul><li>Quiet hours: 10 PM - 8 AM</li><li>No smoking indoors</li><li>No unregistered guests</li><li>Follow checkout checklist before leaving</li></ul>",
        },
      },
    ],
  },
  {
    id: "amenities-overview",
    name: "Amenities",
    description: "Showcase what is included using generic content blocks.",
    title: "Amenities",
    icon: DEFAULT_ICONS.SECTION_DEFAULT,
    blocks: [
      {
        type: "heading",
        content: {
          text: "Amenities",
          level: 2,
          alignment: "left",
        },
      },
      {
        type: "text",
        content: {
          html:
            "<ul><li>High-speed internet</li><li>Kitchen essentials</li><li>Washer and dryer</li><li>Workspace setup</li></ul>",
        },
      },
    ],
  },
  {
    id: "help-and-safety",
    name: "Help & Safety",
    description: "Contact and emergency guidance composed from atomic blocks.",
    title: "Help & Safety",
    icon: DEFAULT_ICONS.SECTION_DEFAULT,
    blocks: [
      {
        type: "heading",
        content: {
          text: "Need Help?",
          level: 2,
          alignment: "left",
        },
      },
      {
        type: "text",
        content: {
          html:
            "<p><strong>On-call phone:</strong> {{on_call_phone}}</p><p>Add preferred channels and expected response times.</p>",
        },
      },
      {
        type: "divider",
        content: {
          style: "line",
          spacing: "medium",
        },
      },
      {
        type: "heading",
        content: {
          text: "Emergency",
          level: 3,
          alignment: "left",
        },
      },
      {
        type: "text",
        content: {
          html:
            "<p><strong>Emergency services:</strong> 911</p><p>Include nearest hospital, pharmacy, and urgent support notes.</p>",
        },
      },
    ],
  },
  {
    id: "local-recommendations",
    name: "Local Places",
    description: "Curated local recommendations using reusable content blocks.",
    title: "Local Places",
    icon: DEFAULT_ICONS.SECTION_DEFAULT,
    blocks: [
      {
        type: "heading",
        content: {
          text: "Local Recommendations",
          level: 2,
          alignment: "left",
        },
      },
      {
        type: "text",
        content: {
          html:
            "<p>Share your top nearby spots by category so guests can decide quickly.</p><ul><li>Best coffee</li><li>Top breakfast</li><li>Closest grocery</li><li>Favorite sunset viewpoint</li></ul>",
        },
      },
    ],
  },
  {
    id: "guest-faq",
    name: "FAQ",
    description: "An FAQ section starter with common guest questions.",
    title: "FAQ",
    icon: DEFAULT_ICONS.SECTION_DEFAULT,
    blocks: [
      {
        type: "heading",
        content: {
          text: "Frequently Asked Questions",
          level: 2,
          alignment: "left",
        },
      },
      {
        type: "faq",
        content: {
          style: "basic",
          config: {
            accent_role: "secondary",
          },
          items: [
            {
              question: "Can I check in early?",
              answer:
                "Early check-in depends on same-day turnover. Message us in advance and we will confirm.",
            },
            {
              question: "What is the fastest way to reach support?",
              answer:
                "Use the primary contact in the Help section for urgent issues.",
            },
          ],
        },
      },
    ],
  },
];
