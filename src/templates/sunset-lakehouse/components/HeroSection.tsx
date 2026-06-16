"use client";

import { useEffect, useRef } from "react";
import { LogIn, LogOut, Mail, MapPin, Phone } from "lucide-react";
import {
  buildPropertyMapHref,
  formatFullAddress,
  type HeroBackgroundPattern,
  type HeroHomeConfig,
  type HeroHostFields,
  type HeroPropertyFields,
  type HeroSplashBlock,
} from "@/lib/hero-data";
import { editorInspectAttributes, type HomeInspectFocus } from "@/lib/editor-inspect";
import { HostIcon } from "@/components/icons/HostIcon";
import { LanguagePicker } from "./LanguagePicker";

type BrandSlice = {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  brand_gradient?: { from?: string; to?: string; angle?: number } | null;
  background_pattern?: HeroBackgroundPattern;
};

type Props = {
  property: HeroPropertyFields;
  host: HeroHostFields;
  config: HeroHomeConfig;
  branding?: BrandSlice;
  fallbackTitle?: string;
  dismissed: boolean;
  onDismiss: () => void;
  showLanguagePicker?: boolean;
  highlighted?: boolean;
};

const DEFAULT_BG =
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1600&q=80";

// Pixels of accumulated scroll/swipe before we dismiss.
const DISMISS_THRESHOLD = 60;

function hexToRgbTriplet(color: string): string {
  const trimmed = color.trim();
  const short = /^#([0-9a-f]{3})$/i.exec(trimmed);
  if (short) {
    const [r, g, b] = short[1].split("");
    return [
      parseInt(`${r}${r}`, 16),
      parseInt(`${g}${g}`, 16),
      parseInt(`${b}${b}`, 16),
    ].join(", ");
  }

  const full = /^#([0-9a-f]{6})$/i.exec(trimmed);
  if (full) {
    return [
      parseInt(full[1].slice(0, 2), 16),
      parseInt(full[1].slice(2, 4), 16),
      parseInt(full[1].slice(4, 6), 16),
    ].join(", ");
  }

  return "0, 0, 0";
}

function quoteFontFamily(family: string) {
  const trimmed = family.trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("var(") ||
    trimmed.includes(",") ||
    trimmed.startsWith("\"") ||
    trimmed.startsWith("'")
  ) {
    return trimmed;
  }
  return `"${trimmed.replaceAll("\"", "\\\"")}", var(--secondary-font)`;
}

function alignItemsFor(value: HeroHomeConfig["overlay_container"]["align"]) {
  if (value === "left") return "flex-start";
  if (value === "right") return "flex-end";
  return "center";
}

function justifyFor(value: HeroHomeConfig["overlay_container"]["align"]) {
  if (value === "left") return "flex-start";
  if (value === "right") return "flex-end";
  return "center";
}

function effectiveSplashBlockStyle(
  block: HeroSplashBlock,
  blocks: HeroSplashBlock[]
): HeroSplashBlock["style"] {
  if (block.type !== "times") {
    return block.style;
  }

  const contact = blocks.find((item) => item.type === "contact");
  if (!contact) return block.style;

  if (!block.style.inherit_contact_style) {
    return {
      ...block.style,
      max_width: contact.style.max_width,
    };
  }

  return {
    ...block.style,
    font_family: contact.style.font_family,
    font_size: contact.style.font_size,
    font_weight: contact.style.font_weight,
    line_height: contact.style.line_height,
    padding_top: contact.style.padding_top,
    padding_bottom: contact.style.padding_bottom,
    max_width: contact.style.max_width,
    color_enabled: contact.style.color_enabled,
    color: contact.style.color,
    variant: contact.style.variant,
    icon_size: contact.style.icon_size,
    icon_align: contact.style.icon_align,
    icon_style: contact.style.icon_style,
    icon_animation: contact.style.icon_animation,
    card_radius: contact.style.card_radius,
    card_opacity: contact.style.card_opacity,
    card_border_opacity: contact.style.card_border_opacity,
    inherit_contact_style: true,
  };
}

