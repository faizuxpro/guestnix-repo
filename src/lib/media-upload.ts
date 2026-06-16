import crypto from "node:crypto";
import type { User } from "@supabase/supabase-js";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { hostAssets } from "@/lib/db/schema";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { productEvents } from "@/lib/analytics/product";
import { trackServerProductEvent } from "@/lib/analytics/posthog-server";

export const MEDIA_MAX_FILE_SIZE = 5 * 1024 * 1024;
export const DEFAULT_MEDIA_BUCKET = "guidebook-assets";
export const MEDIA_STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET?.trim() ||
  DEFAULT_MEDIA_BUCKET;

export const MEDIA_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
] as const;

export type MediaAllowedType = (typeof MEDIA_ALLOWED_TYPES)[number];

export type UploadedMediaAsset = typeof hostAssets.$inferSelect;

export type UploadUserMediaInput = {
  user: User;
  file: File;
  source?: string;
  name?: string | null;
  folder?: string | null;
  tags?: string[];
  trackEvent?: boolean;
};

export type ReplaceUserMediaInput = UploadUserMediaInput & {
  assetId: string;
};

function missingBucketMessage(message: string | undefined) {
  const normalized = message?.toLowerCase() ?? "";
  return (
    normalized.includes("not found") ||
    normalized.includes("does not exist") ||
    normalized.includes("no rows")
  );
}

export function validateMediaFile(file: File | null | undefined): string | null {
  if (!file) return "No file provided";

  const extension = file.name
    .split(".")
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const isIcoWithoutMime = !file.type && extension === "ico";

  if (
    !isIcoWithoutMime &&
    !MEDIA_ALLOWED_TYPES.includes(file.type as MediaAllowedType)
  ) {
    return "File type not allowed. Use JPEG, PNG, WebP, GIF, SVG, or ICO.";
  }

  if (file.size > MEDIA_MAX_FILE_SIZE) {
    return "File too large. Maximum size is 5 MB.";
  }

  return null;
}

function extensionForFile(file: File) {
  const extensionFromName = file.name
    .split(".")
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (extensionFromName && extensionFromName.length <= 8) {
    return extensionFromName;
  }

  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  if (file.type === "image/svg+xml") return "svg";
  if (
    file.type === "image/x-icon" ||
    file.type === "image/vnd.microsoft.icon" ||
    extensionFromName === "ico"
  ) {
    return "ico";
  }
  return "jpg";
}

function contentTypeForFile(file: File) {
  if (file.type) return file.type;
  return extensionForFile(file) === "ico" ? "image/x-icon" : "application/octet-stream";
}

function cleanFileBaseName(name: string) {
  const withoutExtension = name.replace(/\.[^.]+$/, "").trim();
  return withoutExtension || "Media asset";
}

function mediaContent(folder: string | null, source: string, path: string) {
  return {
    folder,
    source,
    storagePath: path,
  };
}

export async function ensureMediaStorageBucket() {
  const admin = createAdminClient();
  const { data: currentBucket, error: getBucketError } =
    await admin.storage.getBucket(MEDIA_STORAGE_BUCKET);

  if (currentBucket) return { admin, error: null as string | null };

  if (getBucketError && !missingBucketMessage(getBucketError.message)) {
    return { admin, error: getBucketError.message };
  }

  const { error: createBucketError } = await admin.storage.createBucket(
    MEDIA_STORAGE_BUCKET,
    {
      public: true,
      fileSizeLimit: MEDIA_MAX_FILE_SIZE,
    }
  );

  if (createBucketError) {
    const alreadyExists = createBucketError.message
      ?.toLowerCase()
      .includes("already exists");
    if (!alreadyExists) {
      return { admin, error: createBucketError.message };
    }
  }

  return { admin, error: null as string | null };
}

async function storeUserMediaFile(user: User, file: File) {
  const fileError = validateMediaFile(file);
  if (fileError) {
    throw new Error(fileError);
  }

  await ensureProfile(user);

  const { admin, error: bucketError } = await ensureMediaStorageBucket();
  if (bucketError) {
    throw new Error(`Storage bucket error (${MEDIA_STORAGE_BUCKET}): ${bucketError}`);
  }

  const extension = extensionForFile(file);
  const path = `${user.id}/media/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await admin.storage
    .from(MEDIA_STORAGE_BUCKET)
    .upload(path, file, {
      contentType: contentTypeForFile(file),
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(MEDIA_STORAGE_BUCKET).getPublicUrl(path);

  return { publicUrl, path };
}

async function trackMediaUpload(
  userId: string,
  file: File,
  source: string,
  trackEvent: boolean
) {
  if (!trackEvent) return;

  await trackServerProductEvent({
    distinctId: userId,
    event: productEvents.mediaUploaded,
    properties: {
      mime_type: file.type,
      source,
    },
  });
}

export async function uploadUserMediaAsset({
  user,
  file,
  source = "upload_api",
  name,
  folder,
  tags = [],
  trackEvent = true,
}: UploadUserMediaInput) {
  const { publicUrl, path } = await storeUserMediaFile(user, file);
  const normalizedFolder = folder?.trim() || null;
  const [asset] = await db
    .insert(hostAssets)
    .values({
      userId: user.id,
      assetType: "media",
      name: name?.trim() || cleanFileBaseName(file.name),
      description: null,
      content: mediaContent(normalizedFolder, source, path),
      fileUrl: publicUrl,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      tags,
    })
    .returning();

  await trackMediaUpload(user.id, file, source, trackEvent);

  return { url: publicUrl, asset, storagePath: path };
}

export async function replaceUserMediaAsset({
  user,
  file,
  assetId,
  source = "upload_api",
  name,
  folder,
  tags,
  trackEvent = true,
}: ReplaceUserMediaInput) {
  const { publicUrl, path } = await storeUserMediaFile(user, file);
  const normalizedFolder = folder?.trim() || null;

  const updates: Partial<typeof hostAssets.$inferInsert> = {
    content: mediaContent(normalizedFolder, source, path),
    fileUrl: publicUrl,
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
    updatedAt: new Date(),
  };

  if (name?.trim()) updates.name = name.trim();
  if (tags) updates.tags = tags;

  const [asset] = await db
    .update(hostAssets)
    .set(updates)
    .where(
      and(
        eq(hostAssets.id, assetId),
        eq(hostAssets.userId, user.id),
        eq(hostAssets.assetType, "media")
      )
    )
    .returning();

  if (!asset) {
    throw new Error("Media asset not found.");
  }

  await trackMediaUpload(user.id, file, source, trackEvent);

  return { url: publicUrl, asset, storagePath: path };
}
