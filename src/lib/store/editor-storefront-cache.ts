import { apiFetch } from "@/lib/api-fetch";
import type { ApiError } from "@/lib/api-errors";
import type { EditorStorefrontData } from "@/lib/store/editor-storefront-types";

const EDITOR_STOREFRONT_CACHE_TTL_MS = 30_000;

export type {
  EditorStorefrontAssignment,
  EditorStorefrontCatalogItem,
  EditorStorefrontData,
  EditorStorefrontPatchResult,
} from "@/lib/store/editor-storefront-types";

type CachedStorefront = {
  data: EditorStorefrontData;
  cachedAt: number;
};

type EditorStorefrontLoadResult =
  | { ok: true; data: EditorStorefrontData }
  | { ok: false; error: ApiError };

const cachedStorefronts = new Map<string, CachedStorefront>();
const inflightStorefronts = new Map<
  string,
  Promise<EditorStorefrontLoadResult>
>();

export function getCachedEditorStorefront(guidebookId: string) {
  const cached = cachedStorefronts.get(guidebookId);
  if (!cached) return null;

  if (Date.now() - cached.cachedAt > EDITOR_STOREFRONT_CACHE_TTL_MS) {
    cachedStorefronts.delete(guidebookId);
    return null;
  }

  return cached.data;
}

export function setCachedEditorStorefront(
  guidebookId: string,
  data: EditorStorefrontData
) {
  cachedStorefronts.set(guidebookId, {
    data,
    cachedAt: Date.now(),
  });
}

export async function fetchEditorStorefront(
  guidebookId: string,
  options: { force?: boolean } = {}
): Promise<EditorStorefrontLoadResult> {
  if (!options.force) {
    const cached = getCachedEditorStorefront(guidebookId);
    if (cached) return { ok: true, data: cached };

    const inflight = inflightStorefronts.get(guidebookId);
    if (inflight) return inflight;
  }

  const promise = apiFetch<EditorStorefrontData>(
    `/api/guidebooks/${guidebookId}/storefront`
  ).then((result): EditorStorefrontLoadResult => {
    if (!result.ok) return { ok: false, error: result.error };
    setCachedEditorStorefront(guidebookId, result.data);
    return { ok: true, data: result.data };
  });

  if (!options.force) {
    inflightStorefronts.set(guidebookId, promise);
    promise.finally(() => {
      inflightStorefronts.delete(guidebookId);
    });
  }

  return promise;
}
