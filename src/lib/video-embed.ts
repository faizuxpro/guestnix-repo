export type VideoProvider =
  | "youtube"
  | "vimeo"
  | "dailymotion"
  | "tiktok"
  | "facebook"
  | "instagram"
  | "loom"
  | "direct"
  | "embed";

export type VideoEmbed =
  | {
      kind: "embed";
      provider: Exclude<VideoProvider, "direct">;
      src: string;
      aspectRatio: string;
      allow?: string;
      referrerPolicy?: string;
      allowFullScreen: boolean;
    }
  | {
      kind: "native";
      provider: "direct";
      src: string;
      aspectRatio: string;
    }
  | { kind: "unsupported"; href: string };

export function withHttpProtocol(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function detectVideoProvider(value: string): VideoProvider | null {
  const normalized = value.toLowerCase();
  if (!normalized.trim()) return null;
  if (
    normalized.includes("youtube.com") ||
    normalized.includes("youtube-nocookie.com") ||
    normalized.includes("youtu.be")
  ) {
    return "youtube";
  }
  if (normalized.includes("vimeo.com")) return "vimeo";
  if (normalized.includes("dailymotion.com") || normalized.includes("dai.ly")) {
    return "dailymotion";
  }
  if (normalized.includes("tiktok.com")) return "tiktok";
  if (normalized.includes("facebook.com") || normalized.includes("fb.watch")) {
    return "facebook";
  }
  if (normalized.includes("instagram.com")) return "instagram";
  if (normalized.includes("loom.com")) return "loom";
  if (isDirectVideoUrl(normalized)) return "direct";
  return null;
}

export function buildVideoEmbed(value: string): VideoEmbed | null {
  const iframe = parseIframeEmbed(value);
  if (iframe) return iframe;

  const href = withHttpProtocol(value);
  if (!href || !isSafeHttpUrl(href)) return null;

  const provider = detectVideoProvider(href);

  if (provider === "youtube") {
    const details = youtubeDetails(href);
    return details
      ? {
          kind: "embed",
          provider: "youtube",
          src: details.src,
          aspectRatio: "16 / 9",
          allow: DEFAULT_IFRAME_ALLOW,
          allowFullScreen: true,
        }
      : { kind: "unsupported", href };
  }

  if (provider === "vimeo") {
    const id = vimeoId(href);
    return id
      ? {
          kind: "embed",
          provider: "vimeo",
          src: `https://player.vimeo.com/video/${id}${searchSuffix(href)}`,
          aspectRatio: "16 / 9",
          allow: DEFAULT_IFRAME_ALLOW,
          allowFullScreen: true,
        }
      : { kind: "unsupported", href };
  }

  if (provider === "dailymotion") {
    const id = dailymotionId(href);
    return id
      ? {
          kind: "embed",
          provider: "dailymotion",
          src: `https://www.dailymotion.com/embed/video/${id}${searchSuffix(href)}`,
          aspectRatio: "16 / 9",
          allow: DEFAULT_IFRAME_ALLOW,
          allowFullScreen: true,
        }
      : { kind: "unsupported", href };
  }

  if (provider === "tiktok") {
    const id = tiktokId(href);
    return id
      ? {
          kind: "embed",
          provider: "tiktok",
          src: `https://www.tiktok.com/embed/v2/${id}`,
          aspectRatio: "9 / 16",
          allow: DEFAULT_IFRAME_ALLOW,
          allowFullScreen: true,
        }
      : { kind: "unsupported", href };
  }

  if (provider === "facebook") {
    return /(?:facebook\.com|fb\.watch)/i.test(href)
      ? {
          kind: "embed",
          provider: "facebook",
          src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(href)}&show_text=false`,
          aspectRatio: "16 / 9",
          allow: DEFAULT_IFRAME_ALLOW,
          allowFullScreen: true,
        }
      : { kind: "unsupported", href };
  }

  if (provider === "instagram") {
    const embedPath = instagramEmbedPath(href);
    return embedPath
      ? {
          kind: "embed",
          provider: "instagram",
          src: `https://www.instagram.com/${embedPath}/embed`,
          aspectRatio: "9 / 16",
          allow: DEFAULT_IFRAME_ALLOW,
          allowFullScreen: true,
        }
      : { kind: "unsupported", href };
  }

  if (provider === "loom") {
    const id = loomId(href);
    return id
      ? {
          kind: "embed",
          provider: "loom",
          src: `https://www.loom.com/embed/${id}${searchSuffix(href)}`,
          aspectRatio: "16 / 9",
          allow: DEFAULT_IFRAME_ALLOW,
          allowFullScreen: true,
        }
      : { kind: "unsupported", href };
  }

  if (provider === "direct" && isDirectVideoUrl(href)) {
    return {
      kind: "native",
      provider: "direct",
      src: href,
      aspectRatio: "16 / 9",
    };
  }

  return null;
}

