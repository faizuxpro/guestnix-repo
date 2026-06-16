import {
  Wifi,
  Accessibility,
  Trees,
  ParkingSquare,
  CreditCard,
  ShoppingBag,
  Truck,
  Star,
  type LucideIcon,
} from "lucide-react";

type ExtraInfo = {
  Icon: LucideIcon;
  text: string;
};

export type NearbyEnrichedData = {
  address: string;
  phone: string;
  website: string;
  email: string;
  openingHours: string;
  cuisine: string;
  extraInfo: ExtraInfo[];
  tags: string[];
};

function toStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function displayValue(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function yes(value: unknown) {
  return String(value).toLowerCase() === "yes";
}

function formatTagList(value: unknown) {
  return toStringValue(value)
    .split(/[;,\n]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/_/g, " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(", ");
}

function pushUnique(values: string[], value: string) {
  const trimmed = value.trim();
  if (!trimmed) return;
  if (values.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
    return;
  }
  values.push(trimmed);
}

function readCustomDetails(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): string | null => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const key = displayValue(record.key);
      const detailValue = displayValue(record.value);
      if (!key || !detailValue) return null;
      return `${key}: ${detailValue}`;
    })
    .filter((detail): detail is string => Boolean(detail));
}

export function extractNearbyEnrichedData(
  tagsRaw: Record<string, unknown> | null | undefined
): NearbyEnrichedData {
  const tags = tagsRaw ?? {};
  const data: NearbyEnrichedData = {
    address: "",
    phone: "",
    website: "",
    email: "",
    openingHours: "",
    cuisine: "",
    extraInfo: [],
    tags: [],
  };

  const addressParts = [
    toStringValue(tags["addr:housenumber"]),
    toStringValue(tags["addr:street"]),
    toStringValue(tags["addr:city"]),
    toStringValue(tags["addr:postcode"]),
  ].filter(Boolean);
  data.address = addressParts.join(", ");

  data.phone =
    toStringValue(tags.phone) ||
    toStringValue(tags["contact:phone"]) ||
    toStringValue(tags.telephone);

  const websiteValue =
    toStringValue(tags.website) ||
    toStringValue(tags["contact:website"]) ||
    toStringValue(tags.url);
  data.website =
    websiteValue && !websiteValue.startsWith("http")
      ? `https://${websiteValue}`
      : websiteValue;

  data.email = toStringValue(tags.email) || toStringValue(tags["contact:email"]);
  data.openingHours =
    toStringValue(tags.opening_hours) || toStringValue(tags["opening_hours:covid19"]);

  const cuisine = toStringValue(tags.cuisine);
  if (cuisine) {
    data.cuisine = cuisine
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).replace(/_/g, " "))
      .join(", ");
  }

  if (yes(tags.wifi) || toStringValue(tags.internet_access) === "wlan") {
    data.extraInfo.push({ Icon: Wifi, text: "Free WiFi" });
  }
  if (yes(tags.wheelchair)) {
    data.extraInfo.push({ Icon: Accessibility, text: "Wheelchair Accessible" });
  }
  if (yes(tags.outdoor_seating)) {
    data.extraInfo.push({ Icon: Trees, text: "Outdoor Seating" });
  }
  if (yes(tags.parking) || toStringValue(tags["parking:fee"]) === "no") {
    data.extraInfo.push({ Icon: ParkingSquare, text: "Parking Available" });
  }

  const payments: string[] = [];
  if (yes(tags["payment:credit_cards"])) payments.push("Cards");
  if (yes(tags["payment:cash"])) payments.push("Cash");
  if (yes(tags["payment:contactless"])) payments.push("Contactless");
  if (payments.length > 0) {
    data.extraInfo.push({ Icon: CreditCard, text: payments.join(", ") });
  }

  if (yes(tags.takeaway)) {
    data.extraInfo.push({ Icon: ShoppingBag, text: "Takeaway" });
  }
  if (yes(tags.delivery)) {
    data.extraInfo.push({ Icon: Truck, text: "Delivery" });
  }

  const stars = toStringValue(tags.stars);
  if (stars) {
    const n = Number(stars);
    if (Number.isFinite(n) && n > 0 && n <= 5) {
      data.extraInfo.push({
        Icon: Star,
        text: `${"★".repeat(Math.floor(n))} (${Math.floor(n)} stars)`,
      });
    }
  }

  const additional: string[] = [];
  const brand = toStringValue(tags.brand);
  if (brand) pushUnique(additional, brand);

  const placeType =
    formatTagList(tags["guestnix:place_type"]) ||
    formatTagList(tags.amenity) ||
    formatTagList(tags.shop) ||
    formatTagList(tags.tourism) ||
    formatTagList(tags.leisure) ||
    formatTagList(tags.sport);
  if (placeType) pushUnique(additional, placeType);

  const activities =
    formatTagList(tags["guestnix:activities"]) ||
    formatTagList(tags.activity) ||
    formatTagList(tags.sport);
  if (activities) pushUnique(additional, activities);

  const facilities =
    formatTagList(tags["guestnix:facilities"]) ||
    formatTagList(tags.facilities);
  if (facilities) pushUnique(additional, facilities);

  const price =
    toStringValue(tags.price_range) ||
    toStringValue(tags.price) ||
    toStringValue(tags.fee) ||
    toStringValue(tags.charge);
  if (price) pushUnique(additional, price);

  const booking = toStringValue(tags.reservation) || toStringValue(tags.booking);
  if (booking) pushUnique(additional, booking);

  for (const detail of readCustomDetails(tags["guestnix:custom_details"])) {
    pushUnique(additional, detail);
  }

  if (yes(tags["diet:vegetarian"])) pushUnique(additional, "Vegetarian");
  if (yes(tags["diet:vegan"])) pushUnique(additional, "Vegan");
  if (yes(tags["diet:gluten_free"])) pushUnique(additional, "Gluten-Free");
  if (yes(tags["diet:halal"])) pushUnique(additional, "Halal");

  const shop = toStringValue(tags.shop);
  if (shop && shop !== "yes") {
    pushUnique(
      additional,
      shop.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    );
  }
  const tourism = toStringValue(tags.tourism);
  if (tourism && tourism !== "yes") {
    pushUnique(
      additional,
      tourism.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    );
  }

  data.tags = additional;

  return data;
}

export function mergePlaceContact(
  place: {
    address?: string | null;
    phone?: string | null;
    website?: string | null;
    email?: string | null;
    openingHours?: string | null;
    tags?: Record<string, unknown> | null;
  },
  enriched: NearbyEnrichedData
) {
  return {
    address: (place.address ?? "").trim() || enriched.address,
    phone: (place.phone ?? "").trim() || enriched.phone,
    website: (place.website ?? "").trim() || enriched.website,
    email: (place.email ?? "").trim() || enriched.email,
    openingHours: (place.openingHours ?? "").trim() || enriched.openingHours,
  };
}
