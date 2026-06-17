"use client";

import type { ComponentType, ReactNode } from "react";
import { Icon } from "@iconify/react";
import {
  Check,
  Star,
  Languages,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Share2,
  User,
  Globe,
  Link as LinkIcon,
} from "lucide-react";
import type {
  HeroHostFields,
  HeroHostPageShowFlags,
  HeroImageFit,
  HostPhotoSource,
} from "@/lib/hero-data";
import { editorInspectAttributes } from "@/lib/editor-inspect";
import { HostIcon } from "@/components/icons/HostIcon";
import type { HostSocialLink } from "@/types/blocks";

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

const FacebookIcon: IconComponent = (props) => <Icon icon="ph:facebook-logo-fill" {...props} />;
const InstagramIcon: IconComponent = (props) => <Icon icon="ph:instagram-logo-fill" {...props} />;
const TwitterIcon: IconComponent = (props) => <Icon icon="ph:x-logo-fill" {...props} />;
const YoutubeIcon: IconComponent = (props) => <Icon icon="ph:youtube-logo-fill" {...props} />;
const LinkedinIcon: IconComponent = (props) => <Icon icon="ph:linkedin-logo-fill" {...props} />;
const WhatsappIcon: IconComponent = (props) => <Icon icon="ph:whatsapp-logo-fill" {...props} />;
const TiktokIcon: IconComponent = (props) => <Icon icon="ph:tiktok-logo-fill" {...props} />;

type Props = {
  host: HeroHostFields;
  propertyAddress?: string;
  propertyLogoUrl: string | null;
  photoSource: HostPhotoSource;
  photoFit: HeroImageFit;
  show: HeroHostPageShowFlags;
  /** Displayed when no host name is set. */
  fallbackName?: string;
  highlighted?: boolean;
  /** Rendered at the bottom of the page (e.g. install-app CTA). */
  footerSlot?: ReactNode;
  /** Rendered after all host page content. */
  bottomSlot?: ReactNode;
};

const SOCIAL_META: Record<
  HostSocialLink["platform"],
  { label: string; Icon: IconComponent; color: string }
> = {
  website: { label: "Website", Icon: Globe, color: "#0f766e" },
  airbnb: { label: "Airbnb", Icon: LinkIcon, color: "#ff5a5f" },
  facebook: { label: "Facebook", Icon: FacebookIcon, color: "#1877f2" },
  instagram: { label: "Instagram", Icon: InstagramIcon, color: "#e1306c" },
  twitter: { label: "Twitter", Icon: TwitterIcon, color: "#0f172a" },
  whatsapp: { label: "WhatsApp", Icon: WhatsappIcon, color: "#25d366" },
  youtube: { label: "YouTube", Icon: YoutubeIcon, color: "#ff0000" },
  tiktok: { label: "TikTok", Icon: TiktokIcon, color: "#0f172a" },
  linkedin: { label: "LinkedIn", Icon: LinkedinIcon, color: "#0a66c2" },
  other: { label: "Link", Icon: LinkIcon, color: "#64748b" },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "✶";
}

