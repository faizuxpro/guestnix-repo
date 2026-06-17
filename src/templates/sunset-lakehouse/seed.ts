import { BOTTOM_NAV_DEFAULTS, type BottomNavSlot } from "@/types/bottom-nav";
import {
  SECTION_COVER_DESIGN_SETTINGS_KEY,
  SECTION_COVER_SETTINGS_KEY,
  type SectionCoverContentSettings,
  type SectionCoverDesignSettings,
} from "@/lib/section-cover";
import type {
  ContainerContent,
  EmergencyContactsContent,
  FaqContent,
  HeadingContent,
  IconGridContent,
  TextContent,
  TileSetContent,
  WifiContent,
} from "@/types/blocks";

export type SeedBlock = {
  type: string;
  content: Record<string, unknown>;
};

export type SeedSection = {
  title: string;
  icon: string;
  kind?: "guide" | "featured";
  displayMode?: "popup" | "full_page" | "inline" | "drawer";
  itemSettings?: Record<string, unknown>;
  blocks: SeedBlock[];
};

export type SeedGuidebook = {
  branding: {
    logo_url: string | null;
    primary_color: string;
    secondary_color: string;
    font_family: string;
    show_guestnix_branding: boolean;
  };
  settings?: Record<string, unknown>;
  bottomNav: BottomNavSlot[];
  sections: SeedSection[];
};

const IMAGE_BASE =
  "https://raw.githubusercontent.com/faizux/rental_clickcrafts/refs/heads/main";

function oldImage(fileName: string) {
  return `${IMAGE_BASE}/${fileName}`;
}

function asBlockContent<T>(content: T): Record<string, unknown> {
  return content as unknown as Record<string, unknown>;
}

function block<T>(type: string, content: T): SeedBlock {
  return { type, content: asBlockContent(content) };
}

function cover(
  titleText: string,
  imageName: string,
  x = 50,
  y = 50
): Record<string, unknown> {
  const content: SectionCoverContentSettings = {
    title_text: titleText,
    image_url: oldImage(imageName),
    image_position: { x, y },
  };

  return {
    [SECTION_COVER_SETTINGS_KEY]: content,
  };
}

function heading(
  text: string,
  options: {
    eyebrow?: string;
    subtitle?: string;
    style?: HeadingContent["advanced_style"];
    align?: HeadingContent["alignment"];
    decorPosition?: HeadingContent["decor_position"];
    decorWidth?: HeadingContent["decor_width"];
    accentRole?: HeadingContent["accent_role"];
  } = {}
): HeadingContent {
  return {
    text,
    level: 2,
    alignment: options.align ?? "left",
    eyebrow: options.eyebrow ?? "",
    subtitle: options.subtitle ?? "",
    eyebrow_enabled: Boolean(options.eyebrow),
    subtitle_enabled: Boolean(options.subtitle),
    tone: "default",
    show_divider: false,
    advanced_enabled: true,
    advanced_style: options.style ?? "sidebar",
    accent_role: options.accentRole ?? "secondary",
    decor_position: options.decorPosition ?? "left",
    decor_width: options.decorWidth ?? "fit",
    decor_weight: "normal",
    decor_offset: "normal",
    decor_motion: true,
    decor_angle: -2,
    marker_variant: "highlight",
    marker_height: "medium",
    orbit_shape: "spark",
    orbit_count: 2,
    orbit_taper: true,
    taper_mode: "left",
    node_shape: "diamond",
    crosshair_corners: "two",
    crosshair_direction: "tl-br",
    sidebar_variant: "fade",
    sidebar_height: "text",
    sidebar_width: "medium",
  };
}

const sectionCoverDesign: SectionCoverDesignSettings = {
  enabled: true,
  height: "medium",
  overlay_opacity: 0.18,
  title_enabled: true,
  title_position: "center",
  title_align: "center",
  title_style: "glass",
  title_bg_color: "#f2f4f4",
  title_color: "#002927",
  title_font_size: 30,
  title_bg_width: 78,
  title_box_width: 92,
  title_radius: 12,
  title_corner_style: "rounded",
  title_shadow: {
    enabled: true,
    color: "#0F172A",
    opacity: 0.38,
    blur: 20,
    offset_x: 0,
    offset_y: 10,
  },
};

