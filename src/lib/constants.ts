export const APP_NAME = "Guestnix";

// Plan config + limits live in the billing module (single source of truth).
// Re-exported here for convenience / backwards-compatible imports.
export { PLAN_MAP, PLAN_LIMITS, PLAN_KEYS, type PlanKey } from "@/lib/billing/plans";

export const BLOCK_TYPES = {
  TEXT: "text",
  HEADING: "heading",
  IMAGE: "image",
  VIDEO: "video",
  GALLERY: "gallery",
  FAQ: "faq",
  ICON_GRID: "icon_grid",
  IMAGE_CARDS: "image_cards",
  TILE_SET: "tile_set",
  CUSTOM_HTML: "custom_html",
  DIVIDER: "divider",
  WIFI: "wifi",
  CONTAINER: "container",
  WEATHER: "weather",
  ADD_PLACES: "add_places",
  WORLD_CLOCK: "world_clock",
  SMART_LOCK: "smart_lock",
  BOOKING_LINK: "booking_link",
  CURRENCY: "currency",
  EMERGENCY_CONTACTS: "emergency_contacts",
  PHRASEBOOK: "phrasebook",
  BUTTON: "button",
  STREAMING: "streaming",
} as const;

export const PLACE_CATEGORIES = [
  "restaurant",
  "cafe",
  "bar",
  "grocery",
  "park",
  "beach",
  "attraction",
  "museum",
  "shopping",
  "pharmacy",
  "hospital",
  "transport",
  "gas_station",
  "gym",
  "other",
] as const;

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Guidebooks", href: "/dashboard/guidebooks", icon: "BookOpen" },
  { label: "Messages", href: "/dashboard/messages", icon: "MessageSquare" },
  { label: "Store", href: "/dashboard/store", icon: "ShoppingBag" },
  { label: "Assets Hub", href: "/dashboard/assets-hub", icon: "LibraryBig" },
  { label: "Analytics", href: "/dashboard/analytics", icon: "BarChart3" },
  { label: "Properties", href: "/dashboard/properties", icon: "Building2" },
  {
    label: "Admin",
    href: "/dashboard/admin/billing",
    icon: "Shield",
    adminOnly: true,
  },
  { label: "Settings", href: "/dashboard/settings", icon: "Settings" },
] as const;
