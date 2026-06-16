const GUEST_AVATAR_PALETTE = [
  { background: "#EEF4FF", foreground: "#4D7CFF" },
  { background: "#FFF8E8", foreground: "#FFB020" },
  { background: "#ECFFF5", foreground: "#1FBF8F" },
  { background: "#F4F7F8", foreground: "#6B7C85" },
  { background: "#FFF3EE", foreground: "#FF6B3D" },
  { background: "#FFF1F5", foreground: "#FF4D7D" },
  { background: "#F3F0FF", foreground: "#7C5CFF" },
  { background: "#F6F1EA", foreground: "#B07A4A" },
];

function hashSeed(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function guestInitials(name: string | null | undefined, fallback = "G") {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function guestAvatarStyle(seed: string | null | undefined) {
  const palette =
    GUEST_AVATAR_PALETTE[hashSeed(seed || "guest") % GUEST_AVATAR_PALETTE.length];

  return {
    backgroundColor: palette.background,
    color: palette.foreground,
    borderColor: `${palette.foreground}33`,
  };
}