const welcomeIntro: TextContent = {
  html:
    "<p>Welcome to Sunset Lake House, a calm retreat made for slow mornings, " +
    "easy meals, and long evenings by the water. Drop your bags, open the windows, " +
    "and let the house do what it does best: make the first hour of vacation feel simple.</p>",
};

const welcomeFacts: TextContent = {
  variant: "facts",
  label: "Stay Snapshot",
  facts_style: "boarding_pass",
  facts_config: {
    icon_size: 1,
    accent_role: "secondary",
  },
  facts: [
    {
      label: "Arrive",
      value: "4:00 PM",
      note: "Self check-in with a smart lock code sent before arrival.",
      icon: "ph:keyhole-fill",
      badge: "CHECK-IN",
    },
    {
      label: "Unwind",
      value: "Lake days",
      note: "Comfortable indoor spaces, outdoor seating, and room to slow down.",
      icon: "ph:sun-horizon-fill",
      badge: "RETREAT",
    },
    {
      label: "Rest",
      value: "5 guests",
      note: "A sample setup for couples, families, or a small friends weekend.",
      icon: "ph:bed-fill",
      badge: "CAPACITY",
    },
  ],
};

const hostProfile: TextContent = {
  html:
    "<p>Hi, I am Jane Doe. I created this guide so you can spend less time " +
    "searching for answers and more time enjoying the house. Hosting, for me, is " +
    "about small details: a clear arrival, a stocked coffee shelf, towels where you " +
    "expect them, and a quick answer when you need one.</p>" +
    "<p>I love sharing this place because it has a way of making people pause. " +
    "Whether you are here to read, cook, reconnect, work quietly, or just look at " +
    "the water for a while, I hope it feels easy to settle in.</p>",
};

const hostFacts: TextContent = {
  variant: "facts",
  facts_style: "split_ticket",
  facts_config: {
    icon_size: 1,
    accent_role: "secondary",
  },
  facts: [
    {
      label: "Host",
      value: "Jane Doe",
      note: "Sample host profile for the Sunset Lakehouse template.",
      icon: "ph:user-circle-fill",
      badge: "HOST",
    },
    {
      label: "Languages",
      value: "English, Spanish",
      note: "Use the editor to replace these with your real languages.",
      icon: "ph:translate-fill",
      badge: "LANG",
    },
    {
      label: "Response",
      value: "Fast replies",
      note: "Booking app messages are the preferred channel.",
      icon: "ph:chat-circle-text-fill",
      badge: "SUPPORT",
    },
  ],
};

const hostContacts: TextContent = {
  variant: "contacts",
  contacts_style: "ticket_cards",
  contacts_config: {
    icon_size: 1,
    accent_role: "secondary",
  },
  contacts: [
    {
      icon: "ph:chat-circle-text-fill",
      label: "Fastest reply",
      value: "Message through your booking app",
      href: "",
    },
    {
      icon: "ph:phone-fill",
      label: "Urgent host line",
      value: "+1 (555) 010-2400",
      href: "tel:+15550102400",
    },
    {
      icon: "ph:envelope-simple-fill",
      label: "Email",
      value: "hello@sunsetlakehouse.example",
      href: "mailto:hello@sunsetlakehouse.example",
    },
  ],
};

