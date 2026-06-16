import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  replaceUserMediaAsset,
  uploadUserMediaAsset,
  validateMediaFile,
} from "@/lib/media-upload";

export const runtime = "nodejs";

function parseTags(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 24);
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

  const fileError = validateMediaFile(file);
  if (fileError || !file) {
    return NextResponse.json(
      { error: fileError ?? "No file provided" },
      { status: 400 }
    );
  }

  try {
    const name = typeof formData.get("name") === "string"
      ? (formData.get("name") as string)
      : null;
    const folder = typeof formData.get("folder") === "string"
      ? (formData.get("folder") as string)
      : null;
    const tags = parseTags(formData.get("tags"));
    const assetId = typeof formData.get("assetId") === "string"
      ? (formData.get("assetId") as string)
      : null;

    const uploadInput = {
      user,
      file,
      source: "upload_api",
      name,
      folder,
      tags,
    };

    const uploaded = assetId
      ? await replaceUserMediaAsset({
          ...uploadInput,
          assetId,
        })
      : await uploadUserMediaAsset(uploadInput);

    return NextResponse.json(
      { url: uploaded.url, asset: uploaded.asset },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
