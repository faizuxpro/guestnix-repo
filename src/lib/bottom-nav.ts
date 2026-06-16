type BottomNavBuiltinType = "home" | "guide" | "nearby" | "host" | "store";
type BottomNavSlot =
  | { type: "home"; label: string; icon: string }
  | { type: "guide"; label: string; icon: string }
  | { type: "nearby"; label: string; icon: string }
  | { type: "host"; label: string; icon: string }
  | { type: "store"; label: string; icon: string }
  | { type: "section"; label: string; icon: string; sectionId: string }
  | { type: "link"; label: string; icon: string; url: string };

const BOTTOM_NAV_BUILTIN_TYPES = [
  "home",
  "guide",
  "nearby",
  "host",
  "store",
] as const satisfies readonly BottomNavBuiltinType[];
const BOTTOM_NAV_MIN = 2;
const BOTTOM_NAV_MAX = 5;
const BOTTOM_NAV_DEFAULTS: BottomNavSlot[] = [
  { type: "home", label: "Home", icon: "" },
  { type: "guide", label: "Guide", icon: "" },
  { type: "nearby", label: "Nearby", icon: "" },
  { type: "host", label: "Host", icon: "" },
];

export function isBottomNavBuiltinType(
  type: unknown
): type is BottomNavBuiltinType {
  return (
    typeof type === "string" &&
    (BOTTOM_NAV_BUILTIN_TYPES as readonly string[]).includes(type)
  );
}

export function hasDuplicateBuiltinSlots(
  slots: Array<{ type: unknown }>
): boolean {
  const seen = new Set<BottomNavBuiltinType>();
  for (const slot of slots) {
    if (!isBottomNavBuiltinType(slot.type)) continue;
    if (seen.has(slot.type)) return true;
    seen.add(slot.type);
  }
  return false;
}

export function filterInvalidSlots(
  slots: BottomNavSlot[],
  sectionIds: Set<string>
): BottomNavSlot[] {
  return slots.filter((s) => s.type !== "section" || sectionIds.has(s.sectionId));
}

export function parseStoredSlots(raw: unknown): BottomNavSlot[] {
  if (!Array.isArray(raw)) return BOTTOM_NAV_DEFAULTS;
  const out: BottomNavSlot[] = [];
  const seenBuiltins = new Set<BottomNavBuiltinType>();
  for (const v of raw) {
    if (!v || typeof v !== "object") continue;
    const slot = v as Record<string, unknown>;
    const type = slot.type;
    const label = typeof slot.label === "string" ? slot.label : "";
    const icon = typeof slot.icon === "string" ? slot.icon : "";
    if (isBottomNavBuiltinType(type)) {
      if (seenBuiltins.has(type)) continue;
      seenBuiltins.add(type);
      out.push({ type, label, icon });
    } else if (type === "section" && typeof slot.sectionId === "string") {
      out.push({ type, label, icon, sectionId: slot.sectionId });
    } else if (type === "link" && typeof slot.url === "string") {
      out.push({ type, label, icon, url: slot.url });
    }
  }
  if (out.length < BOTTOM_NAV_MIN) return BOTTOM_NAV_DEFAULTS;
  return out.slice(0, BOTTOM_NAV_MAX);
}

export { BOTTOM_NAV_DEFAULTS, BOTTOM_NAV_MIN, BOTTOM_NAV_MAX };