const arrivalContainer: ContainerContent = {
  title: "Arrival and departure",
  subtitle: "Key access, parking, timing, and checkout steps in one place.",
  icon: "ph:squares-four-fill",
  style: "section_card",
  config: {
    accent_role: "secondary",
    layout: "stacked",
    width: "full",
    padding: "medium",
    radius: "medium",
    child_spacing: "normal",
    child_surface: "blend",
    inherit_accent: true,
    inherit_typography: false,
    show_header: true,
    animation: "style_default",
  },
  children: [
    {
      id: "seed-arrival-times",
      type: "text",
      orderIndex: 0,
      isVisible: true,
      content: {
        variant: "facts",
        facts_style: "boarding_pass",
        facts_config: {
          icon_size: 1,
          accent_role: "secondary",
        },
        facts: [
          {
            label: "Check-in",
            value: "16:00",
            note: "Early check-in may be possible when the calendar allows.",
            icon: "ph:sign-in-fill",
          },
          {
            label: "Check-out",
            value: "11:00",
            note: "Message the host once you have locked up.",
            icon: "ph:sign-out-fill",
          },
        ],
      },
    },
    {
      id: "seed-arrival-access",
      type: "smart_lock",
      orderIndex: 1,
      isVisible: true,
      content: {
        title: "Door code",
        subtitle: "Your unique code activates at check-in time.",
        code: "",
        reveal_at: null,
        instructions:
          "Use the smart lock on the front door. Your unique code is sent before arrival.",
        icon: "ph:lock-key-fill",
        style: "secure_card",
        config: {
          accent_role: "primary",
          layout: "stacked",
          code_display: "large_code",
          show_copy: true,
          animation: "style_default",
        },
        items: [
          {
            type: "door",
            label: "Front door",
            code: "",
            reveal_at: null,
            instructions:
              "Use the smart lock on the front door. Your code activates at check-in time.",
            icon: "ph:door-open-fill",
          },
        ],
      },
    },
    {
      id: "seed-arrival-parking",
      type: "text",
      orderIndex: 2,
      isVisible: true,
      content: {
        variant: "callout",
        html:
          "<p>Park in the driveway only. The sample house allows up to 3 vehicles and keeps the road clear for neighbors.</p><p>Late arrivals are fine. Keep exterior lights on while unloading, then switch them off for quiet hours.</p>",
        callout: {
          eyebrow: "Parking and late arrivals",
          icon: "ph:car-fill",
          title: "Driveway parking only",
          subtitle: "",
          cta_enabled: false,
          card_style: "icon_box",
          body_enabled: true,
          icon_size: 1,
          mobile_stack: true,
          accent_role: "secondary",
          style_customized: true,
        },
      },
    },
    {
      id: "seed-arrival-checkout",
      type: "text",
      orderIndex: 3,
      isVisible: true,
      content: {
        variant: "checklist",
        label: "Before checkout",
        checklist: {
          style: "soft_icon_bullets",
          icon: "ph:check-circle-fill",
          icon_size: 1,
          label_enabled: true,
          heading_enabled: false,
          heading: "",
          accent_role: "secondary",
          number_font: "playfair",
        },
        checklist_items: [
          { icon: "ph:check-circle-fill", text: "Load and start the dishwasher.", note: "" },
          { icon: "ph:check-circle-fill", text: "Place used towels in the bathroom hamper.", note: "" },
          { icon: "ph:check-circle-fill", text: "Bag trash and recycling and place them in the outdoor bins.", note: "" },
          { icon: "ph:check-circle-fill", text: "Turn off lights, small appliances, and the fireplace.", note: "" },
          { icon: "ph:check-circle-fill", text: "Lock all doors and send a quick checkout message.", note: "" },
        ],
      },
    },
  ],
};

const checkinCallout: TextContent = {
  variant: "callout",
  label: "Arrival note",
  html:
    "<p>Outdoor cameras face the driveway and entry approach only. There are no interior cameras.</p>",
  callout: {
    eyebrow: "Before you arrive",
    icon: "ph:key-fill",
    title: "Your code arrives before check-in",
    subtitle:
      "Save the arrival message before you travel so the door code, parking notes, and host contact are handy.",
    cta_enabled: false,
    card_style: "icon_box",
    body_enabled: true,
    icon_size: 1,
    mobile_stack: true,
    accent_role: "secondary",
    style_customized: true,
  },
};