const DEFAULT_IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

function parseIframeEmbed(value: string): VideoEmbed | null {
  const match = /<iframe\b([^>]*)>/i.exec(value);
  if (!match) return null;

  const attrs = readHtmlAttributes(match[1]);
  const src = decodeHtmlAttribute(attrs.src ?? "");
  if (!src || !isSafeHttpUrl(src)) return null;

  const provider = detectVideoProvider(src);
  const width = numericAttribute(attrs.width);
  const height = numericAttribute(attrs.height);
  const allowFullScreenValue = attrs.allowfullscreen?.toLowerCase();

  return {
    kind: "embed",
    provider: provider && provider !== "direct" ? provider : "embed",
    src,
    aspectRatio: width && height ? `${width} / ${height}` : defaultAspect(provider),
    allow: decodeHtmlAttribute(attrs.allow ?? "") || DEFAULT_IFRAME_ALLOW,
    referrerPolicy: decodeHtmlAttribute(attrs.referrerpolicy ?? ""),
    allowFullScreen:
      allowFullScreenValue === undefined ||
      allowFullScreenValue === "" ||
      allowFullScreenValue === "true",
  };
}

function readHtmlAttributes(source: string) {
  const attrs: Record<string, string> = {};
  const pattern =
    /([a-zA-Z][\w:-]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source))) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }

  return attrs;
}

function youtubeDetails(url: string): { src: string } | null {
  try {
    const parsed = new URL(withHttpProtocol(url));
    const host = parsed.hostname.replace(/^www\./, "");
    const isNoCookie = host.includes("youtube-nocookie.com");
    const embedHost = isNoCookie
      ? "www.youtube-nocookie.com"
      : "www.youtube.com";

    if (host === "youtu.be") {
      const id = cleanId(parsed.pathname.slice(1));
      return id
        ? { src: `https://${embedHost}/embed/${id}${queryWithout(parsed, [])}` }
        : null;
    }

    if (!host.includes("youtube.com") && !host.includes("youtube-nocookie.com")) {
      return null;
    }

    const watchId = parsed.searchParams.get("v");
    if (watchId) {
      return {
        src: `https://${embedHost}/embed/${watchId}${queryWithout(parsed, ["v"])}`,
      };
    }

    const match = /^\/(?:embed|shorts|live)\/([^/?#]+)/i.exec(parsed.pathname);
    const id = cleanId(match?.[1]);
    return id
      ? { src: `https://${embedHost}/embed/${id}${queryWithout(parsed, [])}` }
      : null;
  } catch {
    return null;
  }
}

function vimeoId(url: string): string | null {
  const match = /vimeo\.com\/(?:video\/)?(\d+)/i.exec(url);
  return cleanId(match?.[1]);
}

function dailymotionId(url: string): string | null {
  const match = /(?:dailymotion\.com\/video|dai\.ly)\/([^_/?#]+)/i.exec(url);
  return cleanId(match?.[1]);
}

function tiktokId(url: string): string | null {
  const match = /tiktok\.com\/(?:@[^/]+\/)?video\/(\d+)/i.exec(url);
  return cleanId(match?.[1]);
}

function instagramEmbedPath(url: string): string | null {
  const match = /instagram\.com\/(p|reel|tv)\/([^/?#]+)/i.exec(url);
  const type = cleanId(match?.[1]);
  const code = cleanId(match?.[2]);
  return type && code ? `${type}/${code}` : null;
}

function loomId(url: string): string | null {
  const match = /loom\.com\/(?:share|embed)\/([^/?#]+)/i.exec(url);
  return cleanId(match?.[1]);
}

function queryWithout(url: URL, omittedKeys: string[]) {
  const next = new URLSearchParams(url.searchParams);
  omittedKeys.forEach((key) => next.delete(key));
  const query = next.toString();
  return query ? `?${query}` : "";
}

function searchSuffix(url: string) {
  try {
    const parsed = new URL(withHttpProtocol(url));
    return parsed.search;
  } catch {
    return "";
  }
}

function defaultAspect(provider: VideoProvider | null) {
  return provider === "tiktok" || provider === "instagram" ? "9 / 16" : "16 / 9";
}

function isDirectVideoUrl(url: string) {
  return /\.(mp4|webm|ogg|mov)(?:[?#].*)?$/i.test(url);
}

function isSafeHttpUrl(url: string) {
  try {
    const parsed = new URL(withHttpProtocol(url));
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function numericAttribute(value: string | undefined) {
  if (!value) return null;
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function decodeHtmlAttribute(value: string) {
  return value
    .trim()
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanId(value: string | undefined | null) {
  return value?.trim() || null;
}
