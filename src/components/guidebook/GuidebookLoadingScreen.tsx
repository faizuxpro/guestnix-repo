import type { CSSProperties } from "react";
import { RuntimeFontLoader } from "@/components/fonts/RuntimeFontLoader";
import { cn } from "@/lib/utils";
import type { GuidebookLoaderSettings } from "@/lib/guidebook-loader-settings";
import { BookOneLoaderImage } from "./BookOneLoaderImage";
import styles from "./GuidebookLoadingScreen.module.css";

function getBookOneLoaderSrc(color: string) {
  return `/api/loaders/book-1?color=${encodeURIComponent(color)}`;
}

function quoteFontStack(family: string, fallback: "serif" | "sans-serif") {
  const safeFamily = family.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${safeFamily}", ${fallback}`;
}

type Props = {
  settings: GuidebookLoaderSettings;
  preview?: boolean;
  className?: string;
};

export function GuidebookLoadingScreen({
  settings,
  preview = false,
  className,
}: Props) {
  const useCustomAsset =
    settings.variant === "custom" && Boolean(settings.custom_asset_url);
  const title = settings.title.trim();
  const subtitle = settings.subtitle.trim();
  const hasCopy = Boolean(title || subtitle);
  const promoteSubtitle = Boolean(!title && subtitle);
  const style = {
    "--gn-loader-bg": settings.background_color,
    "--gn-loader-fg": settings.foreground_color,
    "--gn-loader-accent": settings.accent_color,
    "--gn-loader-size": `${settings.animation_size}px`,
    "--gn-loader-glow-opacity": `${settings.glow_opacity / 100}`,
    "--gn-loader-heading-font": quoteFontStack(settings.heading_font, "serif"),
    "--gn-loader-body-font": quoteFontStack(settings.body_font, "sans-serif"),
  } as CSSProperties;

  return (
    <div
      className={cn(styles.screen, preview && styles.preview, className)}
      style={style}
      role="status"
      aria-live="polite"
      aria-label="Loading guidebook"
    >
      <RuntimeFontLoader
        id={preview ? "guidebook-loader-preview" : "guidebook-loader"}
        fontFamilies={hasCopy ? [settings.heading_font, settings.body_font] : []}
        customFonts={hasCopy ? settings.custom_fonts : []}
      />
      <div className={styles.inner}>
        {settings.show_logo && settings.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.logo} src={settings.logo_url} alt="" />
        ) : null}

        <div className={styles.animation} aria-hidden="true">
          {useCustomAsset ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.customAsset}
              src={settings.custom_asset_url ?? ""}
              alt=""
            />
          ) : settings.variant === "spinner" ? (
            <div className={styles.spinner} />
          ) : settings.variant === "dots" ? (
            <div className={styles.dots}>
              <span />
              <span />
              <span />
            </div>
          ) : (
            <BookOneLoaderImage
              className={styles.presetAsset}
              src={getBookOneLoaderSrc(settings.accent_color)}
            />
          )}
        </div>

        {hasCopy ? (
          <div className={styles.copy}>
            {title ? <p className={styles.title}>{title}</p> : null}
            {subtitle ? (
              <p
                className={cn(
                  styles.subtitle,
                  promoteSubtitle && styles.subtitlePromoted
                )}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
