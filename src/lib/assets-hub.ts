import type { HostAssetType } from "@/lib/validations";

export type { HostAssetType } from "@/lib/validations";

export type HostAsset = {
  id: string;
  userId: string;
  assetType: HostAssetType;
  name: string;
  description: string | null;
  content: Record<string, unknown>;
  fileUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  tags: string[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
};

export const ASSET_TYPE_LABELS: Record<HostAssetType, string> = {
  content_block: "Knowledge Base",
  media: "Media",
  brand_kit: "Brand Kit",
  host_profile: "Host Details",
  property_asset: "Property Assets",
  property_host_profile: "Property & Host",
  local_recommendation: "Local Recommendations",
  section_template: "Reusable Sections",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function assetTextValue(
  asset: HostAsset,
  key: string,
  fallback = ""
): string {
  const value = asset.content?.[key];
  return typeof value === "string" ? value : fallback;
}

export function getAssetBlockType(asset: HostAsset): string {
  const raw = asset.content?.blockType;
  return typeof raw === "string" && raw.trim() ? raw : "text";
}

export function getAssetBlockContent(asset: HostAsset): Record<string, unknown> {
  const raw = asset.content?.blockContent;
  const base = isRecord(raw)
    ? raw
    : {
        html:
          typeof asset.description === "string" && asset.description.trim()
            ? `<p>${asset.description}</p>`
            : "<p></p>",
      };

  return {
    ...base,
    asset_ref_id: asset.id,
    asset_name: asset.name,
  };
}

export function getMediaAssetUrl(asset: HostAsset): string {
  return asset.fileUrl || assetTextValue(asset, "url");
}

export function getMediaAssetFolder(asset: HostAsset): string {
  const folder = assetTextValue(asset, "folder").trim();
  return folder || "Unfiled";
}

export function getBrandKitBrandingPatch(asset: HostAsset): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const keys = [
    "primary_color",
    "secondary_color",
    "accent_color",
    "heading_font",
    "body_font",
  ];

  for (const key of keys) {
    const value = asset.content?.[key];
    if (typeof value === "string" && value.trim()) {
      patch[key] = value;
    }
  }

  return patch;
}

export function getBrandKitLogoUrl(asset: HostAsset): string | null {
  return asset.fileUrl || assetTextValue(asset, "logo_url") || null;
}

export function getHostProfilePatch(asset: HostAsset): Record<string, unknown> {
  const avatarUrl = asset.fileUrl || assetTextValue(asset, "avatar_url");
  const patch: Record<string, unknown> = {};

  for (const key of ["name", "email", "phone", "languages", "bio"]) {
    const value = assetTextValue(asset, key);
    if (value) patch[key] = value;
  }

  if (avatarUrl) patch.avatar_url = avatarUrl;

  return patch;
}

export function getPropertyAssetPatch(asset: HostAsset): Record<string, unknown> {
  const photoUrl = asset.fileUrl || assetTextValue(asset, "photo_url");
  const patch: Record<string, unknown> = {};

  for (const key of ["name", "address", "city", "state", "country"]) {
    const value = assetTextValue(asset, key);
    if (value) patch[key] = value;
  }

  if (photoUrl) patch.cover_image_url = photoUrl;

  return patch;
}

export function getCombinedPropertyPatch(asset: HostAsset): Record<string, unknown> {
  const property =
    typeof asset.content?.property === "object" &&
    asset.content.property !== null &&
    !Array.isArray(asset.content.property)
      ? (asset.content.property as Record<string, unknown>)
      : {};
  return getPropertyAssetPatch({ ...asset, content: property });
}

export function getCombinedHostPatch(asset: HostAsset): Record<string, unknown> {
  const host =
    typeof asset.content?.host === "object" &&
    asset.content.host !== null &&
    !Array.isArray(asset.content.host)
      ? (asset.content.host as Record<string, unknown>)
      : {};
  return getHostProfilePatch({ ...asset, content: host });
}

export function getRecommendationInput(asset: HostAsset): Record<string, unknown> {
  return {
    name: assetTextValue(asset, "name", asset.name),
    category: assetTextValue(asset, "category", "other"),
    description: asset.description ?? assetTextValue(asset, "description") ?? null,
    lat:
      typeof asset.content?.lat === "number" && Number.isFinite(asset.content.lat)
        ? asset.content.lat
        : 0,
    lng:
      typeof asset.content?.lng === "number" && Number.isFinite(asset.content.lng)
        ? asset.content.lng
        : 0,
    address: assetTextValue(asset, "address") || null,
    phone: assetTextValue(asset, "phone") || null,
    website: assetTextValue(asset, "website") || null,
    email: assetTextValue(asset, "email") || null,
    imageUrl: asset.fileUrl || assetTextValue(asset, "imageUrl") || null,
    openingHours: assetTextValue(asset, "openingHours") || null,
    sourceQuery: assetTextValue(asset, "sourceQuery") || null,
    sourceLocation: assetTextValue(asset, "sourceLocation") || null,
    sourceCategory: assetTextValue(asset, "sourceCategory") || null,
    sourceLat:
      typeof asset.content?.sourceLat === "number" &&
      Number.isFinite(asset.content.sourceLat)
        ? asset.content.sourceLat
        : null,
    sourceLng:
      typeof asset.content?.sourceLng === "number" &&
      Number.isFinite(asset.content.sourceLng)
        ? asset.content.sourceLng
        : null,
    sourceRadiusMiles:
      typeof asset.content?.sourceRadiusMiles === "number" &&
      Number.isFinite(asset.content.sourceRadiusMiles)
        ? asset.content.sourceRadiusMiles
        : null,
    tags:
      typeof asset.content?.tags === "object" &&
      asset.content.tags !== null &&
      !Array.isArray(asset.content.tags)
        ? (asset.content.tags as Record<string, unknown>)
        : {},
  };
}

export function getRecommendationSourceLabel(asset: HostAsset): string {
  return (
    assetTextValue(asset, "sourceQuery") ||
    assetTextValue(asset, "sourceLocation")
  );
}

export function getRecommendationGroupLabel(asset: HostAsset): string {
  return getRecommendationSourceLabel(asset) || "Ungrouped recommendations";
}

export function getRecommendationGroupKey(asset: HostAsset): string {
  const label = getRecommendationSourceLabel(asset);
  return label ? label.trim().toLowerCase() : "__ungrouped_recommendations";
}

export type ReusableSectionBlock = {
  type: string;
  content: Record<string, unknown>;
};

export function getReusableSectionBlocks(asset: HostAsset): ReusableSectionBlock[] {
  const raw = asset.content?.blocks;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (!isRecord(item)) return null;
      const type = typeof item.type === "string" ? item.type : "";
      const content = isRecord(item.content) ? item.content : {};
      if (!type) return null;
      return { type, content };
    })
    .filter((item): item is ReusableSectionBlock => item !== null);
}

export function getReusableSectionTitle(asset: HostAsset): string {
  return assetTextValue(asset, "title", asset.name);
}

export function getReusableSectionIcon(asset: HostAsset): string {
  return assetTextValue(asset, "icon");
}
