import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { PLACE_CATEGORIES } from "@/lib/constants";

const placeCategoryEnum = z.enum(PLACE_CATEGORIES);
type PlaceCategory = z.infer<typeof placeCategoryEnum>;

const discoverPlacesSchema = z
  .object({
    locationQuery: z.string().trim().min(1).max(200).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    radiusMiles: z.number().min(1).max(10).default(3),
    limit: z.number().int().min(10).max(200).default(100),
    categories: z.array(placeCategoryEnum).optional(),
  })
  .superRefine((value, ctx) => {
    const hasQuery =
      typeof value.locationQuery === "string" &&
      value.locationQuery.length > 0;
    const hasCoords =
      typeof value.lat === "number" && typeof value.lng === "number";
    if (!hasQuery && !hasCoords) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide a location query or lat/lng coordinates",
        path: ["locationQuery"],
      });
    }
  });

type NominatimSearchItem = {
  lat?: string;
  lon?: string;
  display_name?: string;
};

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

type WikiSummaryResponse = {
  thumbnail?: {
    source?: string;
  };
};

const NOMINATIM_HEADERS = {
  "User-Agent": "Guestnix Nearby Discovery/1.0 (https://guestnix.com)",
  "Accept-Language": "en",
};

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

function toFiniteNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function milesToMeters(miles: number) {
  return miles * 1609.34;
}

function addressFromTags(tags: Record<string, string>) {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:city"],
    tags["addr:postcode"],
  ].filter(
    (part): part is string =>
      typeof part === "string" && part.trim().length > 0
  );
  return parts.length > 0 ? parts.join(", ") : null;
}

function normalizeWebsite(raw: string | undefined) {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://"))
    return value;
  return `https://${value}`;
}

function normalizeImageUrl(raw: string | null | undefined) {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://"))
    return value;
  if (value.startsWith("//")) return `https:${value}`;
  return null;
}

