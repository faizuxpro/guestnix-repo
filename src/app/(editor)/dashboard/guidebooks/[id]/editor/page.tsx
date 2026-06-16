import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  guidebooks,
  guidebookSections,
  guidebookBlocks,
} from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { EditorShell } from "@/components/editor/EditorShell";
import type { EditorSection } from "@/stores/editor-store";
import { parseStoredSlots } from "@/lib/bottom-nav";
import { normalizeHeroData } from "@/lib/hero-data";
import { requireGuidebookAccess } from "@/lib/guidebook-permissions";
import { redactGuidebookAccessSettingsForClient } from "@/lib/guidebook-access";
import { GuidebookUnavailableState } from "@/components/dashboard/GuidebookUnavailableState";
import { getEditorStorefrontData } from "@/lib/store/editor-storefront-data";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/dashboard/guidebooks/${id}/editor`);
  }

  const access = await requireGuidebookAccess(user.id, id, "editor");
  if (!access.ok) {
    return <GuidebookUnavailableState className="h-full min-h-full" />;
  }

  const guidebook = await db.query.guidebooks.findFirst({
    where: eq(guidebooks.id, id),
    with: {
      sections: {
        orderBy: [asc(guidebookSections.orderIndex)],
      },
    },
  });

  if (!guidebook) {
    return <GuidebookUnavailableState className="h-full min-h-full" />;
  }

  const [blocks, storefront] = await Promise.all([
    db
      .select()
      .from(guidebookBlocks)
      .where(eq(guidebookBlocks.guidebookId, id))
      .orderBy(asc(guidebookBlocks.orderIndex)),
    getEditorStorefrontData({
      guidebookId: id,
      ownerUserId: access.guidebook.userId,
    }),
  ]);

  const blocksBySection = new Map<string, typeof blocks>();
  for (const b of blocks) {
    const arr = blocksBySection.get(b.sectionId) ?? [];
    arr.push(b);
    blocksBySection.set(b.sectionId, arr);
  }

  const sections: EditorSection[] = guidebook.sections.map((s) => ({
    id: s.id,
    title: s.title,
    icon: s.icon,
    orderIndex: s.orderIndex,
    isVisible: s.isVisible,
    kind: "guide",
    displayMode: "popup",
    itemSettings: {},
    blocks: (blocksBySection.get(s.id) ?? []).map((b) => ({
      id: b.id,
      type: b.type,
      content: (b.content ?? {}) as Record<string, unknown>,
      orderIndex: b.orderIndex,
      isVisible: b.isVisible,
    })),
  }));

  const heroData = normalizeHeroData(guidebook.heroData);

  const initial = {
    guidebook: {
      id: guidebook.id,
      title: guidebook.title,
      slug: guidebook.slug,
      status: guidebook.status,
      accessRole: access.role,
      templateId: guidebook.templateId,
      branding: (guidebook.branding ?? {}) as Record<string, unknown>,
      settings: redactGuidebookAccessSettingsForClient(
        (guidebook.settings ?? {}) as Record<string, unknown>
      ),
      heroData,
      bottomNav: parseStoredSlots(guidebook.bottomNav),
      draftRevision: guidebook.draftRevision,
      publishedAt: guidebook.publishedAt
        ? guidebook.publishedAt.toISOString()
        : null,
      updatedAt: guidebook.updatedAt.toISOString(),
    },
    sections,
    storefront,
  };

  return <EditorShell initial={initial} />;
}
