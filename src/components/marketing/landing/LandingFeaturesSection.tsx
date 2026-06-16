import {
  ArrowLeft,
  AlertTriangle,
  Banknote,
  BarChart3,
  BookOpen,
  CircleHelp,
  Clock,
  CloudSun,
  Code2,
  Contact,
  ExternalLink,
  FileText,
  Globe2,
  Grid2X2,
  Heading1,
  Image as ImageIcon,
  Images,
  Languages,
  Layers,
  LayoutGrid,
  Link2,
  ListChecks,
  Lock,
  MapPin,
  MapPinned,
  Monitor,
  MoreHorizontal,
  Palette,
  PanelTop,
  PanelsTopLeft,
  Plus,
  Printer,
  Save,
  Settings,
  ShieldAlert,
  Smartphone,
  SplitSquareHorizontal,
  Table2,
  Tablet,
  Tv,
  Video,
  Wifi,
  MousePointer2,
  Zap,
} from "lucide-react";
import NextImage from "next/image";
import type { ComponentType, CSSProperties } from "react";
import { SectionHeader } from "./SectionHeader";

const editorPoints = [
  "Drag-and-drop sections with custom icons",
  "Widgets: maps, contact cards, weather and more",
  "Live preview while you edit",
  "Custom bottom navigation tabs for guests",
  "Unlimited sections with zero artificial limits",
] as const;

const editorKitItems = [
  { icon: Layers, label: "Blocks", value: "28" },
  { icon: CloudSun, label: "Widgets", value: "10" },
  { icon: Smartphone, label: "Preview", value: "Live" },
  { icon: Globe2, label: "Publish", value: "Instant" },
] as const;

const templatePreviewCards = [
  {
    title: "Villa",
    image: "/marketing/templates/oceanview-villa.jpg",
    accent: "#1fbf8f",
  },
  {
    title: "City",
    image: "/marketing/templates/city-flat.jpg",
    accent: "#4d7cff",
  },
  {
    title: "Cabin",
    image: "/marketing/templates/alpine-cabin.jpg",
    accent: "#ffb020",
  },
] as const;

const brandSwatches = ["#042129", "#6fef8b", "#ffb020", "#fff1f5"] as const;

const featureTiles = [
  {
    icon: MapPin,
    title: "Local Recommendations",
    body: "Auto-fetches nearby restaurants, cafes, and attractions with a map view. Add personal notes and give guests true insider knowledge.",
    accent: "accent-teal",
  },
  {
    icon: Link2,
    title: "QR Codes & Smart Sharing",
    body: "Generate a QR code, copy a direct link, or use the ready-to-paste Airbnb message. Three seconds from done to sent.",
    accent: "accent-violet",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    body: "Track total views, see your top sections, and understand what guests actually read in real time.",
    accent: "accent-amber",
  },
  {
    icon: Zap,
    title: "Always Current",
    body: "Update once and every guest link refreshes instantly. Quick Variables keep WiFi, door codes, check-in times, and notices synced everywhere.",
    accent: "accent-coral",
  },
  {
    icon: Smartphone,
    title: "Offline-Ready PWA",
    body: "Works offline and installs like a native app. No login, no account, no download required.",
    accent: "accent-blue",
  },
  {
    icon: Globe2,
    title: "Multiple Languages",
    body: "Your guidebook and AI concierge both speak multiple languages. International guests feel just as at home.",
    accent: "accent-caramel",
  },
  {
    icon: Lock,
    title: "Password Protection",
    body: "Keep your guide private and share it only with confirmed guests. Full control over who sees your content.",
    accent: "accent-pink",
  },
  {
    icon: Printer,
    title: "Print Guidebook",
    body: "Export a print-ready version for properties with unreliable signal. Digital first, never digital only.",
    accent: "accent-gray",
  },
  {
    icon: Globe2,
    title: "Custom Domain & Deep Links",
    body: "Host on your own domain and link guests directly to specific sections like WiFi, check-in, or house rules.",
    accent: "accent-teal",
  },
] as const;

type BlockLibraryItem = {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
};