const amenitiesGrid: IconGridContent = {
  style: "gradient_overlap",
  config: {
    accent_role: "secondary",
    animation: "float",
  },
  items: [
    {
      icon: "ph:bed-fill",
      title: "Comfortable sleeping",
      description: "Fresh linens, extra blankets, and easy-to-find pillows.",
    },
    {
      icon: "ph:fork-knife-fill",
      title: "Full kitchen",
      description: "Cookware, dishes, coffee gear, spices, oil, and prep basics.",
    },
    {
      icon: "ph:briefcase-fill",
      title: "Work-ready corner",
      description: "A quiet surface, good lighting, and reliable Wi-Fi.",
    },
    {
      icon: "ph:washing-machine-fill",
      title: "Laundry on site",
      description: "Washer, dryer, starter detergent, iron, and hangers.",
    },
    {
      icon: "ph:television-simple-fill",
      title: "Easy entertainment",
      description: "Smart TV for guest logins, board games, and cozy seating.",
    },
    {
      icon: "ph:campfire-fill",
      title: "Outdoor reset",
      description: "Deck seating, fire pit area, and room for sunset conversations.",
    },
  ],
};

const amenitiesTiles: TileSetContent = {
  title: "Quick amenity scan",
  style: "ticket",
  config: {
    icon_size: 1,
    accent_role: "secondary",
  },
  tiles: [
    { icon: "ph:wifi-high-fill", label: "High-speed Wi-Fi" },
    { icon: "ph:car-fill", label: "Parking for 3 vehicles" },
    { icon: "ph:coffee-fill", label: "Coffee and tea bar" },
    { icon: "ph:wind-fill", label: "Central AC and heat" },
    { icon: "ph:drop-fill", label: "Plush towels" },
    { icon: "ph:tree-evergreen-fill", label: "Outdoor seating" },
    { icon: "ph:monitor-play-fill", label: "Streaming-ready TV" },
    { icon: "ph:first-aid-kit-fill", label: "First aid kit" },
  ],
};

const wifiDefault: WifiContent = {
  network_name: "SunsetLakehouse_Guest",
  password: "LakeSunset2026!",
  show_qr: true,
  notes:
    "The strongest signal is in the living room, kitchen, and workspace. The router is in the office closet.",
};

const wifiCallout: TextContent = {
  variant: "callout",
  html:
    "<p>Smart speakers, streaming apps, and the thermostat all use the guest network. Please leave router cables connected.</p>",
  callout: {
    eyebrow: "Connected stay",
    icon: "ph:wifi-high-fill",
    title: "Wi-Fi, streaming, and smart home notes",
    subtitle:
      "If a device drops offline, restart the router by unplugging it for 30 seconds and give it two minutes to reconnect.",
    cta_enabled: false,
    card_style: "minimalist_inline",
    body_enabled: true,
    icon_size: 1,
    mobile_stack: true,
    accent_role: "secondary",
    style_customized: true,
  },
};

const wifiFaq: FaqContent = {
  style: "left_icon_grid",
  config: {
    accent_role: "secondary",
  },
  items: [
    {
      question: "What should I try first if the Wi-Fi stops working?",
      answer:
        "Unplug the router in the office closet for 30 seconds, plug it back in, and wait two minutes. Message the host if it does not reconnect.",
    },
    {
      question: "Can I sign in to my streaming accounts?",
      answer:
        "Yes. Please remember to sign out before checkout so the next guest starts fresh.",
    },
    {
      question: "Is there a backup work spot?",
      answer:
        "The dining table has the best combination of daylight, outlet access, and Wi-Fi strength.",
    },
  ],
};

const rulesChecklist: TextContent = {
  variant: "checklist",
  label: "House Rules",
  checklist: {
    style: "node_timeline",
    icon: "ph:check-circle-fill",
    icon_size: 1,
    label_enabled: false,
    heading_enabled: true,
    heading: "A peaceful stay for everyone",
    accent_role: "secondary",
    number_font: "theme",
  },
  checklist_items: [
    {
      text: "Maximum 5 guests",
      note: "Only registered guests may stay overnight.",
    },
    {
      text: "Up to 3 vehicles",
      note: "Use the driveway and keep the road clear.",
    },
    {
      text: "Quiet hours are 10 PM to 7 AM",
      note: "Sound carries near the water, especially at night.",
    },
    {
      text: "No smoking indoors",
      note: "Use outdoor areas only and dispose of ash safely.",
    },
    {
      text: "Food stays in kitchen and dining areas",
      note: "This helps protect rugs, upholstery, and bedding.",
    },
    {
      text: "No parties or events unless approved",
      note: "Small celebrations must be cleared with the host first.",
    },
    {
      text: "Use fire features carefully",
      note: "Never leave flames unattended and follow local fire guidance.",
    },
  ],
};

