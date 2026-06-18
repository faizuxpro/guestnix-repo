"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  Blocks,
  ChevronDown,
  FolderOpen,
  MapPinned,
  Menu,
  MessageSquareText,
  Printer,
  ShoppingBag,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { GradientButton } from "./ui/GradientButton";
import { BrandLockup } from "@/components/brand/BrandLockup";

const DEMO_URL = "/demo/sunset-template";

const PRIMARY_LINKS = [
  { href: "#features", label: "Features" },
  { href: DEMO_URL, label: "Live demo" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Resources" },
] as const;

const PRODUCT_ITEMS = [
  {
    title: "AI Concierge",
    body: "Answers guest questions from your own guidebook content, rules, and local recommendations.",
    href: "#features",
    badge: "24/7 replies",
    accent: "accent-teal",
    iconSrc: "/marketing/ai-bot-icon.svg",
  },
  {
    title: "Guidebook Builder",
    body: "Create polished mobile welcome guides with reusable blocks, branding, and sections.",
    href: "#features",
    badge: "No-code pages",
    accent: "accent-blue",
    icon: Blocks,
  },
  {
    title: "Assets Hub",
    body: "Save places, host details, media, templates, and reusable content across properties.",
    href: "#features",
    badge: "Reusable library",
    accent: "accent-violet",
    icon: FolderOpen,
  },
  {
    title: "Upsell Store",
    body: "Offer add-ons, services, payment methods, guest requests, and proof collection.",
    href: "/pricing",
    badge: "Revenue tools",
    accent: "accent-amber",
    icon: ShoppingBag,
  },
  {
    title: "Local Map",
    body: "Curate nearby restaurants, attractions, essentials, and custom host picks.",
    href: DEMO_URL,
    badge: "Guest-ready map",
    accent: "accent-coral",
    icon: MapPinned,
  },
  {
    title: "Print Guidebook",
    body: "Generate a clean print-ready backup for welcome tables, binders, and QR displays.",
    href: "#features",
    badge: "PDF backup",
    accent: "accent-gray",
    icon: Printer,
  },
  {
    title: "Host Inbox",
    body: "Keep guest chat sessions, host replies, and message context in one workspace.",
    href: "#features",
    badge: "Guest messaging",
    accent: "accent-pink",
    icon: MessageSquareText,
  },
  {
    title: "Insights Dashboard",
    body: "Track guide views, popular sections, guest questions, and account activity.",
    href: "/pricing",
    badge: "Usage signals",
    accent: "accent-caramel",
    icon: BarChart3,
  },
] satisfies Array<{
  title: string;
  body: string;
  href: string;
  badge: string;
  accent: string;
  icon?: LucideIcon;
  iconSrc?: string;
}>;

const SECONDARY_LINKS = [
  { href: "/blog", label: "Blog" },
  { href: "/pricing", label: "Compare plans" },
] as const;

export function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setProductOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const scrollY = window.scrollY;
    const { style } = document.body;
    const previousPosition = style.position;
    const previousTop = style.top;
    const previousWidth = style.width;
    const previousOverflowY = style.overflowY;

    style.position = "fixed";
    style.top = `-${scrollY}px`;
    style.width = "100%";
    style.overflowY = "hidden";

    return () => {
      style.position = previousPosition;
      style.top = previousTop;
      style.width = previousWidth;
      style.overflowY = previousOverflowY;
      window.scrollTo(0, scrollY);
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (mobileOpen || productOpen) {
      lastScrollYRef.current = window.scrollY;
      return;
    }

    let ticking = false;
    const minDelta = 8;
    const hideAfter = 96;

    const updateNavVisibility = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollYRef.current;

      if (Math.abs(delta) >= minDelta) {
        if (currentScrollY <= 24) {
          setNavHidden(false);
        } else {
          setNavHidden(delta > 0 && currentScrollY > hideAfter);
        }

        lastScrollYRef.current = currentScrollY;
      }

      ticking = false;
    };

    const onScroll = () => {
      if (ticking) {
        return;
      }

      ticking = true;
      window.requestAnimationFrame(updateNavVisibility);
    };

    lastScrollYRef.current = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, [mobileOpen, productOpen]);

  const toggleMobileMenu = () => {
    setMobileOpen((prev) => {
      const next = !prev;
      if (next) {
        setNavHidden(false);
        setProductOpen(false);
      }
      return next;
    });
  };

  const visibleNavHidden = navHidden && !mobileOpen && !productOpen;

  return (
    <nav
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        visibleNavHidden ? "-translate-y-[calc(100%+24px)]" : "translate-y-0"
      )}
    >
      <div
        ref={panelRef}
        className={cn(
          "mx-auto will-change-[width,transform,border-radius,box-shadow]",
          "transition-[width,transform,border-radius,box-shadow,background-color,border-color,backdrop-filter]",
          "duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
          "w-[min(80rem,calc(100%-1.5rem))] translate-y-3 rounded-[24px] border border-white/10 bg-[color:var(--gn-dark)]/95 backdrop-blur-xl shadow-[0_20px_56px_rgba(4,33,41,0.25)]",
          "sm:w-[min(80rem,calc(100%-2rem))] md:w-[min(80rem,calc(100%-2.5rem))] md:translate-y-4 lg:w-[min(80rem,calc(100%-3rem))]"
        )}
      >
        <div
          className={cn(
            "px-4 sm:px-6 lg:px-8 flex items-center justify-between",
            "transition-[height,padding] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
            "h-[66px]"
          )}
        >
          <Link href="/" className="text-white">
            <BrandLockup
              size="md"
              tone="light"
              logoClassName="h-8 transition-[height] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            />
          </Link>

          <div className="hidden lg:flex items-center gap-3 text-[14px] font-semibold text-white/68">
            <button
              type="button"
              onMouseEnter={() => {
                setNavHidden(false);
                setProductOpen(true);
              }}
              onClick={() => {
                setNavHidden(false);
                setProductOpen((prev) => !prev);
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 transition-colors",
                productOpen
                  ? "bg-white/10 text-white"
                  : "hover:bg-white/10 hover:text-white"
              )}
              aria-expanded={productOpen}
              aria-controls="marketing-product-panel"
            >
              Product
              <ChevronDown
                size={15}
                className={cn("transition-transform duration-200", productOpen && "rotate-180")}
              />
            </button>

            {PRIMARY_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setProductOpen(false)}
                className="rounded-full px-4 py-2 transition-colors hover:bg-white/10 hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-2 md:gap-3">
            <Link
              href="/login"
              onClick={() => setProductOpen(false)}
              className="hidden md:inline text-sm font-semibold text-white/82 transition-colors hover:text-white"
            >
              Sign in
            </Link>
            <GradientButton
              href="/signup"
              onClick={() => setProductOpen(false)}
              className="bg-[image:none] bg-[color:var(--gn-mint)] text-[color:var(--gn-dark)] shadow-[0_4px_18px_rgba(111,239,139,0.28)] hover:shadow-[0_8px_24px_rgba(111,239,139,0.38)]"
            >
              Try for free
            </GradientButton>
          </div>

          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={toggleMobileMenu}
            className="sm:hidden inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 text-white"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <div
          id="marketing-product-panel"
          className={cn(
            "hidden lg:block overflow-hidden transition-all duration-300",
            productOpen ? "max-h-[430px] opacity-100 pb-4" : "max-h-0 opacity-0"
          )}
          onMouseLeave={() => setProductOpen(false)}
        >
          <div className="px-4 lg:px-5">
            <div className="overflow-hidden rounded-2xl border border-white/30 bg-[#f9fbfa] p-3 text-[color:var(--gn-dark)] shadow-[0_24px_58px_rgba(4,33,41,0.22)] ring-1 ring-black/[0.03]">
              <div className="grid grid-cols-[390px_minmax(0,1fr)] gap-4">
                <Link
                  href={DEMO_URL}
                  onClick={() => setProductOpen(false)}
                  className="group relative min-h-[315px] self-stretch overflow-hidden rounded-xl bg-[color:var(--c-bl-bg)] text-white"
                >
                  <Image
                    src="/marketing/mega-menu-guidebook-splash.png"
                    alt="Guestnix mobile guidebook splash screen on a phone"
                    fill
                    sizes="390px"
                    className="object-cover object-[22%_50%] transition duration-500 group-hover:scale-[1.02]"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#042129]/[0.14] via-transparent to-transparent" />
                  <div className="absolute left-4 top-4">
                    <p className="inline-flex rounded-lg bg-[#042129]/[0.68] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[color:var(--gn-mint)] shadow-sm backdrop-blur-md">
                      Mobile guide preview
                    </p>
                  </div>
                </Link>

                <div className="min-w-0">
                  <div className="mb-3 flex items-center justify-between gap-5 px-1">
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[color:var(--marketing-muted)]">
                        Product suite
                      </p>
                      <h3
                        className="mt-1 text-[22px] font-extrabold leading-tight text-[color:var(--gn-dark)]"
                        style={{
                          fontFamily:
                            "var(--font-brand-heading), var(--font-sans), system-ui, sans-serif",
                        }}
                      >
                        Everything hosts need after booking.
                      </h3>
                    </div>
                    <Link
                      href="#features"
                      onClick={() => setProductOpen(false)}
                      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[color:var(--marketing-border)] bg-white px-3.5 py-2 text-xs font-extrabold text-[color:var(--gn-dark)] shadow-sm transition hover:border-[color:var(--gn-dark)]"
                    >
                      See features
                      <ArrowRight size={15} />
                    </Link>
                  </div>

                  <div className="grid grid-cols-4 gap-2.5">
                    {PRODUCT_ITEMS.map((item) => {
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.title}
                          href={item.href}
                          onClick={() => setProductOpen(false)}
                          className={cn(
                            item.accent,
                            "group min-h-[106px] rounded-xl border border-[color:var(--marketing-border)] bg-white p-3 shadow-[0_8px_18px_rgba(4,33,41,0.035)] transition duration-200 hover:-translate-y-0.5 hover:border-[color:var(--accent-color)] hover:shadow-[0_14px_28px_rgba(4,33,41,0.075)]"
                          )}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color:var(--accent-bg)] text-[color:var(--accent-color)] transition group-hover:scale-105">
                              {item.iconSrc ? (
                                <Image
                                  src={item.iconSrc}
                                  alt=""
                                  aria-hidden="true"
                                  width={23}
                                  height={18}
                                  className="h-[18px] w-[23px]"
                                  unoptimized
                                />
                              ) : Icon ? (
                                <Icon size={17} strokeWidth={2.35} />
                              ) : null}
                            </span>
                            <span className="rounded-full bg-[color:var(--accent-bg)] px-2 py-0.5 text-[10px] font-extrabold leading-5 text-[color:var(--accent-color)] opacity-0 transition duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                              {item.badge}
                            </span>
                          </div>
                          <p className="text-[13px] font-extrabold leading-tight text-[color:var(--gn-dark)]">
                            {item.title}
                          </p>
                          <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-snug text-[color:var(--marketing-muted)]">
                            {item.body}
                          </p>
                        </Link>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex items-center justify-between rounded-xl border border-[color:var(--marketing-border)] bg-[color:var(--marketing-surface-low)] px-3 py-2.5">
                    <p className="text-xs font-bold text-[color:var(--marketing-text-variant)]">
                      Build once, reuse content everywhere: mobile, print, chat, map, and store.
                    </p>
                    <Link
                      href="/signup"
                      onClick={() => setProductOpen(false)}
                      className="ml-4 inline-flex shrink-0 items-center gap-2 rounded-full bg-[color:var(--gn-dark)] px-3.5 py-2 text-xs font-extrabold text-[color:var(--gn-mint)] transition hover:shadow-[0_10px_24px_rgba(4,33,41,0.2)]"
                    >
                      Try for free
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "sm:hidden transition-all duration-300",
            mobileOpen
              ? "max-h-[calc(100vh-92px)] overflow-y-auto overscroll-contain opacity-100 pb-3"
              : "max-h-0 overflow-hidden opacity-0"
          )}
        >
          <div className="border-t border-white/10 px-3 pb-1 pt-3">
            <div className="grid grid-cols-2 gap-2">
              {PRIMARY_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex min-h-11 items-center justify-between rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white/86 transition-colors hover:bg-white/[0.1] hover:text-white"
                >
                  <span>{l.label}</span>
                  <ArrowRight size={14} aria-hidden />
                </Link>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-[0.8fr_1.2fr] gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-2">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/[0.12] px-3 text-sm font-bold text-white/[0.86] transition-colors hover:bg-white/[0.08] hover:text-white"
              >
                Sign in
              </Link>
              <GradientButton
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="min-h-11 justify-center bg-[image:none] bg-[color:var(--gn-mint)] px-3 text-[color:var(--gn-dark)]"
              >
                Try for free
              </GradientButton>
            </div>

            <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.12] bg-white text-[color:var(--gn-dark)] shadow-[0_18px_38px_rgba(0,0,0,0.22)]">
              <div className="flex items-center justify-between border-b border-[color:var(--marketing-border)] px-3.5 py-2.5">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[color:var(--marketing-muted)]">
                    Product suite
                  </p>
                  <p className="mt-0.5 text-[13px] font-extrabold">
                    Host tools for every stay
                  </p>
                </div>
                <Link
                  href="#features"
                  onClick={() => setMobileOpen(false)}
                  className="text-xs font-extrabold text-[color:var(--gn-mid)]"
                >
                  View all
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2 p-2">
                {PRODUCT_ITEMS.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        item.accent,
                        "group flex min-h-[74px] flex-col justify-between rounded-lg border border-[color:var(--marketing-border)] bg-white p-2.5 transition-colors hover:border-[color:var(--accent-color)] hover:bg-[color:var(--accent-bg)]"
                      )}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color:var(--accent-bg)] text-[color:var(--accent-color)]">
                          {item.iconSrc ? (
                            <Image
                              src={item.iconSrc}
                              alt=""
                              aria-hidden="true"
                              width={23}
                              height={18}
                              className="h-[18px] w-[23px]"
                              unoptimized
                            />
                          ) : Icon ? (
                            <Icon size={17} strokeWidth={2.3} />
                          ) : null}
                        </span>
                        <ArrowRight
                          size={14}
                          className="mt-1 shrink-0 text-[color:var(--marketing-muted)] transition group-hover:text-[color:var(--accent-color)]"
                          aria-hidden
                        />
                      </span>
                      <span className="mt-2 min-w-0">
                        <span className="block text-[13px] font-extrabold leading-tight">
                          {item.title}
                        </span>
                        <span className="mt-1 block truncate text-[10px] font-extrabold leading-none text-[color:var(--accent-color)]">
                          {item.badge}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="mt-2 flex items-center justify-center gap-4 px-1">
              {SECONDARY_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-xs font-bold text-white/58 transition-colors hover:text-white"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