const blockShuffleSlots: Array<{
  placement:
    | "top-left"
    | "top-right"
    | "left"
    | "right"
    | "bottom-left"
    | "bottom-right";
  items: BlockLibraryItem[];
}> = [
  {
    placement: "top-left",
    items: [
      { icon: FileText, label: "Rich Text" },
      { icon: PanelTop, label: "Info Card" },
      { icon: ListChecks, label: "List" },
      { icon: Table2, label: "Facts Grid" },
      { icon: Contact, label: "Contact Rows" },
    ],
  },
  {
    placement: "top-right",
    items: [
      { icon: AlertTriangle, label: "Alert Banner" },
      { icon: Heading1, label: "Heading" },
      { icon: CircleHelp, label: "FAQ" },
      { icon: MousePointer2, label: "Button" },
      { icon: LayoutGrid, label: "Icon Grid" },
    ],
  },
  {
    placement: "left",
    items: [
      { icon: PanelsTopLeft, label: "Image Cards" },
      { icon: Grid2X2, label: "Tile Set" },
      { icon: ImageIcon, label: "Photo" },
      { icon: Images, label: "Gallery" },
      { icon: Video, label: "Video" },
    ],
  },
  {
    placement: "right",
    items: [
      { icon: SplitSquareHorizontal, label: "Divider" },
      { icon: PanelsTopLeft, label: "Container" },
      { icon: Code2, label: "HTML Code" },
      { icon: Wifi, label: "Wi-Fi + QR" },
      { icon: Lock, label: "Smart Lock" },
    ],
  },
  {
    placement: "bottom-left",
    items: [
      { icon: ShieldAlert, label: "Emergency" },
      { icon: CloudSun, label: "Weather" },
      { icon: MapPinned, label: "Add Places" },
      { icon: Tv, label: "Streaming" },
    ],
  },
  {
    placement: "bottom-right",
    items: [
      { icon: ExternalLink, label: "Booking Link" },
      { icon: Banknote, label: "Currency" },
      { icon: Languages, label: "Phrasebook" },
      { icon: Clock, label: "World Clock" },
    ],
  },
];

const chipShuffleOffsets = [
  { x: "0px", y: "0px", r: "-2deg" },
  { x: "24px", y: "-16px", r: "4deg" },
  { x: "-18px", y: "18px", r: "-5deg" },
  { x: "42px", y: "14px", r: "3deg" },
  { x: "-32px", y: "-12px", r: "5deg" },
] as const;

