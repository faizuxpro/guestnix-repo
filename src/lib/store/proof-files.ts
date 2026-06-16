import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeSafeUrl } from "@/lib/safe-url";

export const STORE_PROOF_VALUE_PREFIX = "store-proof:";
export const STORE_PROOF_MAX_FILE_SIZE = 5 * 1024 * 1024;
export const STORE_PROOF_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;
type StoreProofMimeType = (typeof STORE_PROOF_ALLOWED_TYPES)[number];

const DEFAULT_PROOF_BUCKET = "store-request-proofs";
const BARE_DOMAIN_RE = /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(?:[/?#:]|$)/i;

function storeProofBucket() {
  return (
    process.env.SUPABASE_STORE_PROOF_BUCKET?.trim() ||
    process.env.STORE_PROOF_STORAGE_BUCKET?.trim() ||
    DEFAULT_PROOF_BUCKET
  );
}

function missingBucketMessage(message: string | undefined) {
  const normalized = message?.toLowerCase() ?? "";
  return (
    normalized.includes("not found") ||
    normalized.includes("does not exist") ||
    normalized.includes("no rows")
  );
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

  if (file.type === "application/pdf") return "pdf";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

export function storeProofStorageValue(path: string) {
  return `${STORE_PROOF_VALUE_PREFIX}${path}`;
}

export function parseStoreProofStoragePath(value: string | null | undefined) {
  if (!value?.startsWith(STORE_PROOF_VALUE_PREFIX)) {
    return null;
  }

  const path = value.slice(STORE_PROOF_VALUE_PREFIX.length);
  return path.length > 0 ? path : null;
}

function normalizeExternalProofUrl(value: string) {
  const safe = normalizeSafeUrl(value, {
    allowRelative: false,
    protocols: new Set(["http:", "https:"]),
  });
  if (safe) return safe;

  const trimmed = value.trim();
  if (!BARE_DOMAIN_RE.test(trimmed)) return null;
  return normalizeSafeUrl(`https://${trimmed}`, {
    allowRelative: false,
    protocols: new Set(["http:", "https:"]),
  });
}

export function storeProofUrlForGuest(input: {
  proofValue: string | null;
  slug: string;
  token: string;
}) {
  if (!input.proofValue) return null;
  if (!parseStoreProofStoragePath(input.proofValue)) {
    return normalizeExternalProofUrl(input.proofValue);
  }

  return `/api/g/${encodeURIComponent(
    input.slug
  )}/store/requests/${encodeURIComponent(input.token)}/proof`;
}

export function storeProofUrlForHost(input: {
  proofValue: string | null;
  requestId: string;
}) {
  if (!input.proofValue) return null;
  if (!parseStoreProofStoragePath(input.proofValue)) {
    return normalizeExternalProofUrl(input.proofValue);
  }

  return `/api/dashboard/store/requests/${encodeURIComponent(
    input.requestId
  )}/proof`;
}

export function validateStoreProofFile(file: File | null) {
  if (!file) {
    return "No file provided";
  }

  if (!STORE_PROOF_ALLOWED_TYPES.includes(file.type as StoreProofMimeType)) {
    return "File type not allowed. Use an image or PDF.";
  }

  if (file.size > STORE_PROOF_MAX_FILE_SIZE) {
    return "File too large. Maximum size is 5 MB.";
  }

  return null;
}

export async function ensureStoreProofBucket() {
  const admin = createAdminClient();
  const bucket = storeProofBucket();
  const { data: currentBucket, error: getBucketError } =
    await admin.storage.getBucket(bucket);

  if (currentBucket) {
    return { admin, bucket, error: null as string | null };
  }

  if (getBucketError && !missingBucketMessage(getBucketError.message)) {
    return { admin, bucket, error: getBucketError.message };
  }

  const { error: createBucketError } = await admin.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: STORE_PROOF_MAX_FILE_SIZE,
    allowedMimeTypes: [...STORE_PROOF_ALLOWED_TYPES],
  });

  if (createBucketError) {
    const alreadyExists = createBucketError.message
      ?.toLowerCase()
      .includes("already exists");
    if (!alreadyExists) {
      return { admin, bucket, error: createBucketError.message };
    }
  }

  return { admin, bucket, error: null as string | null };
}

export async function uploadStoreProofFile(input: {
  requestId: string;
  file: File;
}) {
  const { admin, bucket, error } = await ensureStoreProofBucket();
  if (error) {
    throw new Error(`Storage bucket error (${bucket}): ${error}`);
  }

  const extension = extensionForFile(input.file);
  const path = `${input.requestId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await admin.storage
    .from(bucket)
    .upload(path, input.file, {
      contentType: input.file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  return {
    bucket,
    path,
    proofValue: storeProofStorageValue(path),
  };
}

export async function createStoreProofSignedUrl(proofValue: string) {
  const path = parseStoreProofStoragePath(proofValue);
  if (!path) {
    return proofValue;
  }

  const { admin, bucket, error } = await ensureStoreProofBucket();
  if (error) {
    throw new Error(`Storage bucket error (${bucket}): ${error}`);
  }

  const { data, error: signedUrlError } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, 60);

  if (signedUrlError || !data?.signedUrl) {
    throw new Error(signedUrlError?.message ?? "Could not create proof link");
  }

  return data.signedUrl;
}
