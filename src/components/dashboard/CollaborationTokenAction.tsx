"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiFetch } from "@/lib/api-fetch";
import { toastApiError } from "@/lib/toast-error";
import { toast } from "sonner";

type Props = {
  title: string;
  description: string;
  acceptEndpoint: string;
  acceptLabel: string;
  cancelEndpoint?: string;
  disabledReason?: string;
};

export function CollaborationTokenAction({
  title,
  description,
  acceptEndpoint,
  acceptLabel,
  cancelEndpoint,
  disabledReason,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "cancel" | null>(null);

  async function accept() {
    setBusy("accept");
    const result = await apiFetch<{ editorUrl?: string }>(acceptEndpoint, {
      method: "POST",
    });
    setBusy(null);

    if (!result.ok) {
      toastApiError(result.error, { title: "Couldn't accept" });
      return;
    }

    toast.success("Accepted");
    router.push(result.data.editorUrl ?? "/dashboard/guidebooks");
  }

  async function cancel() {
    if (!cancelEndpoint) return;
    setBusy("cancel");
    const result = await apiFetch(cancelEndpoint, {
      method: "POST",
      parseJson: false,
    });
    setBusy(null);

    if (!result.ok) {
      toastApiError(result.error, { title: "Couldn't cancel" });
      return;
    }

    toast.success("Canceled");
    router.push("/dashboard/guidebooks");
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {disabledReason ? (
        <CardContent>
          <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
            {disabledReason}
          </p>
        </CardContent>
      ) : null}
      <CardFooter className="flex flex-wrap justify-end gap-2">
        {cancelEndpoint ? (
          <Button
            variant="outline"
            onClick={() => void cancel()}
            disabled={busy !== null}
          >
            {busy === "cancel" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Decline
          </Button>
        ) : null}
        <Button
          onClick={() => void accept()}
          disabled={busy !== null || Boolean(disabledReason)}
        >
          {busy === "accept" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {acceptLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}