function mediaUrlFromTags(tags: Record<string, string>) {
  const directImage = normalizeImageUrl(tags.image);
  if (directImage) return directImage;

  const commons = tags.wikimedia_commons?.trim();
  if (commons) {
    if (commons.startsWith("File:")) {
      const fileName = commons.replace(/^File:/i, "").replaceAll(" ", "_");
      return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}`;
    }
    if (commons.startsWith("Category:")) return null;
  }

  return null;
}

function categoryFromTags(tags: Record<string, string>): PlaceCategory {
  const amenity = tags.amenity;
  const tourism = tags.tourism;
  const shop = tags.shop;
  const leisure = tags.leisure;
  const natural = tags.natural;
  const historic = tags.historic;
  const railway = tags.railway;
  const publicTransport = tags.public_transport;

  if (amenity && /^(restaurant|fast_food|food_court|bbq)$/i.test(amenity)) {
    return "restaurant";
  }
  if (amenity && /^(cafe|ice_cream)$/i.test(amenity)) {
    return "cafe";
  }
  if (amenity && /^(bar|pub|biergarten|nightclub)$/i.test(amenity)) {
    return "bar";
  }
  if (amenity === "pharmacy") {
    return "pharmacy";
  }
  if (amenity && /^(hospital|clinic|doctors|dentist)$/i.test(amenity)) {
    return "hospital";
  }
  if (amenity && /^(bus_station|ferry_terminal|taxi)$/i.test(amenity)) {
    return "transport";
  }
  if (amenity === "fuel") {
    return "gas_station";
  }
  if (
    amenity === "gym" ||
    (leisure && /^(fitness_centre|sports_centre)$/i.test(leisure))
  ) {
    return "gym";
  }
  if (natural === "beach" || leisure === "beach_resort") {
    return "beach";
  }
  if (leisure && /^(park|nature_reserve|garden)$/i.test(leisure)) {
    return "park";
  }
  if (tourism && /^(museum|gallery)$/i.test(tourism)) {
    return "museum";
  }
  if (
    tourism &&
    /^(attraction|viewpoint|theme_park|zoo|aquarium|artwork)$/i.test(tourism)
  ) {
    return "attraction";
  }
  if (historic) {
    return "attraction";
  }
  if (railway || publicTransport) {
    return "transport";
  }

  if (shop) {
    if (
      /^(supermarket|convenience|grocery|greengrocer|butcher|bakery)$/i.test(
        shop
      )
    ) {
      return "grocery";
    }
    return "shopping";
  }

  return "other";
}

function fallbackDescription(category: PlaceCategory) {
  const label = category.replaceAll("_", " ");
  return `Recommended ${label} nearby.`;
}

function hasCoords(element: OverpassElement) {
  const lat = toFiniteNumber(element.lat ?? element.center?.lat);
  const lng = toFiniteNumber(element.lon ?? element.center?.lon);
  if (lat === null || lng === null) return null;
  return { lat, lng };
}

type TagBucket = { id: string; clauses: string[]; perTagLimit: number };

const TAG_BUCKETS: TagBucket[] = [
  {
    id: "amenity-food",
    clauses: [
      `node["amenity"~"^(restaurant|cafe|fast_food|food_court|bar|pub|biergarten|nightclub|bbq|ice_cream)$"]["name"]`,
    ],
    perTagLimit: 80,
  },
  {
    id: "amenity-service",
    clauses: [
      `node["amenity"~"^(pharmacy|hospital|clinic|doctors|dentist|fuel|gym|bus_station|ferry_terminal|taxi)$"]["name"]`,
    ],
    perTagLimit: 50,
  },
  {
    id: "shop",
    clauses: [`node["shop"]["name"]`],
    perTagLimit: 60,
  },
  {
    id: "tourism",
    clauses: [`nwr["tourism"]["name"]`],
    perTagLimit: 60,
  },
  {
    id: "leisure",
    clauses: [`nwr["leisure"]["name"]`],
    perTagLimit: 40,
  },
  {
    id: "historic-natural",
    clauses: [
      `nwr["historic"]["name"]`,
      `nwr["natural"="beach"]["name"]`,
    ],
    perTagLimit: 30,
  },
];

async function fetchJsonWithTimeout<T>(
  url: string,
  init: RequestInit,
  timeoutMs: number
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Request failed (${res.status})`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function geocodeLocation(query: string) {
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" +
    encodeURIComponent(query);
  const data = await fetchJsonWithTimeout<NominatimSearchItem[]>(
    url,
    { headers: NOMINATIM_HEADERS },
    15000
  );

  const first = data[0];
  const lat = toFiniteNumber(first?.lat);
  const lng = toFiniteNumber(first?.lon);
  if (lat === null || lng === null) return null;

  const displayName =
    typeof first?.display_name === "string" && first.display_name.length > 0
      ? first.display_name.split(",")[0]
      : query;

  return { lat, lng, displayName };
}

async function fetchOverpassBucket(
  bucket: TagBucket,
  radiusMeters: number,
  lat: number,
  lng: number,
  primaryMirrorIndex: number,
  timeoutMs: number
): Promise<OverpassElement[]> {
  const around = `(around:${radiusMeters},${lat},${lng})`;
  const body = `
[out:json][timeout:${Math.floor(timeoutMs / 1000) - 2}];
(
${bucket.clauses.map((c) => `  ${c}${around};`).join("\n")}
);
out center ${bucket.perTagLimit};
`;
  const init: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "User-Agent": NOMINATIM_HEADERS["User-Agent"],
    },
    body: "data=" + encodeURIComponent(body),
  };

  const order = [
    primaryMirrorIndex % OVERPASS_ENDPOINTS.length,
    (primaryMirrorIndex + 1) % OVERPASS_ENDPOINTS.length,
  ];
  let lastError: unknown = null;
  for (const idx of order) {
    try {
      const response = await fetchJsonWithTimeout<OverpassResponse>(
        OVERPASS_ENDPOINTS[idx],
        init,
        timeoutMs
      );
      if (Array.isArray(response.elements)) {
        return response.elements;
      }
      lastError = new Error("Empty response");
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`Bucket ${bucket.id} failed`);
}

async function fetchNearbyPlaces(
  lat: number,
  lng: number,
  radiusMiles: number
) {
  const radiusMeters = Math.round(milesToMeters(radiusMiles));
  const bucketTimeoutMs = 18000;

  const settled = await Promise.allSettled(
    TAG_BUCKETS.map((bucket, idx) =>
      fetchOverpassBucket(bucket, radiusMeters, lat, lng, idx, bucketTimeoutMs)
    )
  );

  const elements: OverpassElement[] = [];
  let succeeded = 0;
  let firstError: unknown = null;
  for (const result of settled) {
    if (result.status === "fulfilled") {
      elements.push(...result.value);
      succeeded += 1;
    } else if (firstError === null) {
      firstError = result.reason;
    }
  }

  if (succeeded === 0) {
    const isTimeout =
      firstError instanceof Error &&
      (firstError.name === "AbortError" ||
        /aborted|timeout|timed out/i.test(firstError.message));
    if (isTimeout) {
      throw new Error(
        "The map provider is overloaded right now. Try again in a moment."
      );
    }
    throw new Error(
      firstError instanceof Error
        ? firstError.message
        : "Could not reach the map provider."
    );
  }

  return elements;
}

async function fetchWikipediaThumbnail(pageTitle: string) {
  const title = pageTitle.trim();
  if (!title) return null;
  const encoded = encodeURIComponent(title.replaceAll(" ", "_"));
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
  try {
    const summary = await fetchJsonWithTimeout<WikiSummaryResponse>(
      url,
      {
        headers: {
          "User-Agent": NOMINATIM_HEADERS["User-Agent"],
          Accept: "application/json",
        },
      },
      4000
    );
    const source = summary.thumbnail?.source;
    return normalizeImageUrl(source);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => ({}));
  const parsed = discoverPlacesSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { locationQuery, radiusMiles, limit } = parsed.data;
  const selectedCategories = parsed.data.categories?.length
    ? new Set(parsed.data.categories)
    : null;

  let lat = parsed.data.lat ?? null;
  let lng = parsed.data.lng ?? null;
  let locationName = locationQuery ?? "";

  if (lat === null || lng === null) {
    if (!locationQuery) {
      return NextResponse.json(
        { error: "Location query is required when coordinates are missing." },
        { status: 400 }
      );
    }

    try {
      const geocoded = await geocodeLocation(locationQuery);
      if (!geocoded) {
        return NextResponse.json(
          { error: "Could not find that location." },
          { status: 404 }
        );
      }
      lat = geocoded.lat;
      lng = geocoded.lng;
      locationName = geocoded.displayName;
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Location lookup failed.",
        },
        { status: 502 }
      );
    }
  }

  try {
    const rawPlaces = await fetchNearbyPlaces(lat, lng, radiusMiles);
    const byKey = new Map<
      string,
      {
        name: string;
        category: PlaceCategory;
        description: string | null;
        lat: number;
        lng: number;
        address: string | null;
        phone: string | null;
        website: string | null;
        email: string | null;
        imageUrl: string | null;
        openingHours: string | null;
        tags: Record<string, string>;
      }
    >();

    for (const item of rawPlaces) {
      const tags = item.tags ?? {};
      const name = typeof tags.name === "string" ? tags.name.trim() : "";
      if (!name) continue;

      const coords = hasCoords(item);
      if (!coords) continue;

      const category = categoryFromTags(tags);
      if (selectedCategories && !selectedCategories.has(category)) continue;

      const key = `${name.toLowerCase()}-${coords.lat.toFixed(5)}-${coords.lng.toFixed(5)}`;
      if (byKey.has(key)) continue;

      byKey.set(key, {
        name,
        category,
        description:
          tags.description ??
          tags.note ??
          tags["description:en"] ??
          tags["note:en"] ??
          fallbackDescription(category),
        lat: coords.lat,
        lng: coords.lng,
        address: addressFromTags(tags),
        phone: tags.phone ?? tags["contact:phone"] ?? null,
        website: normalizeWebsite(
          tags.website ?? tags["contact:website"] ?? tags.url
        ),
        email: tags.email ?? tags["contact:email"] ?? null,
        imageUrl: mediaUrlFromTags(tags),
        openingHours: tags.opening_hours ?? null,
        tags,
      });
    }

    const limitedPlaces = Array.from(byKey.values()).slice(0, limit);
    const wikiBackfillLimit = 10;
    const wikiCandidates = limitedPlaces
      .map((place, index) => ({ place, index }))
      .filter(({ place }) => !place.imageUrl)
      .slice(0, wikiBackfillLimit);

    const wikiConcurrency = 5;
    for (let i = 0; i < wikiCandidates.length; i += wikiConcurrency) {
      const chunk = wikiCandidates.slice(i, i + wikiConcurrency);
      await Promise.allSettled(
        chunk.map(async ({ place }) => {
          const wikiTag = place.tags.wikipedia?.trim();
          const pageTitle = wikiTag
            ? wikiTag.includes(":")
              ? wikiTag.split(":").slice(1).join(":").trim()
              : wikiTag
            : place.name;
          const thumb = await fetchWikipediaThumbnail(pageTitle);
          if (thumb) {
            place.imageUrl = thumb;
          }
        })
      );
    }

    const places = limitedPlaces.map((place, index) => ({
      id: `discover-${index}-${place.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      ...place,
    }));

    return NextResponse.json({
      location: {
        lat,
        lng,
        name: locationName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      },
      places,
      radiusMiles,
      limit,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not fetch places from map providers.",
      },
      { status: 502 }
    );
  }
}