function normalizeUrl(url: string, platform: HostSocialLink["platform"]): string {
  if (!url) return url;
  if (platform === "whatsapp" && /^\+?\d[\d\s-]*$/.test(url)) {
    const digits = url.replace(/[^\d]/g, "");
    return `https://wa.me/${digits}`;
  }
  if (/^https?:\/\//i.test(url)) return url;
  if (/^mailto:|^tel:/i.test(url)) return url;
  return `https://${url}`;
}

export function AboutHost({
  host,
  propertyAddress,
  propertyLogoUrl,
  photoSource,
  photoFit,
  show,
  fallbackName = "Your host",
  highlighted = false,
  footerSlot,
  bottomSlot,
}: Props) {
  const displayName = host.name.trim() || fallbackName;
  const socials = (host.social ?? []).filter((s) => s?.url);
  const displayedAvatar =
    photoSource === "property_logo" ? propertyLogoUrl : host.avatar_url;

  const showAvatar = show.avatar;
  const showBio = show.bio && Boolean(host.bio);
  const showLanguages = show.languages && Boolean(host.languages);
  const showSuperhost = show.superhost && host.superhost;
  const showPhone = show.phone && Boolean(host.phone);
  const showEmail = show.email && Boolean(host.email);
  const showAddress = show.address && Boolean(propertyAddress);
  const showSocial = show.social && socials.length > 0;

  const hasContact = showPhone || showEmail || showAddress;

  return (
    <div
      className={`sl-tab sl-host${highlighted ? " sl-search-highlight" : ""}`}
      data-guidebook-search-target="host"
      {...editorInspectAttributes(
        { kind: "featured", view: "host", focus: "page" },
        "Edit host page"
      )}
    >
      <div className="sl-host-profile">
        <header className="sl-host-header">
          {showAvatar && (
            <div
              className="sl-host-avatar"
              {...editorInspectAttributes(
                { kind: "featured", view: "host", focus: "photo" },
                "Edit host photo"
              )}
              style={
                {
                  "--sl-host-avatar-fit": photoFit,
                } as React.CSSProperties
              }
            >
              {displayedAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayedAvatar} alt="" />
              ) : (
                <span className="sl-host-avatar-initials" aria-hidden>
                  {getInitials(displayName)}
                </span>
              )}
              {showSuperhost && (
                <span
                  className="sl-host-badge"
                  title="Superhost"
                  aria-label="Superhost"
                >
                  <Check aria-hidden />
                </span>
              )}
            </div>
          )}

          <h2
            className="sl-host-name"
            {...editorInspectAttributes(
              { kind: "featured", view: "host", focus: "title" },
              "Edit host name"
            )}
          >
            {displayName}
          </h2>

          {showSuperhost && (
            <div className="sl-host-pill">
              <Star aria-hidden />
              <span>Superhost</span>
            </div>
          )}

          {showLanguages && (
            <div className="sl-host-languages">
              <Languages aria-hidden />
              <span>{host.languages}</span>
            </div>
          )}
        </header>

        {showBio && (
          <div
            className="sl-host-bio"
            {...editorInspectAttributes(
              { kind: "featured", view: "host", focus: "bio" },
              "Edit host bio"
            )}
          >
            <p>{host.bio}</p>
          </div>
        )}

        {footerSlot ? <div className="sl-host-footer-slot">{footerSlot}</div> : null}
      </div>

      <div className="sl-host-details">
        {hasContact && (
          <section
            className="sl-host-section"
            {...editorInspectAttributes(
              { kind: "featured", view: "host", focus: "contact" },
              "Edit host contact"
            )}
          >
            <h3 className="sl-host-section-title">
              <MessageCircle aria-hidden />
              <span>Get in touch</span>
            </h3>
            <div className="sl-host-contact-grid">
              {showPhone && (
                <a
                  className="sl-host-contact-item"
                  href={`tel:${host.phone}`}
                >
                  <span className="sl-host-contact-icon">
                    <Phone aria-hidden />
                  </span>
                  <span className="sl-host-contact-text">
                    <span className="sl-host-contact-label">Call host</span>
                    <span className="sl-host-contact-value">{host.phone}</span>
                  </span>
                </a>
              )}
              {showEmail && (
                <a
                  className="sl-host-contact-item"
                  href={`mailto:${host.email}`}
                >
                  <span className="sl-host-contact-icon">
                    <Mail aria-hidden />
                  </span>
                  <span className="sl-host-contact-text">
                    <span className="sl-host-contact-label">Email host</span>
                    <span className="sl-host-contact-value">{host.email}</span>
                  </span>
                </a>
              )}
              {showAddress && (
                <a
                  className="sl-host-contact-item sl-host-contact-item--address"
                  href={
                    propertyAddress
                      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(propertyAddress)}`
                      : "#"
                  }
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <span className="sl-host-contact-icon">
                    <MapPin aria-hidden />
                  </span>
                  <span className="sl-host-contact-text">
                    <span className="sl-host-contact-label">Property</span>
                    <span className="sl-host-contact-value">{propertyAddress}</span>
                  </span>
                </a>
              )}
            </div>
          </section>
        )}

        {showSocial && (
          <section
            className="sl-host-section"
            {...editorInspectAttributes(
              { kind: "featured", view: "host", focus: "contact" },
              "Edit host links"
            )}
          >
            <h3 className="sl-host-section-title">
              <Share2 aria-hidden />
              <span>Connect</span>
            </h3>
            <div className="sl-host-socials">
              {socials.map((s, i) => {
                const meta = SOCIAL_META[s.platform] ?? SOCIAL_META.other;
                const SocialIcon = meta.Icon;
                return (
                  <a
                    key={`${s.platform}-${i}`}
                    href={normalizeUrl(s.url, s.platform)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="sl-host-social"
                    style={
                      {
                        "--sl-social-color": meta.color,
                      } as React.CSSProperties
                    }
                  >
                    <span className="sl-host-social-icon">
                      {s.icon ? (
                        <HostIcon value={s.icon} fallbackIconifyId={null} />
                      ) : (
                        <SocialIcon aria-hidden />
                      )}
                    </span>
                    <span className="sl-host-social-label">
                      {s.label || meta.label}
                    </span>
                  </a>
                );
              })}
            </div>
          </section>
        )}

        {!hasContact && !showSocial && !showBio && (
          <div className="sl-placeholder">
            <User aria-hidden />
            <div>Host details coming soon.</div>
          </div>
        )}
      </div>
      {bottomSlot}
    </div>
  );
}
