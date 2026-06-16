import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeSvg } from "@/lib/icons/sanitize";

const DEFAULT_BUCKET = "guidebook-assets";
const STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET?.trim() ||
  DEFAULT_BUCKET;

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const folder = `${user.id}/icons`;

  const { data: files, error: listError } = await admin.storage
    .from(STORAGE_BUCKET)
    .list(folder, { limit: 100, sortBy: { column: "created_at", order: "desc" } });

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  const items = await Promise.all(
    (files ?? []).filter((f) => f.name.endsWith(".svg")).map(async (f) => {
      const path = `${folder}/${f.name}`;
      const {
        data: { publicUrl },
      } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      const { data: blob } = await admin.storage.from(STORAGE_BUCKET).download(path);
      const raw = blob ? await blob.text() : "";
      const svg = sanitizeSvg(raw);
      return {
        id: path,
        url: publicUrl,
        svg,
        createdAt: f.created_at ?? null,
      };
    })
  );

  return NextResponse.json({ items: items.filter((i) => i.svg) });
}

export async function DELETE(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const expectedPrefix = `${user.id}/icons/`;
  if (!id.startsWith(expectedPrefix) || id.includes("..")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { error: removeError } = await admin.storage.from(STORAGE_BUCKET).remove([id]);
  if (removeError) {
    return NextResponse.json({ error: removeError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