const kitchenStack: TextContent = {
  variant: "stack",
  label: "Kitchen & Dining",
  items: [
    {
      icon: "ph:cooking-pot-fill",
      title: "Cooking basics",
      description:
        "Pots, pans, utensils, cutting boards, mixing bowls, oil, salt, pepper, and a starter spice shelf.",
    },
    {
      icon: "ph:coffee-fill",
      title: "Morning setup",
      description:
        "Coffee, tea, filters, mugs, kettle, and a simple welcome treat are set out for your first morning.",
    },
    {
      icon: "ph:wine-fill",
      title: "Dining area",
      description:
        "The table is ready for slow breakfasts, game nights, and relaxed dinners after a lake day.",
    },
    {
      icon: "ph:sparkle-fill",
      title: "Before checkout",
      description:
        "Load the dishwasher, wipe the counters, and return used kitchen items so the next guest arrives to a calm space.",
    },
  ],
};

const kitchenCallout: TextContent = {
  variant: "callout",
  callout: {
    eyebrow: "Little treat",
    icon: "ph:gift-fill",
    title: "Start with what is already here",
    subtitle:
      "Coffee, tea, cooking oil, basic spices, and a small welcome snack are sample details hosts can replace in the editor.",
    cta_enabled: false,
    card_style: "serif_shift",
    body_enabled: false,
    icon_size: 1,
    mobile_stack: true,
    accent_role: "secondary",
    style_customized: true,
  },
};

const emergencyContactsDefault: EmergencyContactsContent = {
  country: "US",
  custom_contacts: [
    {
      icon: "ph:phone-call-fill",
      label: "Host urgent line",
      phone: "+1 (555) 010-2400",
    },
    {
      icon: "ph:hospital-fill",
      label: "Nearest hospital",
      phone: "+1 (555) 010-7711",
    },
    {
      icon: "ph:wrench-fill",
      label: "Maintenance backup",
      phone: "+1 (555) 010-8844",
    },
  ],
};

const emergencyAlert: TextContent = {
  variant: "alert",
  alert_style: "side_rail",
  alert_config: {
    icon_size: 1,
    accent_role: "secondary",
  },
  alert: {
    label: "Emergency services",
    value: "Call 911 first",
    icon: "ph:siren-fill",
    href: "tel:911",
  },
};

const emergencyChecklist: TextContent = {
  variant: "checklist",
  checklist: {
    style: "bookmark_ribbon",
    icon: "ph:first-aid-kit-fill",
    icon_size: 1,
    label_enabled: false,
    heading_enabled: true,
    heading: "What to do next",
    accent_role: "secondary",
    number_font: "theme",
  },
  checklist_items: [
    {
      text: "Fire, smoke, or gas smell",
      note: "Leave the house immediately, call 911, then message the host.",
    },
    {
      text: "Power outage",
      note: "Use flashlights from the hall closet and avoid candles.",
    },
    {
      text: "Water leak",
      note: "Turn off adjacent fixtures if safe and contact the host urgently.",
    },
    {
      text: "First aid",
      note: "The first aid kit and fire extinguisher are in the kitchen pantry area.",
    },
  ],
};

const petPolicy: TextContent = {
  variant: "checklist",
  label: "Pet Policy",
  checklist: {
    style: "soft_icon_bullets",
    icon: "ph:paw-print-fill",
    icon_size: 1,
    label_enabled: false,
    heading_enabled: true,
    heading: "For four-legged guests",
    accent_role: "secondary",
    number_font: "theme",
  },
  checklist_items: [
    {
      text: "Pet-friendly with a sample $75 fee",
      note: "Replace this fee with your real policy in the editor.",
    },
    {
      text: "Clean up outside",
      note: "Bag waste and place it in the outdoor trash bin.",
    },
    {
      text: "Protect furniture and bedding",
      note: "Use the provided throw blanket or keep pets on the floor.",
    },
    {
      text: "Leash near neighbors and the water",
      note: "This keeps everyone comfortable and safe.",
    },
    {
      text: "Report accidents quickly",
      note: "Fast cleanup prevents permanent stains or odors.",
    },
  ],
};

