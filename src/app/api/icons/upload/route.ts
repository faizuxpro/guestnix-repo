import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeSvg } from "@/lib/icons/sanitize";
import { productEvents } from "@/lib/analytics/product";
import { trackServerProductEvent } from "@/lib/analytics/posthog-server";

const MAX_FILE_SIZE = 20 * 1024;
const DEFAULT_BUCKET = "guidebook-assets";
const STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET?.trim() ||
  DEFAULT_BUCKET;

function injectUploadMeta(svg: string): string {
  if (!svg.startsWith("<svg")) return svg;
  const end = svg.indexOf(">");
  if (end === -1) return svg;
  const head = svg.slice(0, end);
  if (head.includes("data-source=")) return svg;
  return `${head} data-source="upload"${svg.slice(end)}`;
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "SVG too large (max 20KB)" }, { status: 400 });
  }

  const raw = await file.text();
  const trimmed = raw.trim();
  if (!trimmed.startsWith("<svg")) {
    return NextResponse.json({ error: "Not a valid SVG file" }, { status: 400 });
  }

  const sanitized = sanitizeSvg(trimmed);
  if (!sanitized) {
    return NextResponse.json({ error: "SVG content rejected by sanitizer" }, { status: 400 });
  }
  const withMeta = injectUploadMeta(sanitized);

  const admin = createAdminClient();
  const fileName = `${user.id}/icons/${nanoid(12)}.svg`;
  const { error: uploadError } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, withMeta, {
      contentType: "image/svg+xml",
      upsert: false,
    });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);

  await trackServerProductEvent({
    distinctId: user.id,
    event: productEvents.mediaUploaded,
    properties: {
      mime_type: "image/svg+xml",
      source: "icon_upload_api",
    },
  });

  return NextResponse.json(
    {
      id: fileName,
      svg: withMeta,
      url: publicUrl,
    },
    { status: 201 }
  );
}
