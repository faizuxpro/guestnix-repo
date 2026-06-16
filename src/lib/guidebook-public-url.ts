export const PUBLIC_GUIDEBOOK_BASE_PATH = "/g";
export const DEMO_GUIDEBOOK_BASE_PATH = "/demo";
export const DEMO_GUIDEBOOK_SETTINGS_KEY = "demo_enabled";

export type GuidebookPublicBasePath =
  | typeof PUBLIC_GUIDEBOOK_BASE_PATH
  | typeof DEMO_GUIDEBOOK_BASE_PATH;

export function isDemoGuidebookSettings(
  settings: Record<string, unknown> | null | undefined
) {
  return settings?.[DEMO_GUIDEBOOK_SETTINGS_KEY] === true;
}

export function guidebookPublicBasePath(
  settings: Record<string, unknown> | null | undefined
): GuidebookPublicBasePath {
  return isDemoGuidebookSettings(settings)
    ? DEMO_GUIDEBOOK_BASE_PATH
    : PUBLIC_GUIDEBOOK_BASE_PATH;
}

export function guidebookPublicPath(
  slug: string,
  settings: Record<string, unknown> | null | undefined
) {
  return `${guidebookPublicBasePath(settings)}/${encodeURIComponent(slug)}`;
}

export function guidebookPublicPathFromBase(
  basePath: GuidebookPublicBasePath,
  slug: string
) {
  return `${basePath}/${encodeURIComponent(slug)}`;
}