export function LandingFeaturesSection() {
  return (
    <section className="landing-section is-tight-top" id="features">
      <div className="landing-container">
        <SectionHeader
          eyebrow="Everything in one place"
          title={
            <>
              A guidebook that actually works.
              <br />
              On any device, at any hour.
            </>
          }
        />

        <div className="feature-bento">
          <article className="feature-editor-card" data-reveal data-delay="1">
            <div className="feature-editor-copy">
              <p className="feature-kicker">Guidebook Editor</p>
              <h3>
                Rich, flexible,
                <br />
                and genuinely powerful.
              </h3>
              <p>
                A block-based editor that makes building a professional guidebook
                feel effortless. Drag-and-drop everything. Go live the moment
                you hit publish.
              </p>
              <ul>
                {editorPoints.map((point) => (
                  <li key={point}>
                    <span aria-hidden />
                    {point}
                  </li>
                ))}
              </ul>
              <div className="editor-kit-summary" aria-label="Guidebook editor capabilities">
                {editorKitItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <span key={item.label}>
                      <Icon size={15} />
                      <b>{item.value}</b>
                      <em>{item.label}</em>
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="editor-preview" aria-label="Guidebook editor preview">
              <div className="editor-app-side" aria-hidden>
                <div className="editor-app-primary">
                  <span className="active">
                    <Layers size={15} />
                    Content
                  </span>
                  <span>
                    <Palette size={15} />
                    Design
                  </span>
                  <span>
                    <Settings size={15} />
                    Settings
                  </span>
                </div>
                <div className="editor-app-subtabs">
                  <span className="active">Guidebook</span>
                  <span>Featured</span>
                  <span>Navigation</span>
                </div>
                <div className="editor-app-panel">
                  <div className="editor-app-panel-head">
                    <div>
                      <strong>Guide Sections</strong>
                      <span>Choose a section to edit.</span>
                    </div>
                    <i>
                      <Plus size={12} />
                    </i>
                  </div>
                  <div className="editor-app-section-row active">
                    <span />
                    <div>
                      <strong />
                      <i />
                    </div>
                    <b />
                  </div>
                  <div className="editor-app-section-row">
                    <span />
                    <div>
                      <strong />
                      <i />
                    </div>
                    <b />
                  </div>
                  <div className="editor-app-section-row">
                    <span />
                    <div>
                      <strong />
                      <i />
                    </div>
                    <b />
                  </div>
                  <div className="editor-app-section-row short">
                    <span />
                    <div>
                      <strong />
                      <i />
                    </div>
                  </div>
                </div>
              </div>

              <div className="editor-app-main" aria-hidden>
                <div className="editor-app-toolbar">
                  <div className="editor-app-titlebar">
                    <span className="editor-icon-button">
                      <ArrowLeft size={13} />
                    </span>
                    <span className="editor-brand-mark">
                      <BookOpen size={14} />
                    </span>
                    <strong />
                  </div>
                  <div className="editor-app-devices">
                    <span className="active">
                      <Smartphone size={12} />
                    </span>
                    <span>
                      <Tablet size={12} />
                    </span>
                    <span>
                      <Monitor size={12} />
                    </span>
                  </div>
                  <div className="editor-app-actions">
                    <span>
                      <Save size={12} />
                    </span>
                    <b />
                    <span>
                      <MoreHorizontal size={13} />
                    </span>
                  </div>
                </div>
                <div className="editor-app-preview-stage">
                  <div className="editor-screenshot-slot">
                    <div className="editor-screenshot-image">
                      <div className="editor-shot-lang">US</div>
                      <div className="editor-shot-logo" />
                      <strong>Sunset Lake House</strong>
                      <span>A window into heavens</span>
                      <b>Co-Hosted by Jane Doe</b>
                      <div className="editor-shot-card wide" />
                      <div className="editor-shot-card wide" />
                      <div className="editor-shot-card wide" />
                      <div className="editor-shot-pair">
                        <i />
                        <i />
                      </div>
                      <div className="editor-shot-click">CLICK</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="editor-block-overlays" aria-hidden>
                {blockShuffleSlots.map((slot) => (
                  <div
                    className="editor-block-slot"
                    data-slot={slot.placement}
                    key={slot.placement}
                  >
                    {slot.items.map((block, blockIndex) => {
                      const Icon = block.icon;
                      return (
                        <span
                          className="editor-block-chip"
                          style={
                            {
                              "--chip-delay": `${blockIndex * 3}s`,
                              "--chip-duration": `${slot.items.length * 3}s`,
                              "--chip-x": chipShuffleOffsets[blockIndex % chipShuffleOffsets.length].x,
                              "--chip-y": chipShuffleOffsets[blockIndex % chipShuffleOffsets.length].y,
                              "--chip-r": chipShuffleOffsets[blockIndex % chipShuffleOffsets.length].r,
                            } as CSSProperties
                          }
                          key={block.label}
                        >
                          <Icon size={14} />
                          {block.label}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="feature-card accent-amber" data-reveal data-delay="2">
            <p className="feature-kicker">Templates</p>
            <h3>
              Start beautiful.
              <br />
              Not blank.
            </h3>
            <p>
              Pick a template seeded with 10 fully written, content-filled
              sections. Tailor it in minutes, not hours.
            </p>
            <div className="mini-preview template-preview" aria-label="Template gallery preview">
              {templatePreviewCards.map((template, index) => (
                <div
                  className="template-mini-card"
                  key={template.title}
                  style={
                    {
                      "--template-accent": template.accent,
                      "--template-delay": `${index * 140}ms`,
                    } as CSSProperties
                  }
                >
                  <NextImage
                    src={template.image}
                    alt=""
                    width={188}
                    height={104}
                    sizes="94px"
                  />
                  <div className="template-mini-body">
                    <span>{template.title}</span>
                    <i />
                    <i />
                    <b />
                  </div>
                </div>
              ))}
            </div>
            <span className="soft-badge">More templates coming soon</span>
          </article>

          <article className="feature-card accent-pink" data-reveal data-delay="3">
            <p className="feature-kicker">Custom Branding</p>
            <h3>
              Your property.
              <br />
              Your brand. Not ours.
            </h3>
            <p>
              Upload your logo, choose your colors, and set a custom domain.
              Your guidebook looks built by you, not a SaaS company.
            </p>
            <div className="mini-preview brand-preview" aria-label="Brand customization preview">
              <div className="brand-mini-header">
                <span className="brand-mini-mark">SL</span>
                <div>
                  <strong>Sunset Lake</strong>
                  <small>House guide</small>
                </div>
              </div>
              <div className="brand-mini-swatches">
                {brandSwatches.map((swatch) => (
                  <span key={swatch} style={{ background: swatch }} />
                ))}
              </div>
              <div className="brand-mini-type">
                <strong />
                <span />
                <span />
              </div>
              <div className="brand-mini-domain">
                <Globe2 size={12} />
                <span>stay.sunsetlake.house</span>
              </div>
            </div>
          </article>
        </div>

        <div className="feature-grid">
          {featureTiles.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className={`feature-tile ${feature.accent}`}
                data-reveal
                data-delay={(index % 3) + 1}
              >
                <span className="feature-icon" aria-hidden>
                  <Icon size={22} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
