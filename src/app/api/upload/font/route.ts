import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { productEvents } from "@/lib/analytics/product";
import { trackServerProductEvent } from "@/lib/analytics/posthog-server";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const DEFAULT_BUCKET = "guidebook-assets";
const STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET?.trim() ||
  DEFAULT_BUCKET;

const ALLOWED_EXTENSIONS = ["woff2", "woff", "ttf", "otf"] as const;
type AllowedFontExt = (typeof ALLOWED_EXTENSIONS)[number];

const CONTENT_TYPE_BY_EXT: Record<AllowedFontExt, string> = {
  woff2: "font/woff2",
  woff: "font/woff",
  ttf: "font/ttf",
  otf: "font/otf",
};

async function ensureStorageBucket() {
  const admin = createAdminClient();
  const { data: currentBucket, error: getBucketError } = await admin.storage.getBucket(
    STORAGE_BUCKET
  );

  if (currentBucket) {
    // If the bucket was created earlier with an image-only MIME allowlist
    // (older versions of src/app/api/upload/route.ts did this), font uploads
    // get rejected at the bucket level — some browsers report .ttf/.otf as
    // application/octet-stream, which isn't on the list. Per-route validation
    // is the real gate, so clear the bucket-level restriction here.
    const existing = (currentBucket as { allowed_mime_types?: string[] | null })
      .allowed_mime_types;
    if (Array.isArray(existing) && existing.length > 0) {
      const { error: updateError } = await admin.storage.updateBucket(
        STORAGE_BUCKET,
        {
          public: true,
          fileSizeLimit: MAX_FILE_SIZE,
          allowedMimeTypes: null as unknown as string[],
        }
      );
      if (updateError) {
        return { admin, error: updateError.message };
      }
    }
    return { admin, error: null as string | null };
  }

  const getMessage = getBucketError?.message?.toLowerCase() ?? "";
  const missingBucket =
    getMessage.includes("not found") ||
    getMessage.includes("does not exist") ||
    getMessage.includes("no rows");

  if (!missingBucket && getBucketError) {
    return { admin, error: getBucketError.message };
  }

  const { error: createBucketError } = await admin.storage.createBucket(STORAGE_BUCKET, {
    public: true,
    fileSizeLimit: MAX_FILE_SIZE,
  });

  if (createBucketError) {
    const createMessage = createBucketError.message?.toLowerCase() ?? "";
    const alreadyExists = createMessage.includes("already exists");
    if (!alreadyExists) {
      return { admin, error: createBucketError.message };
    }
  }

  return { admin, error: null as string | null };
}

function parseExtension(filename: string): AllowedFontExt | null {
  const idx = filename.lastIndexOf(".");
  if (idx < 0) return null;
  const ext = filename.slice(idx + 1).toLowerCase();
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext)
    ? (ext as AllowedFontExt)
    : null;
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Browser-reported MIME for font files is unreliable across OSes, so we
  // validate by extension. The MIME header we send to Supabase is then derived
  // from the extension too.
  const ext = parseExtension(file.name);
  if (!ext) {
    return NextResponse.json(
      { error: "File type not allowed. Use .woff2, .woff, .ttf, or .otf." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 5 MB." },
      { status: 400 }
    );
  }

  const fileName = `${user.id}/fonts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { admin, error: bucketError } = await ensureStorageBucket();
  if (bucketError) {
    return NextResponse.json(
      { error: `Storage bucket error (${STORAGE_BUCKET}): ${bucketError}` },
      { status: 500 }
    );
  }

  const { error: uploadError } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, file, {
      contentType: CONTENT_TYPE_BY_EXT[ext],
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);

  await trackServerProductEvent({
    distinctId: user.id,
    event: productEvents.mediaUploaded,
    properties: {
      mime_type: CONTENT_TYPE_BY_EXT[ext],
      source: "font_upload_api",
    },
  });

  return NextResponse.json(
    { url: publicUrl, format: ext },
    { status: 201 }
  );
}
