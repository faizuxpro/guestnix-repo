import { createAdminClient } from "@/lib/supabase/admin";

type StoreRequestUpdateKind =
  | "host_message"
  | "status_update"
  | "payment_update"
  | "fulfilled"
  | "cancelled";

export async function broadcastStoreRequestUpdate(input: {
  requestId: string;
  kind: StoreRequestUpdateKind;
  updatedAt: Date;
}) {
  const admin = createAdminClient();
  await admin.channel(`store_request:${input.requestId}`).send({
    type: "broadcast",
    event: "request_update",
    payload: {
      requestId: input.requestId,
      kind: input.kind,
      updatedAt: input.updatedAt.toISOString(),
    },
  });
}
