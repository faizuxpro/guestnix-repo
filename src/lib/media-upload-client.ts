import type { HostAsset } from "@/lib/assets-hub";

export type MediaUploadResponse = {
  url: string;
  asset?: HostAsset;
};

export type UploadMediaFileOptions = {
  endpoint?: string;
  folder?: string | null;
  name?: string | null;
  assetId?: string | null;
  tags?: string[];
  onProgress?: (progress: number) => void;
};

function appendOptional(formData: FormData, key: string, value?: string | null) {
  const trimmed = value?.trim();
  if (trimmed) formData.append(key, trimmed);
}

export function uploadMediaFile(
  file: File,
  {
    endpoint = "/api/upload",
    folder,
    name,
    assetId,
    tags,
    onProgress,
  }: UploadMediaFileOptions = {}
): Promise<MediaUploadResponse> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    appendOptional(formData, "folder", folder);
    appendOptional(formData, "name", name);
    appendOptional(formData, "assetId", assetId);
    if (tags?.length) {
      formData.append("tags", tags.join(","));
    }

    const request = new XMLHttpRequest();
    request.open("POST", endpoint);
    request.responseType = "json";

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.max(1, Math.min(99, Math.round((event.loaded / event.total) * 100))));
    };

    request.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    request.onabort = () => reject(new Error("Upload cancelled."));
    request.onload = () => {
      const data = request.response as MediaUploadResponse | { error?: unknown } | null;
      if (request.status < 200 || request.status >= 300) {
        const error =
          data && typeof data === "object" && "error" in data
            ? data.error
            : null;
        reject(
          new Error(
            typeof error === "string"
              ? error
              : "Upload failed. Please try again."
          )
        );
        return;
      }

      if (!data || typeof data !== "object" || !("url" in data) || typeof data.url !== "string") {
        reject(new Error("Upload response was missing a URL."));
        return;
      }

      onProgress?.(100);
      resolve(data as MediaUploadResponse);
    };

    request.send(formData);
  });
}
