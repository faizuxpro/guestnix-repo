"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  CreditCard,
  KeyRound,
  Sparkles,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AiSettingsTab } from "./AiSettingsTab";
import { BillingSettingsTab } from "./BillingSettingsTab";
import { NotificationsSettingsTab } from "./NotificationsSettingsTab";
import { ProfileSettingsTab } from "./ProfileSettingsTab";
import { SecuritySettingsTab } from "./SecuritySettingsTab";
import type {
  AiSettingsData,
  BillingSettingsData,
  ProfileSettingsData,
  SettingsTabValue,
} from "./types";

const SETTINGS_TABS: readonly SettingsTabValue[] = [
  "profile",
  "security",
  "notifications",
  "ai",
  "billing",
];

type Accent = {
  bg: string;
  color: string;
};

type NavItem = {
  id: SettingsTabValue;
  label: string;
  icon: ElementType;
  accent: Accent;
  kicker: string;
};

const ACCENTS: Record<SettingsTabValue, Accent> = {
  profile: { bg: "#EEF4FF", color: "#4D7CFF" },
  security: { bg: "#ECFFF5", color: "#1FBF8F" },
  notifications: { bg: "#FFF8E8", color: "#FFB020" },
  ai: { bg: "#F3F0FF", color: "#7C5CFF" },
  billing: { bg: "#F6F1EA", color: "#B07A4A" },
};

const SETTINGS_ITEMS = [
  {
    id: "profile",
    label: "Profile",
    icon: UserRound,
    accent: ACCENTS.profile,
  },
  {
    id: "security",
    label: "Security",
    icon: KeyRound,
    accent: ACCENTS.security,
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    accent: ACCENTS.notifications,
  },
  {
    id: "ai",
    label: "AI Concierge",
    icon: Sparkles,
    accent: ACCENTS.ai,
  },
  {
    id: "billing",
    label: "Billing",
    icon: CreditCard,
    accent: ACCENTS.billing,
  },
] satisfies Array<{
  id: SettingsTabValue;
  label: string;
  icon: ElementType;
  accent: Accent;
}>;

function normalizeTab(value: string | null): SettingsTabValue {
  return SETTINGS_TABS.includes(value as SettingsTabValue)
    ? (value as SettingsTabValue)
    : "profile";
}

