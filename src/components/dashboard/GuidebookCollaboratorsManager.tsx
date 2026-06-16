"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Crown,
  Loader2,
  RefreshCw,
  Send,
  Trash2,
  UserPlus,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/lib/api-fetch";
import { getInitials } from "@/lib/utils";
import { toastApiError } from "@/lib/toast-error";
import { toast } from "sonner";

type Collaborator = {
  id: string;
  role: string;
  acceptedAt: string;
  user: {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
};

type OwnershipTransfer = {
  id: string;
  toEmail: string;
  status: string;
  expiresAt: string;
};

type CollaboratorsResponse = {
  collaborators: Collaborator[];
  invitations: Invitation[];
  ownershipTransfers: OwnershipTransfer[];
};

type Props = {
  guidebookId: string;
};

export function GuidebookCollaboratorsManager({ guidebookId }: Props) {
  const [data, setData] = useState<CollaboratorsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [transferEmail, setTransferEmail] = useState("");
  const [keepPreviousOwner, setKeepPreviousOwner] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await apiFetch<CollaboratorsResponse>(
      `/api/guidebooks/${guidebookId}/collaborators`
    );
    setLoading(false);
    if (!result.ok) {
      toastApiError(result.error, {
        title: "Couldn't load collaborators",
      });
      return;
    }
    setData(result.data);
  }, [guidebookId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  async function sendInvite(email: string, mode: "invite" | "resend") {
    const trimmed = email.trim();
    if (!trimmed) return;
    setBusy(`${mode}:${trimmed}`);
    const result = await apiFetch(
      `/api/guidebooks/${guidebookId}/collaborators/invitations`,
      {
        method: "POST",
        body: { email: trimmed },
      }
    );
    setBusy(null);
    if (!result.ok) {
      toastApiError(result.error, {
        title: mode === "resend" ? "Couldn't resend invite" : "Couldn't invite editor",
      });
      return;
    }
    toast.success(mode === "resend" ? "Invite resent" : "Editor invited");
    setInviteEmail("");
    await load();
  }

  async function remove(id: string, kind: "collaborator" | "invitation") {
    setBusy(`${kind}:${id}`);
    const result = await apiFetch(
      `/api/guidebooks/${guidebookId}/collaborators/${id}`,
      { method: "DELETE" }
    );
    setBusy(null);
    if (!result.ok) {
      toastApiError(result.error, {
        title: kind === "invitation" ? "Couldn't revoke invite" : "Couldn't remove editor",
      });
      return;
    }
    toast.success(kind === "invitation" ? "Invite revoked" : "Editor removed");
    await load();
  }

  async function requestTransfer() {
    const email = transferEmail.trim();
    if (!email) return;
    setBusy("transfer");
    const result = await apiFetch(`/api/guidebooks/${guidebookId}/ownership-transfer`, {
      method: "POST",
      body: {
        email,
        keepPreviousOwnerAsEditor: keepPreviousOwner,
      },
    });
    setBusy(null);
    if (!result.ok) {
      toastApiError(result.error, { title: "Couldn't request transfer" });
      return;
    }
    toast.success("Ownership transfer sent");
    setTransferEmail("");
    await load();
  }

  const collaborators = data?.collaborators ?? [];
  const invitations = data?.invitations ?? [];
  const transfers = data?.ownershipTransfers ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4" />
          Collaborators
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex gap-2">
          <Input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="editor@example.com"
          />
          <Button
            onClick={() => void sendInvite(inviteEmail, "invite")}
            disabled={busy !== null || !inviteEmail.trim()}
          >
            {busy?.startsWith("invite:") ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Invite
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading collaborators...
          </div>
        ) : null}

        {!loading && collaborators.length === 0 && invitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No editors have been invited yet.
          </p>
        ) : null}

        {collaborators.length > 0 ? (
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">
              Active editors
            </Label>
            {collaborators.map((collaborator) => (
              <div
                key={collaborator.id}
                className="flex items-center justify-between gap-3 rounded-md border p-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar size="sm">
                    <AvatarImage src={collaborator.user.avatarUrl ?? undefined} />
                    <AvatarFallback>
                      {getInitials(collaborator.user.fullName ?? collaborator.user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {collaborator.user.fullName ?? collaborator.user.email}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {collaborator.user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Editor</Badge>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove editor"
                    onClick={() => void remove(collaborator.id, "collaborator")}
                    disabled={busy !== null}
                  >
                    {busy === `collaborator:${collaborator.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {invitations.length > 0 ? (
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">
              Pending invitations
            </Label>
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between gap-3 rounded-md border p-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{invitation.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Resend invite"
                    onClick={() => void sendInvite(invitation.email, "resend")}
                    disabled={busy !== null}
                  >
                    {busy === `resend:${invitation.email}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Revoke invite"
                    onClick={() => void remove(invitation.id, "invitation")}
                    disabled={busy !== null}
                  >
                    {busy === `invitation:${invitation.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <Separator />

        <div className="space-y-3">
          <div>
            <Label className="flex items-center gap-2 text-sm">
              <Crown className="h-4 w-4" />
              Transfer ownership
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              The recipient must already have a Guestnix account.
            </p>
          </div>
          {transfers.length > 0 ? (
            <div className="space-y-2">
              {transfers.map((transfer) => (
                <div
                  key={transfer.id}
                  className="rounded-md border bg-muted/30 p-2 text-sm"
                >
                  Pending transfer to{" "}
                  <span className="font-medium">{transfer.toEmail}</span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex gap-2">
            <Input
              type="email"
              value={transferEmail}
              onChange={(e) => setTransferEmail(e.target.value)}
              placeholder="new-owner@example.com"
            />
            <Button
              variant="outline"
              onClick={() => void requestTransfer()}
              disabled={busy !== null || !transferEmail.trim()}
            >
              {busy === "transfer" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send
            </Button>
          </div>
          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={keepPreviousOwner}
              onCheckedChange={(checked) => setKeepPreviousOwner(checked === true)}
              className="mt-0.5"
            />
            Keep me as an editor after transfer
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