function splashBlockStyle(
  blockStyle: HeroSplashBlock["style"]
): React.CSSProperties & Record<string, string> {
  const style: React.CSSProperties & Record<string, string> = {
    "--sl-splash-font-size": `${blockStyle.font_size}px`,
    "--sl-splash-font-weight": String(blockStyle.font_weight),
    "--sl-splash-line-height": String(blockStyle.line_height),
    "--sl-splash-padding-top": `${blockStyle.padding_top}px`,
    "--sl-splash-padding-bottom": `${blockStyle.padding_bottom}px`,
    "--sl-splash-max-width": `${blockStyle.max_width}px`,
    "--sl-splash-icon-size": `${blockStyle.icon_size}px`,
    "--sl-splash-card-radius": `${blockStyle.card_radius}px`,
    "--sl-splash-card-bg-opacity": String(blockStyle.card_opacity),
    "--sl-splash-card-border-opacity": String(blockStyle.card_border_opacity),
  };
  if (blockStyle.color_enabled) {
    style["--sl-splash-color"] = blockStyle.color;
  }
  const fontFamily = quoteFontFamily(blockStyle.font_family);
  if (fontFamily) {
    style["--sl-splash-font-family"] = fontFamily;
  }
  return style;
}

export function HeroSection({
  property,
  host,
  config,
  branding,
  fallbackTitle = "Your Stay",
  dismissed,
  onDismiss,
  showLanguagePicker = false,
  highlighted = false,
}: Props) {
  const displayTitle = property.name.trim() || fallbackTitle;
  const displaySubtitle = property.tagline.trim();
  const logoUrl = property.logo_url;
  const fullAddress = formatFullAddress(property);
  const mapHref = buildPropertyMapHref(property);
  const hostLabel = config.host_label?.trim() ?? "Hosted by";

  const show = config.show;
  const showSubtitle = show.subtitle && Boolean(displaySubtitle);
  const showLogo = show.logo;
  const showHostName = show.host_name && Boolean(host.name);
  const showPhone = show.phone && Boolean(host.phone);
  const showEmail = show.email && Boolean(host.email);
  const showAddress = show.address && Boolean(fullAddress);
  const checkinLabel = config.times?.checkin_label?.trim() || "Check-in";
  const checkinTime = config.times?.checkin_time?.trim() || "4:00 PM";
  const checkoutLabel = config.times?.checkout_label?.trim() || "Check-out";
  const checkoutTime = config.times?.checkout_time?.trim() || "11:00 AM";
  const showTimes = show.times;
  const splashBlocks = config.splash_blocks.filter((block) => block.visible);

  const sectionRef = useRef<HTMLElement | null>(null);
  const touchStartY = useRef<number | null>(null);
  const scrollAccum = useRef(0);
  const dismissedRef = useRef(dismissed);

  useEffect(() => {
    dismissedRef.current = dismissed;
  }, [dismissed]);

  // Swipe / scroll-up to dismiss
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const fireDismiss = () => {
      if (dismissedRef.current) return;
      onDismiss();
    };

    const onWheel = (e: WheelEvent) => {
      if (dismissedRef.current) return;
      if (e.deltaY > 0) {
        scrollAccum.current += e.deltaY;
        if (scrollAccum.current >= DISMISS_THRESHOLD) {
          scrollAccum.current = 0;
          fireDismiss();
        }
        e.preventDefault();
      } else if (e.deltaY < 0) {
        scrollAccum.current = 0;
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0]?.clientY ?? null;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (dismissedRef.current || touchStartY.current == null) return;
      const y = e.touches[0]?.clientY ?? touchStartY.current;
      const delta = touchStartY.current - y;
      if (delta > DISMISS_THRESHOLD) {
        touchStartY.current = null;
        fireDismiss();
      }
    };

    const onTouchEnd = () => {
      touchStartY.current = null;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [onDismiss]);

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const bg = config.background;
  const useBrand = bg.use_brand;
  const brandPrimary = branding?.primary_color;
  const brandSecondary = branding?.secondary_color;
  const brandGradient = branding?.brand_gradient;
  const brandPattern = branding?.background_pattern;

  // ── Resolve effective splash visuals ────────────────────────────────
  // When use_brand is on, color/gradient/pattern come from the guidebook's
  // brand settings instead of the custom fields on this hero config.
  const effectiveColor =
    useBrand && brandPrimary ? brandPrimary : bg.color;

  const effectiveGradientCss = (() => {
    if (useBrand) {
      if (
        brandGradient &&
        brandGradient.from &&
        brandGradient.to &&
        typeof brandGradient.angle === "number"
      ) {
        return `linear-gradient(${brandGradient.angle}deg, ${brandGradient.from}, ${brandGradient.to})`;
      }
      const from = brandPrimary ?? bg.gradient_from;
      const to = brandSecondary ?? bg.gradient_to;
      return `linear-gradient(135deg, ${from}, ${to})`;
    }
    return `linear-gradient(${bg.gradient_angle}deg, ${bg.gradient_from}, ${bg.gradient_to})`;
  })();

  const effectivePattern: HeroBackgroundPattern =
    useBrand && brandPattern ? brandPattern : bg.pattern;

  const presetClass = `sl-hero--preset-${config.preset}`;
  const splashModeClass =
    config.splash_blocks.length > 0 ? "sl-hero--blocks" : "sl-hero--legacy";
  const glassShadow = config.glass_shadow;
  const contentShadowEnabled =
    (config.preset === "card" || config.preset === "minimal") &&
    glassShadow.enabled;
  const solidBackgroundColor = config.solid_background_color;
  const solidBackgroundCss = solidBackgroundColor.enabled
    ? `rgb(${hexToRgbTriplet(solidBackgroundColor.color)})`
    : "var(--brand-surface, var(--primary))";
  const buttonStyleClass = `sl-hero-start--${config.button_style}`;
  // Shimmer reads poorly on the bare halo/compass circles - fall back to pulse.
  const effectiveAnim =
    config.button_animation === "shimmer" &&
    (config.button_style === "halo" || config.button_style === "compass")
      ? "pulse"
      : config.button_animation;
  const buttonAnimClass = `sl-hero-start--anim-${effectiveAnim}`;
  const buttonSpeedClass = `sl-hero-start--speed-${config.button_speed}`;
  const buttonClass = `sl-hero-start ${buttonStyleClass} ${buttonAnimClass} ${buttonSpeedClass}`;
  const arrowStyleClass = `sl-hero-start__arrows--${config.button_arrow_style}`;
  const buttonLabel = config.button_label || "Enter Guide";
  // Shape only applies when there's an actual image to crop; the fallback
  // glyph stays as a plain natural-sized character.
  const logoShape = config.logo.shape ?? "circle";
  const logoClass = logoUrl
    ? `sl-hero-logo sl-hero-logo--shape-${logoShape}`
    : "sl-hero-logo sl-hero-logo--shape-natural";
  const typeClass = `sl-hero--bg-${bg.type}`;

  const bgImageUrl =
    bg.type === "image" ? property.cover_image_url || DEFAULT_BG : null;
  const heroStyle: React.CSSProperties & Record<string, string> = {
    "--sl-hero-overlay-opacity": String(bg.overlay_opacity),
    "--sl-hero-bg-x": `${bg.position.x}%`,
    "--sl-hero-bg-y": `${bg.position.y}%`,
    "--sl-hero-bg-blur": `${bg.blur}px`,
    "--sl-hero-logo-size": `${config.logo.size}px`,
    "--sl-hero-logo-radius": `${config.logo.corner_radius}%`,
    "--sl-hero-logo-fit": config.logo.fit ?? "cover",
    "--sl-hero-container-width": `${config.overlay_container.width}px`,
    "--sl-hero-container-min-height": `${config.overlay_container.min_height}px`,
    "--sl-hero-container-max-height": `${config.overlay_container.max_height}px`,
    "--sl-hero-container-padding-x": `${config.overlay_container.padding_x}px`,
    "--sl-hero-container-padding-y": `${config.overlay_container.padding_y}px`,
    "--sl-hero-container-gap": `${config.overlay_container.gap}px`,
    "--sl-hero-container-text-align": config.overlay_container.align,
    "--sl-hero-container-align-items": alignItemsFor(config.overlay_container.align),
    "--sl-hero-container-justify": justifyFor(config.overlay_container.align),
    "--sl-hero-solid-bg": solidBackgroundCss,
    "--sl-hero-solid-bg-opacity": String(config.solid_background_opacity),
    "--sl-hero-glass-blur": `${config.glass_blur}px`,
    "--sl-hero-content-shadow-color-rgb": hexToRgbTriplet(glassShadow.color),
    "--sl-hero-content-shadow-opacity": String(glassShadow.opacity),
    "--sl-hero-content-shadow-blur": `${glassShadow.blur}px`,
    "--sl-hero-content-shadow-x": `${glassShadow.offset_x}px`,
    "--sl-hero-content-shadow-y": `${glassShadow.offset_y}px`,
  };
  if (bgImageUrl) {
    heroStyle["--sl-hero-bg-image"] = `url("${bgImageUrl}")`;
  }
  if (bg.type === "color") {
    heroStyle.backgroundColor = effectiveColor;
  }
  if (bg.type === "gradient") {
    heroStyle.backgroundImage = effectiveGradientCss;
  }

  return (
    <section
      ref={sectionRef}
      className={`sl-hero ${presetClass} ${typeClass} ${splashModeClass}${
        dismissed ? " sl-hero--dismissed" : ""
      }${contentShadowEnabled ? " sl-hero--glass-shadow-on" : ""}`}
      style={heroStyle}
      onClick={() => {
        if (!dismissed) onDismiss();
      }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !dismissed) {
          e.preventDefault();
          onDismiss();
        }
      }}
      role="button"
      tabIndex={dismissed ? -1 : 0}
      aria-label="Welcome - tap, scroll, or swipe up to enter guide"
      {...editorInspectAttributes({ kind: "home", focus: "background" })}
    >
      <div className="sl-hero-veil" />
      <div className="sl-hero-grain" />
      {effectivePattern !== "none" ? (
        <div className={`sl-hero-pattern sl-hero-pattern--${effectivePattern}`} />
      ) : null}
      {showLanguagePicker ? (
        <div
          className="sl-hero-lang"
          onClick={stop}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <LanguagePicker variant="splash" />
        </div>
      ) : null}

      <div
        className={`sl-hero-inner${highlighted ? " sl-search-highlight" : ""}`}
        data-guidebook-search-target="home"
        {...editorInspectAttributes(
          { kind: "home", focus: "container" },
          "Edit splash layout"
        )}
      >
        {config.splash_blocks.length > 0 ? (
          <>
            {splashBlocks.map((block) =>
              renderSplashBlock({
                block,
                blocks: config.splash_blocks,
                logoUrl,
                logoClass,
                displayTitle,
                displaySubtitle,
                hostName: host.name,
                hostLabel,
                showPhone,
                showEmail,
                showAddress,
                hostPhone: host.phone,
                hostEmail: host.email,
                fullAddress,
                mapHref,
                checkinLabel,
                checkinTime,
                checkoutLabel,
                checkoutTime,
                buttonClass,
                buttonLabel,
                buttonStyle: config.button_style,
                buttonArrowStyle: config.button_arrow_style,
                arrowStyleClass,
                stop,
                onDismiss,
              })
            )}
          </>
        ) : (
          <>
        {showLogo ? (
          logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className={logoClass}
              {...editorInspectAttributes({ kind: "home", focus: "logo" })}
            />
          ) : (
            <span
              className={logoClass}
              aria-hidden
              {...editorInspectAttributes({ kind: "home", focus: "logo" })}
              style={{
                fontFamily: "var(--primary-font)",
                fontSize: "calc(3rem * var(--primary-font-scale, 1))",
                color: "var(--accent)",
                lineHeight: 1,
                display: "inline-block",
                height: "auto",
              }}
            >
              *
            </span>
          )
        ) : null}

        <h1
          className="sl-hero-title"
          {...editorInspectAttributes({ kind: "home", focus: "title" })}
        >
          {displayTitle}
        </h1>
        {showSubtitle ? (
          <p
            className="sl-hero-subtitle"
            {...editorInspectAttributes({ kind: "home", focus: "tagline" })}
          >
            {displaySubtitle}
          </p>
        ) : null}
        {showHostName ? (
          <p
            className="sl-hero-host"
            {...editorInspectAttributes({ kind: "home", focus: "host" })}
          >
            {hostLabel ? `${hostLabel} ${host.name}` : host.name}
          </p>
        ) : null}

        {(showPhone || showEmail || showAddress) && (
          <div
            className={`sl-hero-meta${
              showTimes ? " sl-hero-meta--before-times" : ""
            }`}
            {...editorInspectAttributes({ kind: "home", focus: "contact" })}
          >
            {showPhone && (
              <a
                className="sl-hero-contact"
                href={`tel:${host.phone}`}
                onClick={stop}
              >
                <Phone aria-hidden />
                <span>{host.phone}</span>
              </a>
            )}
            {showEmail && (
              <a
                className="sl-hero-contact"
                href={`mailto:${host.email}`}
                onClick={stop}
              >
                <Mail aria-hidden />
                <span>{host.email}</span>
              </a>
            )}
            {showAddress && (
              <a
                className="sl-hero-contact"
                href={mapHref ?? "#"}
                target="_blank"
                rel="noreferrer noopener"
                onClick={stop}
              >
                <MapPin aria-hidden />
                <span>{fullAddress}</span>
              </a>
            )}
          </div>
        )}

        {showTimes ? (
          <div
            className="sl-hero-times"
            onClick={stop}
            {...editorInspectAttributes({ kind: "home", focus: "times" })}
          >
            <div className="sl-hero-time-card">
              <LogIn aria-hidden />
              <span className="sl-hero-time-copy">
                <span className="sl-hero-time-label">{checkinLabel}</span>
                <span className="sl-hero-time-value">{checkinTime}</span>
              </span>
            </div>
            <div className="sl-hero-time-card">
              <LogOut aria-hidden />
              <span className="sl-hero-time-copy">
                <span className="sl-hero-time-label">{checkoutLabel}</span>
                <span className="sl-hero-time-value">{checkoutTime}</span>
              </span>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          className={buttonClass}
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          aria-label={buttonLabel}
          {...editorInspectAttributes({ kind: "home", focus: "button" })}
        >
          {renderButtonBody(
            config.button_style,
            buttonLabel,
            arrowStyleClass,
            config.button_arrow_style,
          )}
        </button>
          </>
        )}
      </div>
    </section>
  );
}

