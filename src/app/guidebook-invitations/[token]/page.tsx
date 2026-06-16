import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { eq } from "drizzle-orm";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { guidebookInvitations, guidebooks } from "@/lib/db/schema";
import {
  hashCollaborationToken,
  isExpired,
  normalizeInviteEmail,
} from "@/lib/guidebook-permissions";
import { CollaborationTokenAction } from "@/components/dashboard/CollaborationTokenAction";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = { params: Promise<{ token: string }> };

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      {children}
    </main>
  );
}

function UnavailableCard({ title, message }: { title: string; message: string }) {
  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Open your dashboard to manage guidebooks you can access.
      </CardContent>
    </Card>
  );
}

export default async function GuidebookInvitationPage({ params }: Props) {
  const { token } = await params;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/guidebook-invitations/${encodeURIComponent(token)}`);
  }

  const tokenHash = hashCollaborationToken(token);
  const [row] = await db
    .select({
      invitation: guidebookInvitations,
      guidebook: guidebooks,
    })
    .from(guidebookInvitations)
    .innerJoin(guidebooks, eq(guidebooks.id, guidebookInvitations.guidebookId))
    .where(eq(guidebookInvitations.tokenHash, tokenHash))
    .limit(1);

  if (!row || row.invitation.status !== "pending") {
    return (
      <Shell>
        <UnavailableCard
          title="Invitation unavailable"
          message="This invitation was already used, revoked, or does not exist."
        />
      </Shell>
    );
  }

  const disabledReason =
    normalizeInviteEmail(user.email ?? "") !==
    normalizeInviteEmail(row.invitation.email)
      ? `This invitation was sent to ${row.invitation.email}. Sign in with that email to accept it.`
      : isExpired(row.invitation.expiresAt)
        ? "This invitation has expired. Ask the guidebook owner to resend it."
        : undefined;

  return (
    <Shell>
      <CollaborationTokenAction
        title="Accept guidebook invitation"
        description={`You have been invited to edit "${row.guidebook.title}".`}
        acceptEndpoint={`/api/guidebook-invitations/${encodeURIComponent(token)}/accept`}
        acceptLabel="Accept invitation"
        disabledReason={disabledReason}
      />
    </Shell>
  );
}
