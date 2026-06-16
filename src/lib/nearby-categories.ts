import { PLACE_CATEGORIES } from "@/lib/constants";
import { DEFAULT_ICONS } from "@/lib/icons/defaults";

export type NearbyCategory = (typeof PLACE_CATEGORIES)[number];

export type NearbyCategoryMeta = {
  label: string;
  /** Inline sanitized SVG markup. Use with HostIcon or render directly. */
  icon: string;
  color: string;
  soft: string;
};

const META: Record<NearbyCategory, NearbyCategoryMeta> = {
  restaurant: {
    label: "Restaurant",
    icon: DEFAULT_ICONS.PLACE_RESTAURANT,
    color: "#E74C3C",
    soft: "rgba(231, 76, 60, 0.14)",
  },
  cafe: {
    label: "Cafe",
    icon: DEFAULT_ICONS.PLACE_CAFE,
    color: "#8E44AD",
    soft: "rgba(142, 68, 173, 0.14)",
  },
  bar: {
    label: "Bar",
    icon: DEFAULT_ICONS.PLACE_BAR,
    color: "#9B59B6",
    soft: "rgba(155, 89, 182, 0.14)",
  },
  grocery: {
    label: "Grocery",
    icon: DEFAULT_ICONS.PLACE_GROCERY,
    color: "#27AE60",
    soft: "rgba(39, 174, 96, 0.14)",
  },
  park: {
    label: "Park",
    icon: DEFAULT_ICONS.PLACE_PARK,
    color: "#27AE60",
    soft: "rgba(39, 174, 96, 0.14)",
  },
  beach: {
    label: "Beach",
    icon: DEFAULT_ICONS.PLACE_BEACH,
    color: "#3498DB",
    soft: "rgba(52, 152, 219, 0.14)",
  },
  attraction: {
    label: "Attraction",
    icon: DEFAULT_ICONS.PLACE_ATTRACTION,
    color: "#9B59B6",
    soft: "rgba(155, 89, 182, 0.14)",
  },
  museum: {
    label: "Museum",
    icon: DEFAULT_ICONS.PLACE_MUSEUM,
    color: "#3498DB",
    soft: "rgba(52, 152, 219, 0.14)",
  },
  shopping: {
    label: "Shopping",
    icon: DEFAULT_ICONS.PLACE_SHOPPING,
    color: "#F39C12",
    soft: "rgba(243, 156, 18, 0.14)",
  },
  pharmacy: {
    label: "Pharmacy",
    icon: DEFAULT_ICONS.PLACE_PHARMACY,
    color: "#E74C3C",
    soft: "rgba(231, 76, 60, 0.14)",
  },
  hospital: {
    label: "Hospital",
    icon: DEFAULT_ICONS.PLACE_HOSPITAL,
    color: "#E74C3C",
    soft: "rgba(231, 76, 60, 0.14)",
  },
  transport: {
    label: "Transport",
    icon: DEFAULT_ICONS.PLACE_TRANSPORT,
    color: "#7F8C8D",
    soft: "rgba(127, 140, 141, 0.14)",
  },
  gas_station: {
    label: "Gas Station",
    icon: DEFAULT_ICONS.PLACE_GAS_STATION,
    color: "#D35400",
    soft: "rgba(211, 84, 0, 0.14)",
  },
  gym: {
    label: "Gym",
    icon: DEFAULT_ICONS.PLACE_GYM,
    color: "#27AE60",
    soft: "rgba(39, 174, 96, 0.14)",
  },
  other: {
    label: "Other",
    icon: DEFAULT_ICONS.PLACE_OTHER,
    color: "#7F8C8D",
    soft: "rgba(127, 140, 141, 0.14)",
  },
};

export function nearbyCategoryMeta(category: string): NearbyCategoryMeta {
  return META[(PLACE_CATEGORIES as readonly string[]).includes(category) ? (category as NearbyCategory) : "other"];
}

export function nearbyCategoryLabel(category: string): string {
  return nearbyCategoryMeta(category).label;
}
