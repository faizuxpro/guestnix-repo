import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  uploadUserMediaAsset,
  validateMediaFile,
} from "@/lib/media-upload";

export const runtime = "nodejs";

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
    const uploaded = await uploadUserMediaAsset({
      user,
      file,
      source: "dashboard_store",
    });

    return NextResponse.json(
      { url: uploaded.url, asset: uploaded.asset },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