const sustainabilityStack: TextContent = {
  variant: "stack",
  items: [
    {
      icon: "ph:recycle-fill",
      title: "Sort the simple stuff",
      description:
        "Recycling goes in the marked bin. Trash goes in black bags before heading outside.",
    },
    {
      icon: "ph:leaf-fill",
      title: "Use what is reusable",
      description:
        "Refillable soap, cloth towels, and reusable containers help reduce single-use waste.",
    },
    {
      icon: "ph:lightbulb-filament-fill",
      title: "Save energy gently",
      description:
        "Turn off lights, fans, and small appliances when you head out.",
    },
    {
      icon: "ph:drop-half-bottom-fill",
      title: "Respect water and wildlife",
      description:
        "Keep soaps, food scraps, and trash away from the lake and outdoor areas.",
    },
  ],
};

const sustainabilityFacts: TextContent = {
  variant: "facts",
  facts_style: "origami_fold",
  facts_config: {
    icon_size: 1,
    accent_role: "secondary",
  },
  facts: [
    {
      label: "Kitchen",
      value: "Low waste",
      note: "Reusable basics, refillable supplies, and simple sorting.",
      icon: "ph:leaf-fill",
      badge: "ECO",
    },
    {
      label: "Outdoors",
      value: "Wildlife aware",
      note: "Leave plants, water, and visiting birds undisturbed.",
      icon: "ph:tree-evergreen-fill",
      badge: "CARE",
    },
  ],
};

const contactCallout: TextContent = {
  variant: "callout",
  html:
    "<p>Reviews help future guests understand what the house feels like in real life. A few honest lines after checkout mean a lot.</p>",
  callout: {
    eyebrow: "Before you go",
    icon: "ph:heart-fill",
    title: "Loved your stay? Come back directly.",
    subtitle:
      "Returning guests can message the host before booking to ask about available dates and repeat-stay perks.",
    cta_enabled: false,
    card_style: "serif_shift",
    body_enabled: true,
    icon_size: 1,
    mobile_stack: true,
    accent_role: "secondary",
    style_customized: true,
  },
};

const bookingContacts: TextContent = {
  variant: "contacts",
  contacts_style: "accent_rail",
  contacts_config: {
    icon_size: 1,
    accent_role: "secondary",
  },
  contacts: [
    {
      icon: "ph:chat-centered-text-fill",
      label: "Preferred",
      value: "Booking app message",
      href: "",
    },
    {
      icon: "ph:calendar-check-fill",
      label: "Return stays",
      value: "hello@sunsetlakehouse.example",
      href: "mailto:hello@sunsetlakehouse.example",
    },
    {
      icon: "ph:phone-fill",
      label: "Urgent only",
      value: "+1 (555) 010-2400",
      href: "tel:+15550102400",
    },
  ],
};

const faqDefault: FaqContent = {
  style: "folder_tab",
  config: {
    accent_role: "secondary",
  },
  items: [
    {
      question: "Can I request a late checkout?",
      answer:
        "Sometimes. Message the host the day before checkout. It depends on the next reservation and cleaning schedule.",
    },
    {
      question: "Where do trash and recycling go?",
      answer:
        "Use the outdoor bins near the side path. Recycling goes in the marked bin; bagged trash goes in the black bin.",
    },
    {
      question: "Are pets allowed?",
      answer:
        "Yes, this sample template is pet-friendly with a sample $75 fee. Replace this with your real policy in the editor.",
    },
    {
      question: "Is smoking allowed?",
      answer:
        "Smoking is not allowed indoors. If your property allows outdoor smoking, note the exact location and disposal rules.",
    },
    {
      question: "How do heating and cooling work?",
      answer:
        "Use the wall thermostat and keep doors/windows closed while it runs. Message the host if the system does not respond.",
    },
    {
      question: "Can I use the fireplace or fire pit?",
      answer:
        "Use only approved fire features, never leave flames unattended, and skip outdoor fires during local burn restrictions.",
    },
    {
      question: "What is the best way to reach the host?",
      answer:
        "Booking platform messages are fastest for normal questions. Use the urgent phone number for time-sensitive safety or access issues.",
    },
  ],
};

