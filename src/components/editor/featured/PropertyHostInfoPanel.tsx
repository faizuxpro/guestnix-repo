"use client";

import { useState } from "react";
import {
  Award,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
  User,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  getCombinedHostPatch,
  getCombinedPropertyPatch,
  getHostProfilePatch,
  getPropertyAssetPatch,
} from "@/lib/assets-hub";
import { cn } from "@/lib/utils";
import { AssetsHubPickerButton } from "@/components/editor/assets/AssetsHubPickerButton";
import { useEditorStore } from "@/stores/editor-store";
import type { HostSocialLink } from "@/types/blocks";
import { FeaturedNavCard } from "./controls/PanelHeader";
import {
  getPlatformMeta,
  PlatformGrid,
} from "./controls/PlatformPicker";
import {
  PromptedInput,
  PromptedTextarea,
} from "../shared/PromptedField";
import { EditorPanelShell, EditorSection, SettingGroup } from "../settings-ui";

/* -------------------------------------------------------------------------- */

type Props =
  | { mode: "card"; onSelect: () => void }
  | { mode: "detail" };

export function PropertyHostInfoPanel(props: Props) {
  const heroData = useEditorStore((s) => s.guidebook?.heroData);
  const updateHeroData = useEditorStore((s) => s.updateHeroData);

  if (props.mode === "card") {
    return (
      <FeaturedNavCard
        icon={<UserCog className="h-4 w-4" />}
        title="Property & Host info"
        accent="slate"
        onSelect={props.onSelect}
      />
    );
  }

  if (!heroData) return null;
  const property = heroData.property;
  const host = heroData.host;

  const setSocial = (next: HostSocialLink[]) =>
    updateHeroData({ host: { social: next } });

  const hostSocial = host.social ?? [];

  return (
    <EditorPanelShell contentClassName="space-y-4">
      <SettingGroup className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          Assets Hub profile
        </span>
        <AssetsHubPickerButton
          assetType="property_host_profile"
          label="Apply Assets Hub profile"
          onSelect={(asset) => {
            updateHeroData({
              property: getCombinedPropertyPatch(asset) as Partial<typeof property>,
              host: getCombinedHostPatch(asset) as Partial<typeof host>,
            });
            toast.success("Property & host profile applied");
          }}
        />
      </SettingGroup>
      {/* ─── Property ─────────────────────────── */}
      <EditorSection icon={<MapPin />} title="Property">
        <div className="flex justify-end">
          <AssetsHubPickerButton
            assetType="property_asset"
            label="Apply Assets Hub property"
            onSelect={(asset) => {
              updateHeroData({
                property: getPropertyAssetPatch(asset) as Partial<typeof property>,
              });
              toast.success("Property asset applied");
            }}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <PromptedInput
            label="Property name"
            value={property.name}
            onChange={(v) => updateHeroData({ property: { name: v } })}
            placeholder="Property name"
          />
          <PromptedInput
            label="Tagline"
            value={property.tagline}
            onChange={(v) => updateHeroData({ property: { tagline: v } })}
            placeholder="Tagline shown on splash"
          />
        </div>

        <PromptedInput
          label="Street address"
          value={property.address}
          onChange={(v) => updateHeroData({ property: { address: v } })}
          placeholder="Street address"
        />

        <div className="grid gap-2 sm:grid-cols-3">
          <PromptedInput
            label="City"
            value={property.city}
            onChange={(v) => updateHeroData({ property: { city: v } })}
            placeholder="City"
          />
          <PromptedInput
            label="State / Region"
            value={property.state}
            onChange={(v) => updateHeroData({ property: { state: v } })}
            placeholder="State or region"
          />
          <PromptedInput
            label="Country"
            value={property.country}
            onChange={(v) => updateHeroData({ property: { country: v } })}
            placeholder="Country"
          />
        </div>
      </EditorSection>

      {/* ─── Host ─────────────────────────── */}
      <EditorSection icon={<User />} title="Host">
        <div className="flex justify-end">
          <AssetsHubPickerButton
            assetType="host_profile"
            label="Apply Assets Hub host"
            onSelect={(asset) => {
              updateHeroData({
                host: getHostProfilePatch(asset) as Partial<typeof host>,
              });
              toast.success("Host profile applied");
            }}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <PromptedInput
            label="Host name"
            value={host.name}
            onChange={(v) => updateHeroData({ host: { name: v } })}
            placeholder="Host name"
          />
          <PromptedInput
            label="Phone"
            value={host.phone}
            onChange={(v) => updateHeroData({ host: { phone: v } })}
            placeholder="Phone number"
            type="tel"
            inputMode="tel"
          />
        </div>

        <PromptedInput
          label="Email"
          value={host.email}
          onChange={(v) => updateHeroData({ host: { email: v } })}
          placeholder="Email address"
          type="email"
          inputMode="email"
        />

        <PromptedTextarea
          label="Bio"
          value={host.bio}
          onChange={(v) => updateHeroData({ host: { bio: v } })}
          placeholder="A short intro to your hosting style"
        />

        <div className="grid gap-2 sm:grid-cols-2">
          <PromptedInput
            label="Languages"
            value={host.languages}
            onChange={(v) => updateHeroData({ host: { languages: v } })}
            placeholder="Languages spoken"
          />
          <label
            className={cn(
              "flex h-[42px] cursor-pointer items-center justify-between rounded-md border px-3 transition-colors",
              host.superhost
                ? "border-amber-400/70 bg-amber-50/60 hover:bg-amber-50/80 dark:bg-amber-500/10 dark:hover:bg-amber-500/15"
                : "border-border/50 bg-muted/70 hover:border-foreground/30 hover:bg-muted"
            )}
          >
            <span className="flex items-center gap-1.5 text-[14px] font-medium">
              <Award
                className={cn(
                  "h-4 w-4",
                  host.superhost ? "text-amber-500" : "text-muted-foreground"
                )}
              />
              Superhost
            </span>
            <Switch
              checked={host.superhost}
              onCheckedChange={(checked) =>
                updateHeroData({ host: { superhost: checked } })
              }
              aria-label="Toggle superhost"
            />
          </label>
        </div>
      </EditorSection>

      {/* ─── Social links ─────────────────────────── */}
      <EditorSection icon={<Sparkles />} title="Social links">
        {hostSocial.length > 0 ? (
          <div className="space-y-1.5">
            {hostSocial.map((link, index) => (
              <SocialLinkRow
                key={`social-${index}`}
                link={link}
                onChange={(next) => {
                  const arr = [...hostSocial];
                  arr[index] = next;
                  setSocial(arr);
                }}
                onRemove={() =>
                  setSocial(hostSocial.filter((_, i) => i !== index))
                }
              />
            ))}
          </div>
        ) : null}
        <AddSocialLinkButton
          onAdd={(link) => setSocial([...hostSocial, link])}
        />
      </EditorSection>
    </EditorPanelShell>
  );
}

