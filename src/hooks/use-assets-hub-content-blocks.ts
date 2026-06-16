"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import type { HostAsset, HostAssetType } from "@/lib/assets-hub";

export function useAssetsHubAssets(type?: HostAssetType) {
  const [assets, setAssets] = useState<HostAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const path = type ? `/api/assets-hub?type=${type}` : "/api/assets-hub";
    const result = await apiFetch<HostAsset[]>(path);
    setLoading(false);

    if (result.ok) {
      setAssets(result.data);
    }
  }, [type]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refetch();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refetch]);

  return { assets, loading, refetch };
}

export function useAssetsHubContentBlocks() {
  return useAssetsHubAssets("content_block");
}

export function useAssetsHubSectionTemplates() {
  return useAssetsHubAssets("section_template");
}
