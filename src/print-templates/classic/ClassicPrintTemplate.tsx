/* eslint-disable @next/next/no-img-element */
import type { CSSProperties, ReactNode } from "react";
import {
  AlertTriangle,
  BookOpenText,
  CalendarDays,
  CircleDot,
  Clock3,
  CloudSun,
  House,
  Image as ImageIcon,
  KeyRound,
  Languages,
  Link as LinkIcon,
  LockKeyhole,
  MapPin,
  MapPinned,
  Phone,
  PlayCircle,
  QrCode,
  WalletCards,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { sanitizeRichTextHtml } from "@/lib/html-sanitize";
import { sanitizeSvg } from "@/lib/icons/sanitize";
import type {
  PrintBlock,
  PrintField,
  PrintGuidebookDocument,
  PrintImage,
  PrintListItem,
  PrintPlace,
  PrintSection,
} from "@/lib/print/normalize";
import styles from "./ClassicPrintTemplate.module.css";

type Props = {
  document: PrintGuidebookDocument;
};

type PageProps = {
  document: PrintGuidebookDocument;
  children: ReactNode;
  className?: string;
  footer?: boolean;
};

type BlockShellProps = {
  block: PrintBlock;
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
};

const BLOCK_ICONS: Record<string, LucideIcon> = {
  text: BookOpenText,
  heading: BookOpenText,
  image: ImageIcon,
  gallery: ImageIcon,
  video: PlayCircle,
  wifi: Wifi,
  checkin: KeyRound,
  faq: CircleDot,
  button: LinkIcon,
  booking_link: CalendarDays,
  emergency_contacts: AlertTriangle,
  smart_lock: LockKeyhole,
  weather: CloudSun,
  world_clock: Clock3,
  currency: WalletCards,
  phrasebook: Languages,
  streaming: PlayCircle,
};

function qrImageUrl(value: string, size = 150) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=2&data=${encodeURIComponent(value)}`;
}

function wifiQrString(fields: PrintField[]) {
  const ssid = fields.find((field) => field.label === "Network")?.value ?? "";
  const password = fields.find((field) => field.label === "Password")?.value ?? "";
  const esc = (value: string) => value.replace(/([\\;,:"])/g, "\\$1");
  return ssid ? `WIFI:T:WPA;S:${esc(ssid)};P:${esc(password)};;` : "";
}

function printableUrl(value: string | undefined | null) {
  if (!value) return "";
  return value.replace(/^mailto:/i, "").replace(/^tel:/i, "");
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function initials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function fontStack(name: string, fallback: "serif" | "sans-serif") {
  const trimmed = name.trim();
  if (!trimmed) return fallback;
  const escaped = trimmed.replace(/"/g, '\\"');
  return `${/\s/.test(escaped) ? `"${escaped}"` : escaped}, ${fallback}`;
}

function em(value: number | null, fallback = 0) {
  const next = value === null ? fallback : value;
  return `${Math.min(0.12, Math.max(0, next))}em`;
}

function lineHeight(value: number | null, fallback: number) {
  const next = value === null ? fallback : value;
  return String(Math.min(1.8, Math.max(1, next)));
}

function cssVars(vars: Record<string, string | number | null | undefined>) {
  return Object.fromEntries(
    Object.entries(vars).filter(([, value]) => value !== null && value !== undefined)
  ) as CSSProperties;
}

function brandStyle(document: PrintGuidebookDocument) {
  return cssVars({
    "--print-primary": document.brand.primaryColor,
    "--print-secondary": document.brand.secondaryColor,
    "--print-accent": document.brand.accentColor,
    "--print-page-bg": document.brand.backgroundColor,
    "--print-heading-font": fontStack(document.brand.headingFont, "serif"),
    "--print-body-font": fontStack(document.brand.bodyFont, "sans-serif"),
    "--print-heading-weight": document.brand.headingWeight ?? 650,
    "--print-body-weight": document.brand.bodyWeight ?? 400,
    "--print-heading-tracking": em(document.brand.headingLetterSpacing),
    "--print-body-tracking": em(document.brand.bodyLetterSpacing),
    "--print-heading-leading": lineHeight(document.brand.headingLineHeight, 1.08),
    "--print-body-leading": lineHeight(document.brand.bodyLineHeight, 1.5),
  });
}

function SvgIcon({
  value,
  className,
}: {
  value?: string | null;
  className?: string;
}) {
  const clean = value?.trim().startsWith("<svg") ? sanitizeSvg(value) : "";
  if (!clean) return null;
  return (
    <span
      className={`${styles.svgIcon}${className ? ` ${className}` : ""}`}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

function BlockGlyph({ block }: { block: PrintBlock }) {
  if (block.icon?.trim().startsWith("<svg")) {
    return <SvgIcon value={block.icon} />;
  }
  const Icon = BLOCK_ICONS[block.sourceType] ?? BookOpenText;
  return <Icon aria-hidden="true" />;
}

function firstBlockImage(blocks: PrintBlock[]) {
  for (const block of blocks) {
    const image = block.images[0];
    if (image?.url) return image.url;
  }
  return null;
}

function firstVisual(document: PrintGuidebookDocument) {
  return (
    document.property.coverImageUrl ??
    document.sections.map((section) => section.coverImageUrl).find(Boolean) ??
    document.sections.map((section) => firstBlockImage(section.blocks)).find(Boolean) ??
    document.places.map((place) => place.imageUrl).find(Boolean) ??
    null
  );
}

function Page({ document, children, className, footer = true }: PageProps) {
  return (
    <section className={`${styles.page}${className ? ` ${className}` : ""}`}>
      {children}
      {footer ? (
        <footer className={styles.pageFooter}>
          <span>{document.property.name || document.title}</span>
          <span className={styles.footerUrl}>{printableUrl(document.publicUrl)}</span>
          <span className={styles.pageNumber} />
        </footer>
      ) : null}
    </section>
  );
}

function CoverPage({ document }: { document: PrintGuidebookDocument }) {
  const coverImage = firstVisual(document);
  return (
    <Page document={document} className={styles.coverPage} footer={false}>
      <div className={styles.coverBand} />
      <div className={styles.coverTopline}>
        {document.property.logoUrl ? (
          <img className={styles.logo} src={document.property.logoUrl} alt="" />
        ) : (
          <span className={styles.logoMark}>
            {initials(document.property.name || document.title) || "GN"}
          </span>
        )}
        <span>Guest welcome book</span>
      </div>

      <div className={styles.coverTitle}>
        <span className={styles.kicker}>Prepared for your stay</span>
        <h1>{document.property.name || document.title}</h1>
        {document.property.tagline ? <p>{document.property.tagline}</p> : null}
      </div>

      {coverImage ? (
        <figure className={styles.coverImage}>
          <img src={coverImage} alt="" />
        </figure>
      ) : (
        <div className={styles.coverImageFallback}>
          <House aria-hidden="true" />
        </div>
      )}

      <div className={styles.coverFooter}>
        <div>
          {document.property.address ? (
            <p className={styles.addressLine}>{document.property.address}</p>
          ) : null}
          <span>
            Version {document.version} - {formatDate(document.publishedAt)}
          </span>
        </div>
        <div className={styles.qrStack}>
          <img src={qrImageUrl(document.publicUrl, 132)} alt="" />
          <span>Scan live guide</span>
        </div>
      </div>
    </Page>
  );
}

function ContentsPage({ document }: { document: PrintGuidebookDocument }) {
  const items = [
    ...document.sections.map((section) => ({
      id: section.id,
      title: section.title,
      icon: section.icon,
      meta: `${section.blocks.length} item${section.blocks.length === 1 ? "" : "s"}`,
    })),
    ...(document.places.length > 0
      ? [
          {
            id: "nearby",
            title: "Nearby places",
            icon: "",
            meta: `${document.places.length} recommendation${
              document.places.length === 1 ? "" : "s"
            }`,
          },
        ]
      : []),
  ];

  return (
    <Page document={document} className={styles.contentsPage}>
      <div className={styles.pageEyebrow}>Contents</div>
      <div className={styles.contentsLayout}>
        <header>
          <h2>Quick reference for the stay.</h2>
          <p>
            Arrival details, house notes, host contacts, and local recommendations
            gathered from the current welcome book.
          </p>
        </header>
        <ol className={styles.tocList}>
          {items.map((item, index) => (
            <li key={item.id}>
              <span className={styles.tocNumber}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={styles.tocIcon}>
                {item.icon ? <SvgIcon value={item.icon} /> : <BookOpenText />}
              </span>
              <div>
                <strong>{item.title}</strong>
                <small>{item.meta}</small>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Page>
  );
}

function AboutPage({ document }: { document: PrintGuidebookDocument }) {
  const heroImage = document.property.coverImageUrl ?? document.host.avatarUrl;
  const hostName = document.host.name || document.host.firstName;
  const contactFields = [
    { label: "Phone", value: document.host.phone },
    { label: "Email", value: document.host.email },
    { label: "Languages", value: document.host.languages },
  ].filter((field) => field.value);

  return (
    <Page document={document} className={styles.aboutPage}>
      <div className={styles.aboutGrid}>
        <aside>
          {heroImage ? (
            <img className={styles.aboutImage} src={heroImage} alt="" />
          ) : (
            <div className={styles.aboutImageFallback}>
              <House aria-hidden="true" />
            </div>
          )}
          <div className={styles.statGrid}>
            <div>
              <strong>{document.sections.length}</strong>
              <span>Guide sections</span>
            </div>
            <div>
              <strong>{document.places.length}</strong>
              <span>Nearby picks</span>
            </div>
            <div>
              <strong>v{document.version}</strong>
              <span>Published</span>
            </div>
          </div>
        </aside>
        <main>
          <span className={styles.kicker}>About the stay</span>
          <h2>{document.property.name || document.title}</h2>
          {document.property.tagline ? <p>{document.property.tagline}</p> : null}
          {document.property.address ? (
            <div className={styles.addressCard}>
              <MapPin aria-hidden="true" />
              <span>{document.property.address}</span>
            </div>
          ) : null}

          <div className={styles.hostCard}>
            {document.host.avatarUrl ? (
              <img src={document.host.avatarUrl} alt="" />
            ) : (
              <span>{initials(hostName) || "H"}</span>
            )}
            <div>
              <small>Hosted by</small>
              <strong>{hostName || "Your host"}</strong>
              {document.host.bio ? <p>{document.host.bio}</p> : null}
            </div>
          </div>
          <FieldList fields={contactFields} variant="chips" />
        </main>
      </div>
    </Page>
  );
}

function BlockShell({
  block,
  children,
  className,
  title,
  subtitle,
}: BlockShellProps) {
  return (
    <article
      className={`${styles.blockCard}${className ? ` ${className}` : ""}`}
      data-tone={block.tone}
      data-kind={block.kind}
      data-source={block.sourceType}
    >
      <header className={styles.blockHeader}>
        <span className={styles.blockIcon}>
          <BlockGlyph block={block} />
        </span>
        <div>
          <span className={styles.badge}>{block.badge}</span>
          {title ? <h3>{title}</h3> : null}
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </header>
      {children}
    </article>
  );
}

function FieldList({
  fields,
  variant = "grid",
}: {
  fields: PrintField[];
  variant?: "grid" | "rows" | "chips";
}) {
  if (fields.length === 0) return null;
  return (
    <dl className={styles.fields} data-variant={variant}>
      {fields.map((field) => (
        <div key={`${field.label}-${field.value}`} className={styles.field}>
          {field.icon ? (
            <span className={styles.fieldIcon}>
              <SvgIcon value={field.icon} />
            </span>
          ) : null}
          <dt>{field.label}</dt>
          <dd>{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function RichItems({
  items,
  variant = "numbered",
}: {
  items: PrintListItem[];
  variant?: "numbered" | "timeline" | "cards" | "pills";
}) {
  if (items.length === 0) return null;
  return (
    <ul className={styles.items} data-variant={variant}>
      {items.map((item, index) => (
        <li key={`${index}-${item.title}-${item.detail ?? ""}`}>
          {variant !== "pills" ? (
            <span className={styles.itemMarker}>
              {item.icon ? <SvgIcon value={item.icon} /> : String(index + 1).padStart(2, "0")}
            </span>
          ) : null}
          <div>
            {item.meta ? <em>{item.meta}</em> : null}
            <strong>{item.title}</strong>
            {item.detail ? <small>{item.detail}</small> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Prose({ html }: { html?: string }) {
  const clean = sanitizeRichTextHtml(html);
  return clean ? (
    <div className={styles.prose} dangerouslySetInnerHTML={{ __html: clean }} />
  ) : null;
}

function ImageGrid({ images }: { images: PrintImage[] }) {
  if (images.length === 0) return null;
  return (
    <div className={styles.imageGrid} data-count={Math.min(images.length, 4)}>
      {images.slice(0, 4).map((image) => (
        <figure key={image.url}>
          <img src={image.url} alt={image.alt ?? ""} />
          {image.caption ? <figcaption>{image.caption}</figcaption> : null}
        </figure>
      ))}
    </div>
  );
}

function TextBlock({ block }: { block: PrintBlock }) {
  return (
    <BlockShell block={block} title={block.title} subtitle={block.subtitle}>
      <Prose html={block.html} />
      {block.text ? <p className={styles.copy}>{block.text}</p> : null}
    </BlockShell>
  );
}

function ListBlock({ block }: { block: PrintBlock }) {
  return (
    <BlockShell block={block} title={block.title} subtitle={block.subtitle}>
      <FieldList fields={block.fields} variant="rows" />
      <RichItems items={block.items} />
      <Prose html={block.html} />
      {block.text ? <p className={styles.copy}>{block.text}</p> : null}
    </BlockShell>
  );
}

function NoticeBlock({ block }: { block: PrintBlock }) {
  return (
    <BlockShell
      block={block}
      className={styles.noticeBlock}
      title={block.title}
      subtitle={block.subtitle}
    >
      <FieldList fields={block.fields} variant="chips" />
      <Prose html={block.html} />
      {block.text ? <p className={styles.copy}>{block.text}</p> : null}
      {block.url ? <p className={styles.urlText}>{printableUrl(block.url)}</p> : null}
    </BlockShell>
  );
}

function WifiBlock({ block }: { block: PrintBlock }) {
  const qr = wifiQrString(block.fields);
  return (
    <BlockShell
      block={block}
      className={styles.wifiBlock}
      title={block.title ?? "Wi-Fi access"}
    >
      <div className={styles.credentialGrid}>
        {block.fields.map((field) => (
          <div key={field.label} className={styles.credential}>
            <span>{field.label}</span>
            <strong>{field.value}</strong>
          </div>
        ))}
      </div>
      {block.text ? <p className={styles.copy}>{block.text}</p> : null}
      {qr ? (
        <div className={styles.inlineQr}>
          <img src={qrImageUrl(qr, 128)} alt="" />
          <span>Scan to join</span>
        </div>
      ) : null}
    </BlockShell>
  );
}

function CheckinBlock({ block }: { block: PrintBlock }) {
  const primaryFields = block.fields.filter(
    (field) => field.label === "Check-in" || field.label === "Check-out"
  );
  const detailFields = block.fields.filter(
    (field) => field.label !== "Check-in" && field.label !== "Check-out"
  );

  return (
    <BlockShell
      block={block}
      className={styles.arrivalBlock}
      title={block.title ?? "Arrival and departure"}
    >
      <div className={styles.timeGrid}>
        {primaryFields.map((field) => (
          <div key={field.label}>
            <span>{field.label}</span>
            <strong>{field.value}</strong>
          </div>
        ))}
      </div>
      <FieldList fields={detailFields} variant="chips" />
      <RichItems items={block.items} variant="timeline" />
    </BlockShell>
  );
}

function FaqBlock({ block }: { block: PrintBlock }) {
  return (
    <BlockShell block={block} title={block.title ?? "Questions"}>
      <div className={styles.faqList}>
        {block.items.map((item, index) => (
          <section key={`${index}-${item.title}`}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h4>{item.title}</h4>
              {item.detail ? <p>{item.detail}</p> : null}
            </div>
          </section>
        ))}
      </div>
    </BlockShell>
  );
}

function LinkPanel({ block }: { block: PrintBlock }) {
  return (
    <BlockShell
      block={block}
      className={styles.linkBlock}
      title={block.title ?? "Link"}
      subtitle={block.subtitle}
    >
      {block.url ? <p className={styles.urlText}>{printableUrl(block.url)}</p> : null}
      {block.url ? (
        <div className={styles.inlineQr}>
          <img src={qrImageUrl(block.url, 118)} alt="" />
          <span>Open link</span>
        </div>
      ) : null}
    </BlockShell>
  );
}

function ContactsBlock({ block }: { block: PrintBlock }) {
  return (
    <BlockShell
      block={block}
      className={block.tone === "danger" ? styles.emergencyBlock : styles.contactsBlock}
      title={block.title ?? "Contacts"}
    >
      <div className={styles.contactRows}>
        {block.fields.map((field) => (
          <div key={`${field.label}-${field.value}`} className={styles.contactRow}>
            <span>
              {field.icon ? <SvgIcon value={field.icon} /> : <Phone aria-hidden="true" />}
            </span>
            <div>
              <strong>{field.label}</strong>
              <small>{field.value}</small>
            </div>
          </div>
        ))}
      </div>
    </BlockShell>
  );
}

function SmartLockBlock({ block }: { block: PrintBlock }) {
  const code = block.fields.find((field) => field.label === "Code");
  const otherFields = block.fields.filter((field) => field.label !== "Code");
  return (
    <BlockShell
      block={block}
      className={styles.lockBlock}
      title={block.title ?? "Smart lock"}
    >
      {code ? (
        <div className={styles.codePanel}>
          <span>{code.label}</span>
          <strong>{code.value}</strong>
        </div>
      ) : null}
      <FieldList fields={otherFields} variant="chips" />
      {block.text ? <p className={styles.copy}>{block.text}</p> : null}
    </BlockShell>
  );
}

function MediaBlock({ block }: { block: PrintBlock }) {
  return (
    <BlockShell
      block={block}
      className={styles.mediaBlock}
      title={block.title}
      subtitle={block.subtitle}
    >
      <ImageGrid images={block.images} />
    </BlockShell>
  );
}

function HeadingBlock({ block }: { block: PrintBlock }) {
  return (
    <div className={styles.headingBlock}>
      {block.label ? <span>{block.label}</span> : null}
      {block.title ? <h3>{block.title}</h3> : null}
      {block.subtitle ? <p>{block.subtitle}</p> : null}
    </div>
  );
}

function BlockView({ block }: { block: PrintBlock }) {
  if (block.kind === "divider") return <hr className={styles.divider} />;
  if (block.kind === "heading") return <HeadingBlock block={block} />;
  if (block.kind === "image" || block.kind === "gallery") {
    return <MediaBlock block={block} />;
  }

  switch (block.sourceType) {
    case "wifi":
      return <WifiBlock block={block} />;
    case "checkin":
      return <CheckinBlock block={block} />;
    case "faq":
      return <FaqBlock block={block} />;
    case "button":
    case "booking_link":
    case "video":
      return <LinkPanel block={block} />;
    case "smart_lock":
      return <SmartLockBlock block={block} />;
    case "emergency_contacts":
      return <ContactsBlock block={block} />;
    default:
      break;
  }

  if (block.kind === "contacts") return <ContactsBlock block={block} />;
  if (block.kind === "notice") return <NoticeBlock block={block} />;
  if (block.kind === "list") return <ListBlock block={block} />;
  return <TextBlock block={block} />;
}

function SectionPage({
  document,
  section,
  index,
}: {
  document: PrintGuidebookDocument;
  section: PrintSection;
  index: number;
}) {
  const heroImage = section.coverImageUrl ?? firstBlockImage(section.blocks);
  return (
    <Page document={document} className={styles.sectionPage}>
      <header className={styles.sectionIntro}>
        <div className={styles.sectionMeta}>
          <span className={styles.sectionNumber}>{String(index + 1).padStart(2, "0")}</span>
          <span className={styles.sectionIcon}>
            {section.icon ? <SvgIcon value={section.icon} /> : <BookOpenText />}
          </span>
          <div>
            <span className={styles.kicker}>Guide section</span>
            <h2>{section.coverTitle || section.title}</h2>
            {section.coverTitle && section.coverTitle !== section.title ? (
              <p>{section.title}</p>
            ) : null}
          </div>
        </div>
        {heroImage ? (
          <figure className={styles.sectionImage}>
            <img
              src={heroImage}
              alt=""
              style={{
                objectPosition: `${section.coverImagePosition.x}% ${section.coverImagePosition.y}%`,
              }}
            />
          </figure>
        ) : null}
      </header>
      <div className={styles.blockGrid}>
        {section.blocks.map((block) => (
          <BlockView key={block.id} block={block} />
        ))}
      </div>
    </Page>
  );
}

function PlaceCard({ place }: { place: PrintPlace }) {
  const fields = [
    { label: "Address", value: place.address ?? "" },
    { label: "Hours", value: place.openingHours ?? "" },
    { label: "Phone", value: place.phone ?? "" },
    { label: "Website", value: printableUrl(place.website) },
    { label: "Email", value: printableUrl(place.email) },
  ].filter((field) => field.value);

  return (
    <article
      className={styles.placeCard}
      style={cssVars({
        "--place-color": place.categoryColor,
        "--place-soft": place.categorySoft,
      })}
    >
      <div className={styles.placeMedia}>
        {place.imageUrl ? (
          <img src={place.imageUrl} alt="" />
        ) : (
          <span>
            <SvgIcon value={place.categoryIcon} />
          </span>
        )}
      </div>
      <div className={styles.placeBody}>
        <span className={styles.placeCategory}>
          <SvgIcon value={place.categoryIcon} />
          {place.categoryLabel}
        </span>
        <h3>{place.name}</h3>
        {place.description ? <p>{place.description}</p> : null}
        <FieldList fields={fields} variant="rows" />
      </div>
    </article>
  );
}

function NearbyPage({ document }: { document: PrintGuidebookDocument }) {
  if (document.places.length === 0) return null;
  const hero = document.places.find((place) => place.imageUrl) ?? document.places[0];
  const categories = Array.from(
    new Map(document.places.map((place) => [place.categoryLabel, place])).values()
  );

  return (
    <Page document={document} className={styles.nearbyPage}>
      <div className={styles.nearbyLayout}>
        <aside>
          <span className={styles.kicker}>Nearby places</span>
          <h2>Local picks close to the stay.</h2>
          {hero.imageUrl ? (
            <img className={styles.nearbyHero} src={hero.imageUrl} alt="" />
          ) : (
            <div className={styles.nearbyHeroFallback}>
              <MapPinned aria-hidden="true" />
            </div>
          )}
          <div className={styles.categoryRail}>
            {categories.map((place) => (
              <span
                key={place.categoryLabel}
                style={cssVars({
                  "--place-color": place.categoryColor,
                  "--place-soft": place.categorySoft,
                })}
              >
                <SvgIcon value={place.categoryIcon} />
                {place.categoryLabel}
              </span>
            ))}
          </div>
        </aside>
        <main className={styles.placeList}>
          {document.places.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </main>
      </div>
    </Page>
  );
}

function BackPage({ document }: { document: PrintGuidebookDocument }) {
  return (
    <Page document={document} className={styles.backPage} footer={false}>
      <div>
        <QrCode aria-hidden="true" />
        <h2>Keep the live guide handy.</h2>
        <p>{printableUrl(document.publicUrl)}</p>
      </div>
      <img src={qrImageUrl(document.publicUrl, 180)} alt="" />
      <span>{document.property.name || document.title}</span>
    </Page>
  );
}

export function ClassicPrintTemplate({ document }: Props) {
  return (
    <div className={styles.shell} style={brandStyle(document)}>
      <article className={styles.book}>
        <CoverPage document={document} />
        <ContentsPage document={document} />
        <AboutPage document={document} />
        {document.sections.map((section, index) => (
          <SectionPage
            key={section.id}
            document={document}
            section={section}
            index={index}
          />
        ))}
        <NearbyPage document={document} />
        <BackPage document={document} />
      </article>
    </div>
  );
}