function SectionShell({
  id,
  icon,
  title,
  kicker,
  accent,
  children,
}: {
  id: SettingsTabValue;
  icon: ReactNode;
  title: string;
  kicker: string;
  accent: Accent;
  children: ReactNode;
}) {
  const style = {
    "--section-bg": accent.bg,
    "--section-color": accent.color,
    borderColor: `${accent.color}33`,
    boxShadow: `0 18px 42px ${accent.color}10`,
  } as CSSProperties;

  return (
    <section
      id={id}
      data-dashboard-settings-section
      className="scroll-mt-24 overflow-hidden rounded-lg border bg-background"
      style={style}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-[linear-gradient(90deg,var(--section-bg),transparent_72%)] px-4 py-3 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-[var(--section-color)] shadow-sm ring-1 ring-black/5">
            {icon}
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-tight">{title}</h2>
            <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
              {kicker}
            </p>
          </div>
        </div>
      </div>
      <div className="p-4 md:p-5">
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

export function SettingsTabs({
  profile,
  ai,
  billing,
}: {
  profile: ProfileSettingsData;
  ai: AiSettingsData;
  billing: BillingSettingsData;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedTab = normalizeTab(searchParams.get("tab"));
  const [activeSection, setActiveSection] =
    useState<SettingsTabValue>(requestedTab);
  const [hoveredSection, setHoveredSection] =
    useState<SettingsTabValue | null>(null);

  const navItems = useMemo<NavItem[]>(
    () =>
      SETTINGS_ITEMS.map((item) => {
        if (item.id === "profile") {
          return { ...item, kicker: profile.email || "Account identity" };
        }
        if (item.id === "security") {
          return { ...item, kicker: "Password reset" };
        }
        if (item.id === "notifications") {
          return { ...item, kicker: "Browser alerts" };
        }
        if (item.id === "ai") {
          return {
            ...item,
            kicker:
              ai.cap === null
                ? `${ai.used} used / unlimited`
                : `${ai.used} used / ${ai.cap} monthly`,
          };
        }
        return {
          ...item,
          kicker: billing.currentPlan
            ? `${billing.currentPlan} / ${billing.status}`
            : billing.status,
        };
      }),
    [ai.cap, ai.used, billing.currentPlan, billing.status, profile.email]
  );
  const visualSection = hoveredSection ?? activeSection;

  useEffect(() => {
    const sections = navItems
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => section !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) {
          setActiveSection(visible.target.id as SettingsTabValue);
        }
      },
      {
        rootMargin: "-22% 0px -58% 0px",
        threshold: [0.08, 0.25, 0.55],
      }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [navItems]);

  useEffect(() => {
    const rawTab = searchParams.get("tab");
    if (!rawTab) return;

    const nextTab = normalizeTab(rawTab);
    const timer = window.setTimeout(() => {
      document.getElementById(nextTab)?.scrollIntoView({
        block: "start",
      });
      setActiveSection(nextTab);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [searchParams]);

  function goToSection(section: SettingsTabValue) {
    setActiveSection(section);

    const params = new URLSearchParams(searchParams.toString());

    if (section === "profile") {
      params.delete("tab");
    } else {
      params.set("tab", section);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });

    document.getElementById(section)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-4 border-y bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
        <div className="flex gap-2 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = visualSection === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => goToSection(item.id)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition-colors",
                  active
                    ? "border-transparent"
                    : "border-border bg-background text-muted-foreground"
                )}
                style={
                  active
                    ? ({
                        backgroundColor: item.accent.bg,
                        color: item.accent.color,
                      } as CSSProperties)
                    : undefined
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[190px_minmax(0,1fr)]">
        <nav className="hidden lg:block">
          <div className="sticky top-6 rounded-lg border bg-background p-2 shadow-sm">
            <div className="mb-2 rounded-md bg-muted/55 px-3 py-2 text-[11px] font-semibold uppercase text-muted-foreground">
              Settings
            </div>
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                const tracked = visualSection === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => setHoveredSection(item.id)}
                    onMouseLeave={() => setHoveredSection(null)}
                    onFocus={() => setHoveredSection(item.id)}
                    onBlur={() => setHoveredSection(null)}
                    onClick={() => goToSection(item.id)}
                    className={cn(
                      "group relative flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium transition-all",
                      active
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    style={
                      tracked
                        ? ({
                            backgroundColor: item.accent.bg,
                            color: item.accent.color,
                          } as CSSProperties)
                        : undefined
                    }
                  >
                    <span
                      className={cn(
                        "absolute inset-y-1 left-0 w-0.5 rounded-full opacity-0 transition-opacity",
                        tracked && "opacity-100"
                      )}
                      style={{ backgroundColor: item.accent.color }}
                    />
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-md transition-colors"
                      style={
                        tracked
                          ? {
                              backgroundColor: "#ffffff",
                              color: item.accent.color,
                            }
                          : undefined
                      }
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        <div className="space-y-4">
          <SectionShell
            id="profile"
            icon={<UserRound className="h-4 w-4" />}
            title="Profile"
            kicker={navItems[0]?.kicker ?? "Account identity"}
            accent={ACCENTS.profile}
          >
            <ProfileSettingsTab initialProfile={profile} />
          </SectionShell>

          <SectionShell
            id="security"
            icon={<KeyRound className="h-4 w-4" />}
            title="Security"
            kicker="Password reset"
            accent={ACCENTS.security}
          >
            <SecuritySettingsTab email={profile.email} />
          </SectionShell>

          <SectionShell
            id="notifications"
            icon={<Bell className="h-4 w-4" />}
            title="Notifications"
            kicker="Browser alerts"
            accent={ACCENTS.notifications}
          >
            <NotificationsSettingsTab />
          </SectionShell>

          <SectionShell
            id="ai"
            icon={<Sparkles className="h-4 w-4" />}
            title="AI Concierge"
            kicker={
              ai.cap === null
                ? `${ai.used} used / unlimited`
                : `${ai.used} used / ${ai.cap} monthly`
            }
            accent={ACCENTS.ai}
          >
            <AiSettingsTab initialSettings={ai} />
          </SectionShell>

          <SectionShell
            id="billing"
            icon={<CreditCard className="h-4 w-4" />}
            title="Billing"
            kicker={
              billing.currentPlan
                ? `${billing.currentPlan} / ${billing.status}`
                : billing.status
            }
            accent={ACCENTS.billing}
          >
            <BillingSettingsTab billing={billing} />
          </SectionShell>
        </div>
      </div>
    </div>
  );
}