type SplashBlockRenderInput = {
  block: HeroSplashBlock;
  blocks: HeroSplashBlock[];
  logoUrl: string | null;
  logoClass: string;
  displayTitle: string;
  displaySubtitle: string;
  hostName: string;
  hostLabel: string;
  showPhone: boolean;
  showEmail: boolean;
  showAddress: boolean;
  hostPhone: string;
  hostEmail: string;
  fullAddress: string;
  mapHref: string | null;
  checkinLabel: string;
  checkinTime: string;
  checkoutLabel: string;
  checkoutTime: string;
  buttonClass: string;
  buttonLabel: string;
  buttonStyle: HeroHomeConfig["button_style"];
  buttonArrowStyle: HeroHomeConfig["button_arrow_style"];
  arrowStyleClass: string;
  stop: (e: React.MouseEvent) => void;
  onDismiss: () => void;
};

function splashBlockInspectAttributes(type: HeroSplashBlock["type"]) {
  const focus: HomeInspectFocus | null =
    type === "logo"
      ? "logo"
      : type === "title"
      ? "title"
      : type === "tagline"
      ? "tagline"
      : type === "host"
      ? "host"
      : type === "contact"
      ? "contact"
      : type === "times"
      ? "times"
      : type === "button"
      ? "button"
      : null;

  return focus ? editorInspectAttributes({ kind: "home", focus }) : {};
}

