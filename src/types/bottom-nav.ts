export type BottomNavBuiltinType = "home" | "guide" | "nearby" | "host" | "store";
export type BottomNavSlotType = BottomNavBuiltinType | "section" | "link";

export const BOTTOM_NAV_BUILTIN_TYPES = [
  "home",
  "guide",
  "nearby",
  "host",
  "store",
] as const satisfies readonly BottomNavBuiltinType[];

export type BottomNavSlot =
  | { type: "home";    label: string; icon: string }
  | { type: "guide";   label: string; icon: string }
  | { type: "nearby";  label: string; icon: string }
  | { type: "host";    label: string; icon: string }
  | { type: "store";   label: string; icon: string }
  | { type: "section"; label: string; icon: string; sectionId: string }
  | { type: "link";    label: string; icon: string; url: string };

export const BOTTOM_NAV_MIN = 2;
export const BOTTOM_NAV_MAX = 5;

export const BOTTOM_NAV_DEFAULTS: BottomNavSlot[] = [
  { type: "home",   label: "Home",   icon: "" },
  { type: "guide",  label: "Guide",  icon: "" },
  { type: "nearby", label: "Nearby", icon: "" },
  { type: "host",   label: "Host",   icon: "" },
];
