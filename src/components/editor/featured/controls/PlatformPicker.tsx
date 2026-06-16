"use client";

import { useState, type ComponentType } from "react";
import { Icon } from "@iconify/react";
import {
  ChevronDown,
  Globe,
  Link as LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { HostSocialPlatform } from "@/types/blocks";

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

const FacebookIcon: IconComponent = (props) => <Icon icon="ph:facebook-logo-fill" {...props} />;
const InstagramIcon: IconComponent = (props) => <Icon icon="ph:instagram-logo-fill" {...props} />;
const TwitterIcon: IconComponent = (props) => <Icon icon="ph:x-logo-fill" {...props} />;
const YoutubeIcon: IconComponent = (props) => <Icon icon="ph:youtube-logo-fill" {...props} />;
const LinkedinIcon: IconComponent = (props) => <Icon icon="ph:linkedin-logo-fill" {...props} />;
const WhatsappIcon: IconComponent = (props) => <Icon icon="ph:whatsapp-logo-fill" {...props} />;
const TiktokIcon: IconComponent = (props) => <Icon icon="ph:tiktok-logo-fill" {...props} />;

type PlatformMeta = {
  value: HostSocialPlatform;
  label: string;
  Icon: IconComponent;
  hue: string;
  placeholder: string;
};

export const PLATFORMS: PlatformMeta[] = [
  {
    value: "website",
    label: "Website",
    Icon: Globe,
    hue: "#0f766e",
    placeholder: "https://your-site.com",
  },
  {
    value: "airbnb",
    label: "Airbnb",
    Icon: LinkIcon,
    hue: "#FF5A5F",
    placeholder: "https://airbnb.com/users/show/…",
  },
  {
    value: "facebook",
    label: "Facebook",
    Icon: FacebookIcon,
    hue: "#1877F2",
    placeholder: "https://facebook.com/…",
  },
  {
    value: "instagram",
    label: "Instagram",
    Icon: InstagramIcon,
    hue: "#E1306C",
    placeholder: "https://instagram.com/…",
  },
  {
    value: "twitter",
    label: "X / Twitter",
    Icon: TwitterIcon,
    hue: "#0f172a",
    placeholder: "https://x.com/…",
  },
  {
    value: "whatsapp",
    label: "WhatsApp",
    Icon: WhatsappIcon,
    hue: "#25D366",
    placeholder: "+1 555 123 4567 or wa.me link",
  },
  {
    value: "youtube",
    label: "YouTube",
    Icon: YoutubeIcon,
    hue: "#FF0000",
    placeholder: "https://youtube.com/@…",
  },
  {
    value: "tiktok",
    label: "TikTok",
    Icon: TiktokIcon,
    hue: "#0f172a",
    placeholder: "https://tiktok.com/@…",
  },
  {
    value: "linkedin",
    label: "LinkedIn",
    Icon: LinkedinIcon,
    hue: "#0A66C2",
    placeholder: "https://linkedin.com/in/…",
  },
  {
    value: "other",
    label: "Other",
    Icon: LinkIcon,
    hue: "#64748b",
    placeholder: "https://…",
  },
];

export function getPlatformMeta(platform: HostSocialPlatform): PlatformMeta {
  return PLATFORMS.find((p) => p.value === platform) ?? PLATFORMS[PLATFORMS.length - 1];
}

type Props = {
  value: HostSocialPlatform;
  onChange: (next: HostSocialPlatform) => void;
  /**
   * When true (default), starts collapsed showing only the selected platform
   * plus a "Change" button. The grid expands when the user clicks change.
   */
  collapsible?: boolean;
  /**
   * Compact collapsed view — drops the colored brand tile and renders a
   * single text row. Use inside contexts that already show the tile elsewhere
   * (e.g. the social-link card header) to avoid icon repetition.
   */
  compact?: boolean;
};

export function PlatformPicker({
  value,
  onChange,
  collapsible = true,
  compact = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const current = getPlatformMeta(value);

  if (collapsible && !expanded) {
    if (compact) {
      return (
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
              Platform
            </span>
            <span className="truncate text-[12px] font-semibold">
              {current.label}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background px-2 py-1 text-[10.5px] font-medium text-muted-foreground transition-colors hover:border-primary/45 hover:bg-primary/5 hover:text-primary"
          >
            Change
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white shadow-sm"
          style={{ backgroundColor: current.hue }}
        >
          <current.Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground leading-none">
            Platform
          </p>
          <p className="mt-0.5 text-[12px] font-semibold leading-none">
            {current.label}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background px-2 py-1 text-[10.5px] font-medium text-muted-foreground transition-colors hover:border-primary/45 hover:bg-primary/5 hover:text-primary"
        >
          Change
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          Platform
        </p>
        {collapsible ? (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-[10.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Done
          </button>
        ) : null}
      </div>
      <PlatformGrid
        current={value}
        onSelect={(p) => {
          onChange(p);
          if (collapsible) setExpanded(false);
        }}
      />
    </div>
  );
}

/**
 * Just the 5×N grid of platform tiles — no header, no Done button. Use
 * inside popovers (social-link platform swap, add-link picker) where the
 * wrapping UI already provides context.
 */
export function PlatformGrid({
  current,
  onSelect,
}: {
  current: HostSocialPlatform | null;
  onSelect: (next: HostSocialPlatform) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {PLATFORMS.map((p) => {
        const selected = current === p.value;
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => onSelect(p.value)}
            aria-label={p.label}
            title={p.label}
            className={cn(
              "group flex aspect-square flex-col items-center justify-center gap-0.5 rounded-md border text-[9px] font-medium transition-all",
              selected
                ? "border-transparent text-white shadow-md"
                : "border-border/70 text-muted-foreground hover:scale-[1.03] hover:border-foreground/40 hover:text-foreground"
            )}
            style={
              selected
                ? {
                    backgroundColor: p.hue,
                    boxShadow: `0 0 0 2px ${hexWithAlpha(p.hue, 0.45)}, 0 4px 10px -4px ${hexWithAlpha(p.hue, 0.6)}`,
                  }
                : undefined
            }
          >
            <p.Icon className="h-4 w-4" aria-hidden />
            <span className="truncate leading-none">{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function hexWithAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
