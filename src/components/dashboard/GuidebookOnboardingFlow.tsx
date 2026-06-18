"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Check,
  ExternalLink,
  FileUp,
  Globe,
  Loader2,
  Paintbrush,
  Shuffle,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RuntimeFontLoader } from "@/components/fonts/RuntimeFontLoader";
import { apiFetch } from "@/lib/api-fetch";
import { toastApiError } from "@/lib/toast-error";
import { uploadMediaFile } from "@/lib/media-upload-client";
import { cn } from "@/lib/utils";
import {
  DESIGN_PRESETS,
  type DesignPreset,
} from "@/components/editor/design/presets";

type StepId = "basics" | "host" | "theme" | "review" | "launch";

type Property = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
};

type GuidebookResponse = {
  id: string;
  slug: string;
  title: string;
};

type PublishResponse = {
  publicUrl?: string;
};

const DEMO_URL = "/demo/sunset-template";

const STEPS: Array<{
  id: StepId;
  label: string;
  description: string;
  icon: typeof BookOpen;
}> = [
  {
    id: "basics",
    label: "Basics",
    description: "Name the guide and connect a property.",
    icon: BookOpen,
  },
  {
    id: "host",
    label: "Host Details",
    description: "Add logo and reusable guest variables.",
    icon: UserRound,
  },
  {
    id: "theme",
    label: "Style",
    description: "Pick a ready-made look or shuffle.",
    icon: Paintbrush,
  },
  {
    id: "review",
    label: "Review",
    description: "Check what is ready before launch.",
    icon: Sparkles,
  },
  {
    id: "launch",
    label: "Launch",
    description: "Publish or open the full editor.",
    icon: Globe,
  },
];

const FEATURED_PRESET_IDS = [
  "sunset-lakehouse",
  "coastal-calm",
  "mountain-cabin",
  "modern-minimal",
  "boho-garden",
  "hospitality-classic",
];

function stepIndex(step: StepId) {
  return STEPS.findIndex((item) => item.id === step);
}

function nonEmptyRecord(values: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(values)
      .map(([key, value]) => [key, value.trim()])
      .filter(([, value]) => value.length > 0)
      .map(([key, value]) => [key, { value }])
  );
}

function propertyLocation(parts: Array<string | null | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join(", ");
}

function presetById(id: string) {
  return DESIGN_PRESETS.find((preset) => preset.id === id) ?? DESIGN_PRESETS[0];
}

