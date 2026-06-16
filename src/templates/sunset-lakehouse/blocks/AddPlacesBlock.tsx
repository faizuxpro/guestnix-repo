"use client";

import { useMemo, type CSSProperties } from "react";
import {
  Clock,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Store,
  Tags,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { HostIcon } from "@/components/icons/HostIcon";
import { blockColorOverrideVars } from "@/lib/block-colors";
import { extractNearbyEnrichedData, mergePlaceContact } from "@/lib/nearby-enriched";
import { nearbyCategoryMeta } from "@/lib/nearby-categories";
import { readPlaceImageUrls } from "@/lib/place-images";
import type {
  AddPlacesContent,
  AddPlacesLayout,
  AddPlacesStyle,
  TemplatePlace,
  WidgetAnimation,
  WidgetColorRole,
} from "../types";

const ASSETS_HUB_DISCOVER_HREF = "/dashboard/assets-hub#local-places-discover";

const STYLES: AddPlacesStyle[] = [
  "clean_grid",
  "photo_cards",
  "compact_list",
  "magazine",
];

const LAYOUTS: AddPlacesLayout[] = ["grid", "list", "compact"];
const COLOR_ROLES: WidgetColorRole[] = ["primary", "secondary", "accent"];
const ANIMATIONS: WidgetAnimation[] = [
  "style_default",
  "none",
  "lift",
  "glow",
  "pulse",
];

function coerce<T extends string>(
  value: unknown,
  values: readonly T[],
  fallback: T
): T {
  return values.includes(value as T) ? (value as T) : fallback;
}

function directionsUrl(place: TemplatePlace, address: string | null) {
  const query =
    address ||
    (typeof place.lat === "number" && typeof place.lng === "number"
      ? `${place.lat},${place.lng}`
      : place.name);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function EmptyPlacesState() {
  return (
    <div className="sl-add-places-empty">
      <span className="sl-add-places-empty-icon" aria-hidden>
        <Store />
      </span>
      <div>
        <h3>No saved local places yet.</h3>
        <p>
          Add places in Assets Hub Local Places first, then this block will show
          them here automatically.
        </p>
        <a className="sl-add-places-empty-link" href={ASSETS_HUB_DISCOVER_HREF}>
          Open Local Places discover
          <ExternalLink aria-hidden />
        </a>
      </div>
    </div>
  );
}

function NoSelectedPlacesState() {
  return (
    <div className="sl-add-places-empty">
      <span className="sl-add-places-empty-icon" aria-hidden>
        <Store />
      </span>
      <div>
        <h3>No places selected.</h3>
        <p>
          Choose saved Local Places in this block settings to show them here.
        </p>
      </div>
    </div>
  );
}

export function AddPlacesBlock({
  content,
  places = [],
}: {
  content: Partial<AddPlacesContent>;
  places?: TemplatePlace[];
}) {
  const config =
    typeof content.config === "object" && content.config !== null
      ? content.config
      : undefined;
  const title = (content.title ?? "").trim();
  const subtitle = (content.subtitle ?? "").trim();
  const style = coerce(content.style, STYLES, "clean_grid");
  const layout = coerce(config?.layout, LAYOUTS, "grid");
  const colorRole = coerce(config?.accent_role, COLOR_ROLES, "secondary");
  const animation = coerce(config?.animation, ANIMATIONS, "style_default");
  const showImages =
    typeof config?.show_images === "boolean" ? config.show_images : true;
  const showCategory =
    typeof config?.show_category === "boolean" ? config.show_category : true;
  const showDescription =
    typeof config?.show_description === "boolean"
      ? config.show_description
      : true;
  const showAddress =
    typeof config?.show_address === "boolean" ? config.show_address : true;
  const showActions =
    typeof config?.show_actions === "boolean" ? config.show_actions : true;
  const fullDetails =
    typeof config?.full_details === "boolean" ? config.full_details : false;
  const selectionMode = content.selection_mode === "custom" ? "custom" : "all";

  const visiblePlaces = useMemo(() => {
    const namedPlaces = places.filter((place) => place.name.trim().length > 0);
    if (selectionMode !== "custom") {
      return namedPlaces.slice().sort((a, b) => a.name.localeCompare(b.name));
    }

    const selectedPlaceIds = Array.isArray(content.place_ids)
      ? content.place_ids.filter((id): id is string => typeof id === "string")
      : [];
    const byId = new Map(namedPlaces.map((place) => [place.id, place]));
    return selectedPlaceIds
      .map((id) => byId.get(id))
      .filter((place): place is TemplatePlace => Boolean(place));
  }, [content.place_ids, places, selectionMode]);

  const customStyle = {
    ...blockColorOverrideVars([
      {
        value: config?.accent_color,
        colorVar: "--sl-add-places-color",
        rgbVar: "--sl-add-places-color-rgb",
        contrastVar: "--sl-add-places-contrast",
      },
    ]),
  } as CSSProperties;

  if (places.length === 0) {
    return (
      <section
        className="sl-add-places"
        data-style={style}
        data-layout={layout}
        data-color-role={colorRole}
        style={customStyle}
      >
        <EmptyPlacesState />
      </section>
    );
  }

  if (visiblePlaces.length === 0) {
    return (
      <section
        className="sl-add-places"
        data-style={style}
        data-layout={layout}
        data-color-role={colorRole}
        style={customStyle}
      >
        <NoSelectedPlacesState />
      </section>
    );
  }

  return (
    <section
      className="sl-add-places"
      data-style={style}
      data-layout={layout}
      data-color-role={colorRole}
      data-animation={animation}
      style={customStyle}
    >
      {title || subtitle ? (
        <header className="sl-add-places-header">
          {title ? <h3>{title}</h3> : null}
          {subtitle ? <p>{subtitle}</p> : null}
        </header>
      ) : null}

      <div className="sl-add-places-grid">
        {visiblePlaces.map((place) => {
          const meta = nearbyCategoryMeta(place.category);
          const imageUrls = readPlaceImageUrls(place);
          const cover = showImages ? imageUrls[0] : null;
          const enriched = extractNearbyEnrichedData(place.tags);
          const merged = mergePlaceContact(place, enriched);
          const actionUrl = directionsUrl(place, merged.address);
          const detailRows: Array<{
            Icon: LucideIcon;
            value: string;
            href: string | null;
          }> = [
            showAddress && merged.address
              ? { Icon: MapPin, value: merged.address, href: null }
              : null,
            merged.email
              ? { Icon: Mail, value: merged.email, href: `mailto:${merged.email}` }
              : null,
            merged.openingHours
              ? { Icon: Clock, value: merged.openingHours, href: null }
              : null,
            enriched.cuisine
              ? { Icon: UtensilsCrossed, value: enriched.cuisine, href: null }
              : null,
          ].filter(
            (
              row
            ): row is { Icon: LucideIcon; value: string; href: string | null } =>
              Boolean(row)
          );
          const detailTags = [
            ...new Set(
              [showCategory ? meta.label : "", ...enriched.tags].filter(Boolean)
            ),
          ];

          return (
            <article
              key={place.id}
              className={`sl-add-place-card${cover ? " has-image" : ""}${
                fullDetails ? " is-full-details" : ""
              }`}
              style={
                {
                  "--sl-place-color": meta.color,
                  "--sl-place-soft": meta.soft,
                } as CSSProperties
              }
              data-guidebook-search-target={`place-${place.id}`}
            >
              {cover ? (
                <a
                  className="sl-add-place-media"
                  href={actionUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={`Open directions for ${place.name}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cover} alt={`${place.name} photo`} loading="lazy" />
                  {imageUrls.length > 1 ? (
                    <span className="sl-add-place-photo-count">
                      {imageUrls.length} photos
                    </span>
                  ) : null}
                </a>
              ) : (
                <span className="sl-add-place-icon" aria-hidden>
                  <HostIcon value={meta.icon} />
                </span>
              )}

              <div className="sl-add-place-body">
                <div className="sl-add-place-title-row">
                  <h4>{place.name}</h4>
                  {showCategory ? (
                    <span className="sl-add-place-category">
                      <Tags aria-hidden />
                      {meta.label}
                    </span>
                  ) : null}
                </div>

                {showAddress && merged.address ? (
                  <p className="sl-add-place-address">
                    <MapPin aria-hidden />
                    <span>{merged.address}</span>
                  </p>
                ) : null}

                {showDescription && place.description ? (
                  <p className="sl-add-place-description">
                    {place.description}
                  </p>
                ) : null}

                {fullDetails ? (
                  <div className="sl-add-place-details">
                    {showImages && imageUrls.length > 1 ? (
                      <div
                        className="sl-add-place-gallery"
                        aria-label={`${place.name} photos`}
                      >
                        {imageUrls.slice(1, 5).map((imageUrl, index) => (
                          <span
                            key={`${place.id}-detail-photo-${index}-${imageUrl}`}
                            className="sl-add-place-thumb"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imageUrl}
                              alt={`${place.name} photo ${index + 2}`}
                              loading="lazy"
                            />
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {merged.phone || merged.website ? (
                      <div className="sl-add-place-contact-actions">
                        {merged.phone ? (
                          <a
                            href={`tel:${merged.phone}`}
                            className="sl-add-place-action"
                          >
                            <Phone aria-hidden />
                            {merged.phone}
                          </a>
                        ) : null}
                        {merged.website ? (
                          <a
                            href={merged.website}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="sl-add-place-action"
                          >
                            <Globe aria-hidden />
                            Website
                          </a>
                        ) : null}
                      </div>
                    ) : null}

                    {detailRows.length > 0 ? (
                      <div className="sl-add-place-detail-rows">
                        {detailRows.map((row) => (
                          <div
                            key={`${place.id}-${row.value}`}
                            className="sl-add-place-detail-row"
                          >
                            <row.Icon aria-hidden />
                            {row.href ? (
                              <a href={row.href}>{row.value}</a>
                            ) : (
                              <span>{row.value}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {enriched.extraInfo.length > 0 || detailTags.length > 0 ? (
                      <div className="sl-add-place-tags">
                        {enriched.extraInfo.map((info) => (
                          <span key={`${place.id}-${info.text}`}>
                            <info.Icon aria-hidden />
                            {info.text}
                          </span>
                        ))}
                        {detailTags.map((tag) => (
                          <span key={`${place.id}-${tag}`}>{tag}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {showActions ? (
                  <div className="sl-add-place-actions">
                    <a
                      href={actionUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="sl-add-place-action primary"
                    >
                      <Navigation aria-hidden />
                      Directions
                    </a>
                    {merged.website ? (
                      <a
                        href={merged.website}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="sl-add-place-action"
                      >
                        <Globe aria-hidden />
                        Website
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