export function buildSeedGuidebookSettings(
  seed: SeedGuidebook,
  sectionIds: string[],
  baseSettings: Record<string, unknown> = {}
): Record<string, unknown> {
  const contentUnits = seed.sections.reduce<Record<string, unknown>>(
    (acc, section, index) => {
      const sectionId = sectionIds[index];
      if (!sectionId) return acc;

      acc[sectionId] = {
        kind: section.kind ?? "guide",
        displayMode: section.displayMode ?? "popup",
        itemSettings: section.itemSettings ?? {},
      };

      return acc;
    },
    {}
  );

  return {
    ...baseSettings,
    ...(seed.settings ?? {}),
    content_units: contentUnits,
  };
}

export const sunsetLakehouseSeed: SeedGuidebook = {
  branding: {
    logo_url: null,
    primary_color: "#002927",
    secondary_color: "#d4a23a",
    font_family: "Montserrat",
    show_guestnix_branding: true,
  },
  settings: {
    [SECTION_COVER_DESIGN_SETTINGS_KEY]: sectionCoverDesign,
  },
  bottomNav: BOTTOM_NAV_DEFAULTS,
  sections: [
    {
      title: "Welcome",
      icon: "ph:house-line-fill",
      itemSettings: cover("Your Lakehouse Stay Begins Here", "Home.jpg", 50, 52),
      blocks: [
        block(
          "heading",
          heading("Settle in without the guesswork", {
            eyebrow: "Welcome",
            subtitle: "A quick orientation for a relaxed first hour.",
            style: "marker",
            align: "center",
            decorPosition: "center",
            decorWidth: "wide",
          })
        ),
        block("text", welcomeIntro),
        block("text", welcomeFacts),
      ],
    },
    {
      title: "Meet Host",
      icon: "ph:user-circle-fill",
      itemSettings: cover("Meet Your Host, Jane Doe", "meet.jpg", 50, 42),
      blocks: [
        block(
          "heading",
          heading("A thoughtful stay starts with a reachable host", {
            eyebrow: "Meet the host",
            subtitle: "Sample host details you can personalize later.",
            style: "orbits",
            align: "center",
            decorPosition: "center",
          })
        ),
        block("text", hostProfile),
        block("text", hostFacts),
        block("text", hostContacts),
      ],
    },
    {
      title: "Check-in / out",
      icon: "ph:key-fill",
      itemSettings: cover("Easy Arrival, Simple Departure", "checkin.jpg", 50, 50),
      blocks: [
        block(
          "heading",
          heading("Arrival details", {
            eyebrow: "Check-in / out",
            subtitle: "Everything guests need before they reach the door.",
            style: "sidebar",
          })
        ),
        block("container", arrivalContainer),
        block("text", checkinCallout),
      ],
    },
    {
      title: "Amenities",
      icon: "ph:sparkle-fill",
      itemSettings: cover("Comforts For Work, Rest, And Lake Days", "Amenities.jpg", 50, 48),
      blocks: [
        block(
          "heading",
          heading("What is included", {
            eyebrow: "Amenities",
            subtitle: "A quick scan of the comforts guests ask about most.",
            style: "tapered_end",
          })
        ),
        block("icon_grid", amenitiesGrid),
        block("tile_set", amenitiesTiles),
      ],
    },
    {
      title: "Wi-Fi",
      icon: "ph:wifi-high-fill",
      itemSettings: cover("Stay Connected Without Hunting For The Router", "wifi.jpg", 50, 50),
      blocks: [
        block(
          "heading",
          heading("Network and device notes", {
            eyebrow: "Wi-Fi",
            subtitle: "Guest network, QR access, and quick troubleshooting.",
            style: "sidebar",
          })
        ),
        block("wifi", wifiDefault),
        block("text", wifiCallout),
        block("faq", wifiFaq),
      ],
    },
    {
      title: "House Rules",
      icon: "ph:clipboard-text-fill",
      itemSettings: cover("A Peaceful House Has A Few Simple Rules", "rules.jpg", 50, 48),
      blocks: [
        block(
          "heading",
          heading("How to keep the stay easy", {
            eyebrow: "House rules",
            subtitle: "Clear expectations for guests, neighbors, and the home.",
            style: "marker",
            decorWidth: "wide",
          })
        ),
        block("text", rulesChecklist),
      ],
    },
    {
      title: "Kitchen & Dining",
      icon: "ph:fork-knife-fill",
      itemSettings: cover("Cook, Gather, And Leave It Ready", "kitchen.jpg", 50, 50),
      blocks: [
        block(
          "heading",
          heading("Everything for a comfortable meal", {
            eyebrow: "Kitchen & dining",
            subtitle: "Supplies, coffee, cleanup, and the first-morning treat.",
            style: "orbits",
            decorPosition: "center",
          })
        ),
        block("text", kitchenStack),
        block("text", kitchenCallout),
      ],
    },
    {
      title: "Emergency",
      icon: "ph:first-aid-kit-fill",
      itemSettings: cover("Know What To Do If Something Feels Off", "emergency.jpg", 50, 48),
      blocks: [
        block(
          "heading",
          heading("Safety contacts and urgent steps", {
            eyebrow: "Emergency",
            subtitle: "Call emergency services first when there is immediate danger.",
            style: "sidebar",
          })
        ),
        block("text", emergencyAlert),
        block("emergency_contacts", emergencyContactsDefault),
        block("text", emergencyChecklist),
      ],
    },
    {
      title: "Pet Policy",
      icon: "ph:paw-print-fill",
      itemSettings: cover("Pets Are Welcome With A Little Care", "pet.jpg", 50, 50),
      blocks: [
        block(
          "heading",
          heading("Pet-friendly stay notes", {
            eyebrow: "Pet policy",
            subtitle: "Simple rules for clean, comfortable stays with pets.",
            style: "marker",
            decorWidth: "wide",
          })
        ),
        block("text", petPolicy),
      ],
    },
    {
      title: "Sustainability",
      icon: "ph:leaf-fill",
      itemSettings: cover("Small Choices Keep The Lake Beautiful", "eco.jpg", 50, 48),
      blocks: [
        block(
          "heading",
          heading("Low-impact stay guide", {
            eyebrow: "Sustainability",
            subtitle: "Easy ways guests can reduce waste and respect the setting.",
            style: "tapered_end",
          })
        ),
        block("text", sustainabilityStack),
        block("text", sustainabilityFacts),
      ],
    },
    {
      title: "Contact / Booking",
      icon: "ph:calendar-check-fill",
      itemSettings: cover("Questions, Reviews, And Return Stays", "contact.jpg", 50, 46),
      blocks: [
        block(
          "heading",
          heading("Keep in touch", {
            eyebrow: "Contact / booking",
            subtitle: "How guests should reach the host during and after the stay.",
            style: "orbits",
            align: "center",
            decorPosition: "center",
          })
        ),
        block("text", contactCallout),
        block("text", bookingContacts),
      ],
    },
    {
      title: "FAQ",
      icon: "ph:question-fill",
      itemSettings: cover("Quick Answers Before You Message", "contact.jpg", 50, 46),
      blocks: [
        block(
          "heading",
          heading("Common property questions", {
            eyebrow: "FAQ",
            subtitle: "Property-focused answers without local place recommendations.",
            style: "sidebar",
          })
        ),
        block("faq", faqDefault),
      ],
    },
  ],
};

export const SEEDS_BY_TEMPLATE: Record<string, SeedGuidebook> = {
  "sunset-lakehouse": sunsetLakehouseSeed,
};
