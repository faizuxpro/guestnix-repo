import type { Metadata } from "next";
import { Suspense } from "react";
import { StoreRequestDetailPageClient } from "./StoreRequestDetailPageClient";

export const metadata: Metadata = {
  title: "Store request | Guestnix",
};

export default async function DashboardStoreRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;

  return (
    <Suspense fallback={null}>
      <StoreRequestDetailPageClient requestId={requestId} />
    </Suspense>
  );
}
