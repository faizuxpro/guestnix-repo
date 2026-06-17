"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-fetch";
import { toastApiError } from "@/lib/toast-error";
import {
  RequestDetailPanel,
  type RequestDetail,
} from "../../StoreDashboardClient";

export function StoreRequestDetailPageClient({
  requestId,
}: {
  requestId: string;
}) {
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadRequest() {
    setLoading(true);
    const result = await apiFetch<{ request: RequestDetail }>(
      `/api/dashboard/store/requests/${requestId}`
    );
    setLoading(false);
    if (!result.ok) {
      toastApiError(result.error, { title: "Couldn't load request" });
      return;
    }
    setRequest(result.data.request);
  }

  async function updateRequest(patch: Record<string, unknown>) {
    if (!request) return;
    const result = await apiFetch<{ request: RequestDetail }>(
      `/api/dashboard/store/requests/${request.id}`,
      {
        method: "PATCH",
        body: patch,
      }
    );
    if (!result.ok) {
      toastApiError(result.error, { title: "Couldn't update request" });
      return;
    }
    setRequest(result.data.request);
  }

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!request || !reply.trim()) return;
    const result = await apiFetch(
      `/api/dashboard/store/requests/${request.id}/messages`,
      {
        method: "POST",
        body: { content: reply },
      }
    );
    if (!result.ok) {
      toastApiError(result.error, { title: "Couldn't send reply" });
      return;
    }
    setReply("");
    await loadRequest();
  }

  useEffect(() => {
    void loadRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  return (
    <div className="min-h-full overflow-y-auto bg-muted/20 p-5">
      <div className="mx-auto grid max-w-[1600px] gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/dashboard/store" />}
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to queue
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadRequest()}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>

        {loading && !request ? (
          <div className="grid min-h-[420px] place-items-center rounded-lg border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
            Loading request...
          </div>
        ) : request ? (
          <RequestDetailPanel
            request={request}
            reply={reply}
            setReply={setReply}
            updateRequest={updateRequest}
            sendReply={sendReply}
          />
        ) : (
          <div className="grid min-h-[420px] place-items-center rounded-lg border border-dashed border-border bg-muted/20 text-center">
            <div>
              <p className="font-medium">Request not available.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                It may have been deleted or you may not have access.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