function SocialLinkRow({
  link,
  onChange,
  onRemove,
}: {
  link: HostSocialLink;
  onChange: (next: HostSocialLink) => void;
  onRemove: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const meta = getPlatformMeta(link.platform);
  const isEmpty = !link.url?.trim();

  return (
    <div className="flex items-center gap-1.5">
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white shadow-sm transition-transform hover:scale-105",
                isEmpty && "opacity-70"
              )}
              style={{ backgroundColor: meta.hue }}
              aria-label={`Change platform — currently ${meta.label}`}
              title={`${meta.label} — click to change`}
            >
              <meta.Icon className="h-4 w-4" aria-hidden />
            </button>
          }
        />
        <PopoverContent align="start" sideOffset={6} className="w-[280px] p-2">
          <PlatformGrid
            current={link.platform}
            onSelect={(p) => {
              onChange({ ...link, platform: p });
              setPickerOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>

      <Input
        value={link.url}
        onChange={(e) => onChange({ ...link, url: e.target.value })}
        placeholder={meta.placeholder}
        aria-label={`${meta.label} URL`}
        className={cn(
          "h-9 flex-1",
          isEmpty &&
            "border-amber-300/70 focus-visible:ring-amber-300/60"
        )}
      />

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onRemove}
        aria-label="Remove link"
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function AddSocialLinkButton({
  onAdd,
}: {
  onAdd: (link: HostSocialLink) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border/70 bg-background/40 px-3 py-2 text-[12px] font-medium text-muted-foreground transition-all hover:border-primary/45 hover:bg-primary/5 hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            Add link
          </button>
        }
      />
      <PopoverContent align="start" sideOffset={6} className="w-[280px] p-2">
        <PlatformGrid
          current={null}
          onSelect={(p) => {
            onAdd({ platform: p, url: "", label: "" });
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
