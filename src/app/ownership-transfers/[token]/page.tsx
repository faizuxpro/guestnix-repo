import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { eq } from "drizzle-orm";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { guidebookOwnershipTransfers, guidebooks } from "@/lib/db/schema";
import {
  hashCollaborationToken,
  isExpired,
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
        Open your dashboard to manage guidebooks you own or edit.
      </CardContent>
    </Card>
  );
}

export default async function OwnershipTransferPage({ params }: Props) {
  const { token } = await params;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/ownership-transfers/${encodeURIComponent(token)}`);
  }

  const tokenHash = hashCollaborationToken(token);
  const [row] = await db
    .select({
      transfer: guidebookOwnershipTransfers,
      guidebook: guidebooks,
    })
    .from(guidebookOwnershipTransfers)
    .innerJoin(guidebooks, eq(guidebooks.id, guidebookOwnershipTransfers.guidebookId))
    .where(eq(guidebookOwnershipTransfers.tokenHash, tokenHash))
    .limit(1);

  if (!row || row.transfer.status !== "pending") {
    return (
      <Shell>
        <UnavailableCard
          title="Transfer unavailable"
          message="This ownership transfer was already handled, canceled, or does not exist."
        />
      </Shell>
    );
  }

  const disabledReason =
    row.transfer.toUserId !== user.id
      ? "Sign in with the account this transfer was sent to."
      : isExpired(row.transfer.expiresAt)
        ? "This ownership transfer has expired. Ask the current owner to send a new request."
        : undefined;

  return (
    <Shell>
      <CollaborationTokenAction
        title="Review ownership transfer"
        description={`Accept ownership of "${row.guidebook.title}". Once accepted, you become the owner and the current owner becomes an editor unless they opted out.`}
        acceptEndpoint={`/api/ownership-transfers/${encodeURIComponent(token)}/accept`}
        acceptLabel="Accept ownership"
        cancelEndpoint={`/api/ownership-transfers/${encodeURIComponent(token)}/cancel`}
        disabledReason={disabledReason}
      />
    </Shell>
  );
}