function renderSplashBlock({
  block,
  blocks,
  logoUrl,
  logoClass,
  displayTitle,
  displaySubtitle,
  hostName,
  hostLabel,
  showPhone,
  showEmail,
  showAddress,
  hostPhone,
  hostEmail,
  fullAddress,
  mapHref,
  checkinLabel,
  checkinTime,
  checkoutLabel,
  checkoutTime,
  buttonClass,
  buttonLabel,
  buttonStyle,
  buttonArrowStyle,
  arrowStyleClass,
  stop,
  onDismiss,
}: SplashBlockRenderInput) {
  const blockStyle = effectiveSplashBlockStyle(block, blocks);
  const style = splashBlockStyle(blockStyle);
  const blockClass = `sl-hero-block sl-hero-block--${block.type}`;
  const inspectAttributes = splashBlockInspectAttributes(block.type);

  if (block.type === "logo") {
    return (
      <div
        key={block.type}
        className={blockClass}
        style={style}
        {...inspectAttributes}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className={logoClass} />
        ) : (
          <span
            className={`${logoClass} sl-hero-logo--fallback`}
            aria-hidden
          >
            *
          </span>
        )}
      </div>
    );
  }

  if (block.type === "title") {
    return (
      <h1
        key={block.type}
        className={`${blockClass} sl-hero-title`}
        style={style}
        {...inspectAttributes}
      >
        {displayTitle}
      </h1>
    );
  }

  if (block.type === "tagline") {
    if (!displaySubtitle) return null;
    return (
      <p
        key={block.type}
        className={`${blockClass} sl-hero-subtitle`}
        style={style}
        {...inspectAttributes}
      >
        {displaySubtitle}
      </p>
    );
  }

  if (block.type === "host") {
    if (!hostName) return null;
    return (
      <p key={block.type} className={`${blockClass} sl-hero-host`} style={style}>
        {hostLabel ? `${hostLabel} ${hostName}` : hostName}
      </p>
    );
  }

  if (block.type === "contact") {
    if (!(showPhone || showEmail || showAddress)) return null;
    return (
      <div
        key={block.type}
        className={`${blockClass} sl-hero-meta`}
        data-variant={blockStyle.variant}
        data-icon-align={blockStyle.icon_align}
        data-icon-style={blockStyle.icon_style}
        data-icon-animation={blockStyle.icon_animation}
        style={style}
        {...inspectAttributes}
      >
        {showPhone && (
          <a className="sl-hero-contact" href={`tel:${hostPhone}`} onClick={stop}>
            <HostIcon
              value={blockStyle.icon_phone}
              className="sl-hero-contact-icon"
              fallbackIconifyId="lucide:phone"
            />
            <span>{hostPhone}</span>
          </a>
        )}
        {showEmail && (
          <a className="sl-hero-contact" href={`mailto:${hostEmail}`} onClick={stop}>
            <HostIcon
              value={blockStyle.icon_email}
              className="sl-hero-contact-icon"
              fallbackIconifyId="lucide:mail"
            />
            <span>{hostEmail}</span>
          </a>
        )}
        {showAddress && (
          <a
            className="sl-hero-contact"
            href={mapHref ?? "#"}
            target="_blank"
            rel="noreferrer noopener"
            onClick={stop}
          >
            <HostIcon
              value={blockStyle.icon_address}
              className="sl-hero-contact-icon"
              fallbackIconifyId="lucide:map-pin"
            />
            <span>{fullAddress}</span>
          </a>
        )}
      </div>
    );
  }

  if (block.type === "times") {
    return (
      <div
        key={block.type}
        className={`${blockClass} sl-hero-times`}
        data-variant={blockStyle.variant}
        data-icon-align={blockStyle.icon_align}
        data-icon-style={blockStyle.icon_style}
        data-icon-animation={blockStyle.icon_animation}
        style={style}
        onClick={stop}
        {...inspectAttributes}
      >
        <div className="sl-hero-time-card">
          <HostIcon
            value={block.style.icon_checkin}
            className="sl-hero-time-icon"
            fallbackIconifyId="lucide:log-in"
          />
          <span className="sl-hero-time-copy">
            <span className="sl-hero-time-label">{checkinLabel}</span>
            <span className="sl-hero-time-value">{checkinTime}</span>
          </span>
        </div>
        <div className="sl-hero-time-card">
          <HostIcon
            value={block.style.icon_checkout}
            className="sl-hero-time-icon"
            fallbackIconifyId="lucide:log-out"
          />
          <span className="sl-hero-time-copy">
            <span className="sl-hero-time-label">{checkoutLabel}</span>
            <span className="sl-hero-time-value">{checkoutTime}</span>
          </span>
        </div>
      </div>
    );
  }

  if (block.type === "button") {
    return (
      <button
        key={block.type}
        type="button"
        className={`${blockClass} ${buttonClass}`}
        style={style}
        {...inspectAttributes}
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        aria-label={buttonLabel}
      >
        {renderButtonBody(
          buttonStyle,
          buttonLabel,
          arrowStyleClass,
          buttonArrowStyle
        )}
      </button>
    );
  }

  return null;
}

