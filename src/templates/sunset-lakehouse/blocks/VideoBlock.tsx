"use client";

import type { IframeHTMLAttributes } from "react";
import { AlertCircle } from "lucide-react";
import { buildVideoEmbed } from "@/lib/video-embed";
import type { VideoContent } from "../types";

type ReferrerPolicy =
  IframeHTMLAttributes<HTMLIFrameElement>["referrerPolicy"];

const REFERRER_POLICIES: readonly NonNullable<ReferrerPolicy>[] = [
  "",
  "no-referrer",
  "no-referrer-when-downgrade",
  "origin",
  "origin-when-cross-origin",
  "same-origin",
  "strict-origin",
  "strict-origin-when-cross-origin",
  "unsafe-url",
];

function safeReferrerPolicy(value: string | undefined): ReferrerPolicy {
  return REFERRER_POLICIES.includes(value as NonNullable<ReferrerPolicy>)
    ? (value as ReferrerPolicy)
    : undefined;
}

export function VideoBlock({ content }: { content: Partial<VideoContent> }) {
  const url = content.url?.trim();
  if (!url) return null;

  const video = buildVideoEmbed(url);

  return (
    <div className="sl-video">
      {video?.kind === "embed" ? (
        <div
          className="sl-video-frame"
          data-video-provider={video.provider}
          style={{ aspectRatio: video.aspectRatio }}
        >
          <iframe
            src={video.src}
            title="Video"
            loading="lazy"
            allow={video.allow}
            referrerPolicy={safeReferrerPolicy(video.referrerPolicy)}
            allowFullScreen={video.allowFullScreen}
          />
        </div>
      ) : video?.kind === "native" ? (
        <video
          className="sl-video-native"
          controls
          preload="metadata"
          src={video.src}
          style={{ aspectRatio: video.aspectRatio }}
        />
      ) : (
        <div className="sl-video-unavailable">
          <AlertCircle aria-hidden />
          <span>Video unavailable</span>
        </div>
      )}
    </div>
  );
}