export function GuidebookOnboardingFlow({
  properties,
}: {
  properties: Property[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPropertyId = searchParams.get("property") ?? "none";
  const source = searchParams.get("source");
  const isNewSignup = source === "onboarding";

  const [step, setStep] = useState<StepId>("basics");
  const [guidebookId, setGuidebookId] = useState<string | null>(null);
  const [guidebookSlug, setGuidebookSlug] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [propertyChoice, setPropertyChoice] = useState(initialPropertyId);
  const [propertyName, setPropertyName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [hostName, setHostName] = useState("");
  const [hostEmail, setHostEmail] = useState("");
  const [hostPhone, setHostPhone] = useState("");
  const [checkinTime, setCheckinTime] = useState("");
  const [checkoutTime, setCheckoutTime] = useState("");
  const [wifiName, setWifiName] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState("sunset-lakehouse");
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);

  const selectedProperty =
    propertyChoice !== "none"
      ? properties.find((property) => property.id === propertyChoice) ?? null
      : null;
  const selectedPreset = presetById(selectedPresetId);

  const featuredPresets = useMemo(
    () =>
      FEATURED_PRESET_IDS.map(presetById).filter(
        (preset, index, list) =>
          preset && list.findIndex((item) => item.id === preset.id) === index
      ),
    []
  );

  const previewFamilies = useMemo(() => {
    const families = new Set<string>();
    for (const preset of featuredPresets) {
      families.add(preset.branding.heading_font);
      families.add(preset.branding.body_font);
    }
    return Array.from(families);
  }, [featuredPresets]);

  const draftTitle =
    title.trim() ||
    selectedProperty?.name ||
    propertyName.trim() ||
    "Untitled Guidebook";
  const locationLabel =
    selectedProperty
      ? propertyLocation([
          selectedProperty.address,
          selectedProperty.city,
          selectedProperty.state,
          selectedProperty.country,
        ])
      : propertyLocation([address, city, country]);
  const editorHref = guidebookId
    ? `/dashboard/guidebooks/${guidebookId}/editor`
    : null;

  async function createPropertyIfNeeded() {
    if (propertyChoice !== "new") return propertyChoice === "none" ? null : propertyChoice;
    const cleanName = propertyName.trim();
    if (!cleanName) return null;

    const result = await apiFetch<Property>("/api/properties", {
      method: "POST",
      body: {
        name: cleanName,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
      },
    });

    if (!result.ok) {
      toastApiError(result.error, { title: "Couldn't save property" });
      return null;
    }

    setPropertyChoice(result.data.id);
    return result.data.id;
  }

  async function ensureDraft() {
    if (guidebookId) return guidebookId;

    setSaving(true);
    try {
      const propertyId = await createPropertyIfNeeded();
      const result = await apiFetch<GuidebookResponse>("/api/guidebooks", {
        method: "POST",
        body: {
          title: draftTitle,
          propertyId: propertyId ?? undefined,
          templateId: "sunset-lakehouse",
        },
      });

      if (!result.ok) {
        toastApiError(result.error, { title: "Couldn't create guidebook" });
        return null;
      }

      setGuidebookId(result.data.id);
      setGuidebookSlug(result.data.slug);
      toast.success("Draft guidebook created");
      return result.data.id;
    } finally {
      setSaving(false);
    }
  }

  async function patchBranding(id: string, preset = selectedPreset, nextLogo = logoUrl) {
    const result = await apiFetch(`/api/guidebooks/${id}`, {
      method: "PATCH",
      body: {
        branding: {
          ...preset.branding,
          logo_url: nextLogo,
        },
      },
    });

    if (!result.ok) {
      toastApiError(result.error, { title: "Couldn't save style" });
      return false;
    }
    return true;
  }

  async function saveQuickVariables(id: string) {
    const values = nonEmptyRecord({
      property_name: selectedProperty?.name ?? propertyName,
      property_location: locationLabel,
      host_name: hostName,
      host_email: hostEmail,
      host_phone: hostPhone,
      checkin_time: checkinTime,
      checkout_time: checkoutTime,
      wifi_network_name: wifiName,
      wifi_password: wifiPassword,
    });

    if (Object.keys(values).length === 0) return true;

    const result = await apiFetch(`/api/guidebooks/${id}/quick-variables`, {
      method: "PATCH",
      body: { values, custom: [] },
    });

    if (!result.ok) {
      toastApiError(result.error, { title: "Couldn't save host details" });
      return false;
    }
    return true;
  }

  async function continueFromBasics() {
    const id = await ensureDraft();
    if (id) setStep("host");
  }

  async function continueFromHost() {
    const id = await ensureDraft();
    if (!id) return;
    setSaving(true);
    try {
      const ok = await saveQuickVariables(id);
      if (ok) setStep("theme");
    } finally {
      setSaving(false);
    }
  }

  async function applyPreset(preset: DesignPreset) {
    setSelectedPresetId(preset.id);
    if (!guidebookId) return;
    setSaving(true);
    try {
      await patchBranding(guidebookId, preset);
    } finally {
      setSaving(false);
    }
  }

  async function continueFromTheme() {
    const id = await ensureDraft();
    if (!id) return;
    setSaving(true);
    try {
      const ok = await patchBranding(id);
      if (ok) setStep("review");
    } finally {
      setSaving(false);
    }
  }

  async function openEditor() {
    const id = await ensureDraft();
    if (id) router.push(`/dashboard/guidebooks/${id}/editor`);
  }

  async function publishGuidebook() {
    const id = await ensureDraft();
    if (!id) return;

    setPublishing(true);
    try {
      await saveQuickVariables(id);
      await patchBranding(id);

      const result = await apiFetch<PublishResponse>(`/api/guidebooks/${id}/publish`, {
        method: "POST",
      });

      if (!result.ok) {
        toastApiError(result.error, { title: "Couldn't launch guidebook" });
        return;
      }

      setPublicUrl(result.data.publicUrl ?? (guidebookSlug ? `/g/${guidebookSlug}` : null));
      setStep("launch");
      toast.success("Guidebook launched");
      router.refresh();
    } finally {
      setPublishing(false);
    }
  }

  async function uploadLogo(file: File | null) {
    if (!file) return;
    setUploadingLogo(true);
    try {
      const uploaded = await uploadMediaFile(file, {
        folder: "guidebook-logos",
        name: file.name,
        tags: ["logo", "onboarding"],
      });
      setLogoUrl(uploaded.url);
      const id = await ensureDraft();
      if (id) await patchBranding(id, selectedPreset, uploaded.url);
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Logo upload failed");
    } finally {
      setUploadingLogo(false);
    }
  }

  function shuffleTheme() {
    const pool = featuredPresets.filter((preset) => preset.id !== selectedPresetId);
    const pick = pool[Math.floor(Math.random() * pool.length)] ?? featuredPresets[0];
    if (pick) void applyPreset(pick);
  }

  const activeIndex = stepIndex(step);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <RuntimeFontLoader fontFamilies={previewFamilies} id="guidebook-onboarding" />

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Badge variant="secondary" className="mb-3">
            {isNewSignup ? "Plan selected" : "Guided setup"}
          </Badge>
          <h1 className="font-heading text-2xl font-semibold">
            Create your guidebook
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            A quick, skippable setup for the essentials: property basics, host
            variables, style, and launch. You can leave anytime or continue in
            the full editor.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/dashboard/guidebooks" />}>
            Exit setup
          </Button>
          <Button variant="outline" onClick={() => void openEditor()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
            Open editor
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-xl border bg-card p-3 shadow-sm">
          <div className="space-y-1">
            {STEPS.map((item, index) => {
              const Icon = item.icon;
              const active = item.id === step;
              const done = index < activeIndex || (item.id === "launch" && publicUrl);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStep(item.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors",
                    active ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-md border",
                      done
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : active
                          ? "border-primary/25 bg-background text-primary"
                          : "border-border bg-background text-muted-foreground"
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {index + 1}. {item.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
          {step === "basics" ? (
            <div className="space-y-6">
              <StepHeader
                eyebrow="Step 1 of 5"
                title="Start with the basics"
                body="Create the draft now; everything else can be skipped or edited later."
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Guidebook title">
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Sunset Beach Welcome Guide"
                  />
                </Field>
                <Field label="Property">
                  <Select
                    value={propertyChoice}
                    onValueChange={(value) => setPropertyChoice(value ?? "none")}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No property yet</SelectItem>
                      <SelectItem value="new">Add a new property</SelectItem>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              {propertyChoice === "new" ? (
                <div className="grid gap-4 rounded-lg border bg-muted/20 p-4 md:grid-cols-2">
                  <Field label="Property name">
                    <Input
                      value={propertyName}
                      onChange={(event) => setPropertyName(event.target.value)}
                      placeholder="Oceanview Villa"
                    />
                  </Field>
                  <Field label="Street address">
                    <Input
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      placeholder="12 Beach Road"
                    />
                  </Field>
                  <Field label="City">
                    <Input
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      placeholder="Malibu"
                    />
                  </Field>
                  <Field label="Country">
                    <Input
                      value={country}
                      onChange={(event) => setCountry(event.target.value)}
                      placeholder="United States"
                    />
                  </Field>
                </div>
              ) : null}
              <StepActions
                onSkip={() => void continueFromBasics()}
                onNext={() => void continueFromBasics()}
                nextLabel={guidebookId ? "Continue" : "Create draft"}
                busy={saving}
              />
            </div>
          ) : null}

          {step === "host" ? (
            <div className="space-y-6">
              <StepHeader
                eyebrow="Step 2 of 5"
                title="Add reusable host details"
                body="These details feed Quick Variables, so templates can use the host, property, Wi-Fi, and timing information automatically."
              />
              <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border bg-background">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="" className="h-full w-full object-contain p-3" />
                    ) : (
                      <UserRound className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                  <Label className="mt-3 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border bg-background text-sm font-medium hover:bg-muted">
                    {uploadingLogo ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileUp className="h-4 w-4" />
                    )}
                    Upload logo
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => void uploadLogo(event.target.files?.[0] ?? null)}
                    />
                  </Label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Host name">
                    <Input value={hostName} onChange={(event) => setHostName(event.target.value)} placeholder="Jane Cooper" />
                  </Field>
                  <Field label="Host email">
                    <Input value={hostEmail} onChange={(event) => setHostEmail(event.target.value)} placeholder="host@example.com" />
                  </Field>
                  <Field label="Host phone">
                    <Input value={hostPhone} onChange={(event) => setHostPhone(event.target.value)} placeholder="+1 555 0100" />
                  </Field>
                  <Field label="Wi-Fi network">
                    <Input value={wifiName} onChange={(event) => setWifiName(event.target.value)} placeholder="Guest WiFi" />
                  </Field>
                  <Field label="Wi-Fi password">
                    <Input value={wifiPassword} onChange={(event) => setWifiPassword(event.target.value)} placeholder="guest-access" />
                  </Field>
                  <Field label="Check-in time">
                    <Input value={checkinTime} onChange={(event) => setCheckinTime(event.target.value)} placeholder="4:00 PM" />
                  </Field>
                  <Field label="Check-out time">
                    <Input value={checkoutTime} onChange={(event) => setCheckoutTime(event.target.value)} placeholder="11:00 AM" />
                  </Field>
                </div>
              </div>
              <StepActions
                onSkip={() => setStep("theme")}
                onNext={() => void continueFromHost()}
                busy={saving}
              />
            </div>
          ) : null}

          {step === "theme" ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <StepHeader
                  eyebrow="Step 3 of 5"
                  title="Choose a style"
                  body="Pick a polished starting point, shuffle like Feeling Lucky, or open the Sunset template demo in a new tab."
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={shuffleTheme} disabled={saving}>
                    <Shuffle className="h-4 w-4" />
                    Shuffle
                  </Button>
                  <Button variant="outline" render={<Link href={DEMO_URL} target="_blank" rel="noopener" />}>
                    <ExternalLink className="h-4 w-4" />
                    Demo
                  </Button>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {featuredPresets.map((preset) => (
                  <ThemeCard
                    key={preset.id}
                    preset={preset}
                    selected={selectedPresetId === preset.id}
                    onSelect={() => void applyPreset(preset)}
                  />
                ))}
              </div>
              <StepActions
                onSkip={() => setStep("review")}
                onNext={() => void continueFromTheme()}
                busy={saving}
              />
            </div>
          ) : null}

          {step === "review" ? (
            <div className="space-y-6">
              <StepHeader
                eyebrow="Step 4 of 5"
                title="Review your launch"
                body="Nothing is locked. Launch now, or move into the editor for deeper page and content work."
              />
              <div className="grid gap-3 md:grid-cols-2">
                <ReviewItem label="Guidebook" value={draftTitle} done={Boolean(guidebookId)} />
                <ReviewItem
                  label="Property"
                  value={selectedProperty?.name ?? (propertyName || "Skipped")}
                  done={Boolean(selectedProperty || propertyName.trim())}
                />
                <ReviewItem label="Host variables" value={hostName || hostEmail || wifiName ? "Added" : "Skipped"} done={Boolean(hostName || hostEmail || wifiName)} />
                <ReviewItem label="Style" value={selectedPreset.name} done />
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => void openEditor()} disabled={saving}>
                  Open editor
                </Button>
                <Button onClick={() => void publishGuidebook()} disabled={publishing || saving}>
                  {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                  Launch guidebook
                </Button>
              </div>
            </div>
          ) : null}

          {step === "launch" ? (
            <div className="space-y-6">
              <StepHeader
                eyebrow="Step 5 of 5"
                title="Your guidebook is live"
                body="Share the guest link now, or keep refining the experience in the editor."
              />
              <div className="rounded-lg border bg-emerald-50 p-4 text-sm text-emerald-800">
                <div className="flex items-center gap-2 font-medium">
                  <Check className="h-4 w-4" />
                  Published successfully
                </div>
                {publicUrl ? (
                  <p className="mt-2 break-all text-emerald-700">{publicUrl}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" render={<Link href="/dashboard/guidebooks" />}>
                  Back to guidebooks
                </Button>
                {editorHref ? (
                  <Button variant="outline" render={<Link href={editorHref} />}>
                    Open editor
                  </Button>
                ) : null}
                {publicUrl ? (
                  <Button render={<Link href={publicUrl} target="_blank" rel="noopener" />}>
                    <ExternalLink className="h-4 w-4" />
                    View live
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function StepHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-primary">{eyebrow}</p>
      <h2 className="mt-1 font-heading text-xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function StepActions({
  onSkip,
  onNext,
  nextLabel = "Continue",
  busy,
}: {
  onSkip: () => void;
  onNext: () => void;
  nextLabel?: string;
  busy?: boolean;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
      <Button type="button" variant="ghost" onClick={onSkip} disabled={busy}>
        Skip for now
      </Button>
      <Button type="button" onClick={onNext} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {nextLabel}
        {!busy ? <ArrowRight className="h-4 w-4" /> : null}
      </Button>
    </div>
  );
}

function ThemeCard({
  preset,
  selected,
  onSelect,
}: {
  preset: DesignPreset;
  selected: boolean;
  onSelect: () => void;
}) {
  const b = preset.branding;
  return (
    <article
      className={cn(
        "overflow-hidden rounded-lg border bg-background transition-all",
        selected ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/40"
      )}
    >
      <button type="button" onClick={onSelect} className="block w-full text-left">
        <div
          className="relative aspect-[1.7/1] overflow-hidden"
          style={{ backgroundColor: b.background_color }}
        >
          <div className="absolute inset-x-0 top-0 h-8" style={{ backgroundColor: b.primary_color }} />
          <div className="absolute left-5 top-14">
            <p
              className="text-2xl font-semibold"
              style={{
                color: b.primary_color,
                fontFamily: `"${b.heading_font}", serif`,
              }}
            >
              Welcome
            </p>
            <p
              className="mt-1 text-sm"
              style={{
                color: b.secondary_color,
                fontFamily: `"${b.body_font}", sans-serif`,
              }}
            >
              Your stay starts here
            </p>
          </div>
          <div className="absolute bottom-4 left-5 flex gap-1.5">
            {[b.primary_color, b.secondary_color, b.accent_color].map((color) => (
              <span
                key={color}
                className="size-5 rounded-full border border-black/10"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-medium">{preset.name}</h3>
              <p className="text-sm text-muted-foreground">{preset.tagline}</p>
            </div>
            {selected ? <Badge>Selected</Badge> : null}
          </div>
        </div>
      </button>
      <div className="border-t p-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          render={<Link href={DEMO_URL} target="_blank" rel="noopener" />}
        >
          <ExternalLink className="h-4 w-4" />
          Open demo
        </Button>
      </div>
    </article>
  );
}

function ReviewItem({
  label,
  value,
  done,
}: {
  label: string;
  value: string;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background p-4">
      <span
        className={cn(
          "grid size-9 place-items-center rounded-md border",
          done
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-muted bg-muted/35 text-muted-foreground"
        )}
      >
        <Check className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block truncate text-sm text-muted-foreground">{value}</span>
      </span>
    </div>
  );
}