function renderButtonBody(
  style: HeroHomeConfig["button_style"],
  label: string,
  arrowClass: string,
  arrowStyle: HeroHomeConfig["button_arrow_style"],
) {
  switch (style) {
    case "halo":
      return (
        <span className="sl-hero-start__container">
          <span className="sl-hero-start__ring sl-hero-start__ring--1" aria-hidden />
          <span className="sl-hero-start__ring sl-hero-start__ring--2" aria-hidden />
          <span className="sl-hero-start__ring sl-hero-start__ring--3" aria-hidden />
          <span className="sl-hero-start__circle">{label}</span>
        </span>
      );

    case "compass":
      return (
        <span className="sl-hero-start__container">
          <span className="sl-hero-start__compass" aria-hidden>
            <span className="sl-hero-start__compass-arm sl-hero-start__compass-arm--n" />
            <span className="sl-hero-start__compass-arm sl-hero-start__compass-arm--e" />
            <span className="sl-hero-start__compass-arm sl-hero-start__compass-arm--s" />
            <span className="sl-hero-start__compass-arm sl-hero-start__compass-arm--w" />
          </span>
          <span className="sl-hero-start__circle">{label}</span>
        </span>
      );

    case "bar":
      return (
        <span className="sl-hero-start__bar">
          <span className="sl-hero-start__bar-label">{label}</span>
          <span className="sl-hero-start__bar-icon" aria-hidden />
        </span>
      );

    case "tower":
    default:
      return (
        <span className="sl-hero-start__container">
          <span className="sl-hero-start__bg" aria-hidden />
          <span className="sl-hero-start__circle">{label}</span>
          {arrowStyle !== "none" ? (
            <span className={`sl-hero-start__arrows ${arrowClass}`} aria-hidden>
              <span className="sl-hero-start__arrow" />
              <span className="sl-hero-start__arrow" />
            </span>
          ) : null}
        </span>
      );
  }
}
