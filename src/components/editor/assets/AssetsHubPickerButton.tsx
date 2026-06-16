"use client";

import { useMemo, useState } from "react";
import {
  Brush,
  Home,
  Image as ImageIcon,
  LibraryBig,
  LayoutTemplate,
  Loader2,
  MapPin,
  UserRound,
} from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import type { HostAsset, HostAssetType } from "@/lib/assets-hub";
import { ASSET_TYPE_LABELS, getMediaAssetFolder } from "@/lib/assets-hub";
import { cn } from "@/lib/utils";
import { useAssetsHubAssets } from "@/hooks/use-assets-hub-content-blocks";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MediaLibraryDialog } from "./MediaLibraryDialog";

type Props = {
  assetType: HostAssetType;
  label?: string;
  emptyText?: string;
  className?: string;
  filter?: (asset: HostAsset) => boolean;
  onSelect: (asset: HostAsset) => void;
};

const ICONS: Record<HostAssetType, React.ComponentType<{ className?: string }>> = {
  content_block: LibraryBig,
  media: ImageIcon,
  brand_kit: Brush,
  host_profile: UserRound,
  property_asset: Home,
  property_host_profile: Home,
  local_recommendation: MapPin,
  section_template: LayoutTemplate,
};

function textValue(content: Record<string, unknown>, key: string, fallback = "") {
  const value = content[key];
  return typeof value === "string" ? value : fallback;
}

function swatches(asset: HostAsset) {
  if (asset.assetType !== "brand_kit") return null;
  const primary = textValue(asset.content, "primary_color", "#0f766e");
  const secondary = textValue(asset.content, "secondary_color", "#d4a23a");
  const accent = textValue(asset.content, "accent_color", "#111827");
  return [primary, secondary, accent];
}

function AssetThumb({ asset }: { asset: HostAsset }) {
  const colors = swatches(asset);

  if (colors) {
    return (
      <span className="flex h-9 w-9 shrink-0 overflow-hidden rounded-md border">
        {colors.map((color) => (
          <span key={color} className="h-full flex-1" style={{ backgroundColor: color }} />
        ))}
      </span>
    );
  }

  if (asset.fileUrl) {
    return (
      <span
        className="h-9 w-9 shrink-0 rounded-md border bg-muted bg-cover bg-center"
        style={{ backgroundImage: `url(${asset.fileUrl})` }}
      />
    );
  }

  const Icon = ICONS[asset.assetType];
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border bg-muted/40">
      <Icon className="h-4 w-4 text-muted-foreground" />
    </span>
  );
}

function AssetSubtitle({ asset }: { asset: HostAsset }) {
  if (asset.assetType === "brand_kit") {
    return (
      <>
        {textValue(asset.content, "heading_font", "Heading")} /{" "}
        {textValue(asset.content, "body_font", "Body")}
      </>
    );
  }

  if (asset.assetType === "media") {
    return <>{getMediaAssetFolder(asset)}</>;
  }

  if (asset.assetType === "host_profile") {
    return <>{textValue(asset.content, "email") || textValue(asset.content, "phone") || "host"}</>;
  }

  if (asset.assetType === "property_asset") {
    return <>{textValue(asset.content, "city") || textValue(asset.content, "address") || "property"}</>;
  }

  if (asset.assetType === "property_host_profile") {
    return <>combined profile</>;
  }

  if (asset.assetType === "local_recommendation") {
    return <>{textValue(asset.content, "category", "place")}</>;
  }

  return <>{asset.description || ASSET_TYPE_LABELS[asset.assetType]}</>;
}

export function AssetsHubPickerButton({
  assetType,
  label,
  emptyText,
  className,
  filter,
  onSelect,
}: Props) {
  if (assetType === "media") {
    return (
      <MediaLibraryPickerButton
        label={label}
        className={className}
        onSelect={onSelect}
      />
    );
  }

  return (
    <AssetPopoverPickerButton
      assetType={assetType}
      label={label}
      emptyText={emptyText}
      className={className}
      filter={filter}
      onSelect={onSelect}
    />
  );
}

function MediaLibraryPickerButton({
  label,
  className,
  onSelect,
}: Pick<Props, "label" | "className" | "onSelect">) {
  const [open, setOpen] = useState(false);

  const handleSelect = (asset: HostAsset) => {
    onSelect(asset);
    void apiFetch(`/api/assets-hub/${asset.id}/use`, { method: "POST" });
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn("h-8 gap-1.5", className)}
        onClick={() => setOpen(true)}
      >
        <ImageIcon className="h-3.5 w-3.5" />
        {label ?? "Use Assets Hub media"}
      </Button>
      <MediaLibraryDialog
        open={open}
        onOpenChange={setOpen}
        onSelect={handleSelect}
      />
    </>
  );
}

function AssetPopoverPickerButton({
  assetType,
  label,
  emptyText,
  className,
  filter,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const { assets, loading } = useAssetsHubAssets(assetType);

  const visibleAssets = useMemo(
    () => (filter ? assets.filter(filter) : assets),
    [assets, filter]
  );

  const Icon = ICONS[assetType];

  const handleSelect = (asset: HostAsset) => {
    onSelect(asset);
    setOpen(false);
    void apiFetch(`/api/assets-hub/${asset.id}/use`, { method: "POST" });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("h-8 gap-1.5", className)}
          />
        }
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Icon className="h-3.5 w-3.5" />
        )}
        {label ?? `Use saved ${ASSET_TYPE_LABELS[assetType].toLowerCase()}`}
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-72 p-1.5">
        {loading ? (
          <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading assets
          </div>
        ) : visibleAssets.length === 0 ? (
          <div className="px-2 py-3 text-xs text-muted-foreground">
            {emptyText ?? `No saved ${ASSET_TYPE_LABELS[assetType].toLowerCase()} yet.`}
          </div>
        ) : (
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {visibleAssets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => handleSelect(asset)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted"
              >
                <AssetThumb asset={asset} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">
                    {asset.name}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    <AssetSubtitle asset={asset} />
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
