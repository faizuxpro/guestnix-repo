"use client";

import { memo, useState, type ReactNode } from "react";
import {
  Check,
  Clock,
  Eye,
  Globe,
  ImageIcon,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HostIcon } from "@/components/icons/HostIcon";
import { nearbyCategoryMeta } from "@/lib/nearby-categories";
import {
  extractNearbyEnrichedData,
  mergePlaceContact,
} from "@/lib/nearby-enriched";
import { readPlaceImageUrls } from "@/lib/place-images";
import { cn } from "@/lib/utils";

export type PlaceCardData = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  lat: number;
  lng: number;
  address: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  imageUrl: string | null;
  openingHours: string | null;
  tags: Record<string, unknown> | null;
};

type CommonProps = {
  place: PlaceCardData;
  focused?: boolean;
  onFocus?: (id: string) => void;
};

type SavedProps = CommonProps & {
  kind: "saved";
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

type SuggestionProps = CommonProps & {
  kind: "suggestion";
  isAdded?: boolean;
  isAdding?: boolean;
  onAdd: (id: string) => void;
  onEditAndAdd?: (id: string) => void;
};

type Props = SavedProps | SuggestionProps;

function PlaceCardImpl(props: Props) {
  const { place, focused, onFocus } = props;
  const [isExpanded, setIsExpanded] = useState(false);
  const meta = nearbyCategoryMeta(place.category);
  const enriched = extractNearbyEnrichedData(place.tags);
  const merged = mergePlaceContact(place, enriched);
  const imageUrls = readPlaceImageUrls(place);
  const coverImageUrl = imageUrls[0] ?? null;
  const focusPlace = () => onFocus?.(place.id);
  const detailTags = [
    ...new Set(
      [meta.label, ...enriched.tags, enriched.cuisine].filter(Boolean)
    ),
  ];
  const hasExpandedDetails =
    Boolean(place.description) ||
    Boolean(merged.address) ||
    Boolean(merged.openingHours) ||
    Boolean(merged.phone) ||
    Boolean(merged.website) ||
    Boolean(merged.email) ||
    enriched.extraInfo.length > 0 ||
    detailTags.length > 0 ||
    imageUrls.length > 0;

  return (
    <div
      onClick={props.kind === "saved" ? focusPlace : undefined}
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-background p-2.5 shadow-sm transition duration-200 hover:border-primary/40 hover:shadow-md",
        props.kind === "saved" ? "cursor-pointer" : "cursor-default"
      )}
      style={{
        borderColor: focused ? `${meta.color}cc` : undefined,
        background: focused
          ? `linear-gradient(135deg, ${meta.soft} 0%, rgba(255,255,255,.98) 48%, #ffffff 100%)`
          : undefined,
        boxShadow: focused
          ? `0 0 0 1px ${meta.color}2e, 0 14px 28px rgba(15,23,42,0.12)`
          : undefined,
      }}
    >
      {focused ? (
        <div
          className="absolute inset-y-0 left-0 w-1"
          style={{ background: meta.color }}
        />
      ) : null}
      <div className="relative flex items-start gap-2.5">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            focusPlace();
          }}
          className="shrink-0"
          aria-label={`Focus ${place.name} on map`}
        >
          {coverImageUrl ? (
            <span className="relative block h-14 w-16 overflow-hidden rounded-lg border border-border/60 bg-muted/20 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverImageUrl}
                alt=""
                className="h-full w-full object-cover"
                style={{
                  boxShadow: focused ? `0 0 0 2px ${meta.color}33` : undefined,
                }}
                loading="lazy"
              />
              {imageUrls.length > 1 ? (
                <span className="absolute bottom-1 right-1 rounded-full bg-slate-950/75 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-white">
                  {imageUrls.length}
                </span>
              ) : null}
            </span>
          ) : (
            <div
              className="flex h-14 w-16 items-center justify-center rounded-lg border"
              style={{
                borderColor: `${meta.color}66`,
                background: meta.soft,
                color: meta.color,
                boxShadow: focused ? `0 0 0 2px ${meta.color}33` : undefined,
              }}
            >
              <HostIcon value={meta.icon} className="text-2xl" />
            </div>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                focusPlace();
              }}
              className="truncate text-left text-sm font-semibold text-slate-800 transition hover:text-primary"
              style={{ color: focused ? "rgb(15 23 42)" : undefined }}
            >
              {place.name}
            </button>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{
                background: focused ? meta.color : meta.soft,
                color: focused ? "#ffffff" : meta.color,
              }}
            >
              {meta.label}
            </span>
          </div>
          {merged.address ? (
            <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
              <MapPin className="mr-1 inline h-3 w-3" aria-hidden />
              {merged.address}
            </p>
          ) : null}
          {place.description ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {place.description}
            </p>
          ) : null}
        </div>

        <div
          className="flex shrink-0 flex-col items-end gap-1"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          {props.kind === "saved" ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={(event) => {
                  event.stopPropagation();
                  props.onEdit(place.id);
                }}
                aria-label="Edit place"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={(event) => {
                  event.stopPropagation();
                  props.onDelete(place.id);
                }}
                aria-label="Remove place"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsExpanded((current) => !current);
                }}
                aria-expanded={isExpanded}
                className="inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-lg border border-transparent px-2 text-[11px] font-medium text-slate-700 transition hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Eye className="mr-1 h-3 w-3" />
                {isExpanded ? "Hide" : "View"}
              </button>
              {props.onEditAndAdd ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (!props.isAdded) props.onEditAndAdd?.(place.id);
                  }}
                  disabled={props.isAdding || props.isAdded}
                  className="h-7 px-2 text-[11px]"
                >
                  <Pencil className="mr-1 h-3 w-3" />
                  Edit & add
                </Button>
              ) : null}
              <Button
                type="button"
                variant={props.isAdded ? "ghost" : "default"}
                size="sm"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!props.isAdded) props.onAdd(place.id);
                }}
                disabled={props.isAdding || props.isAdded}
                className="h-7 px-2 text-[11px]"
              >
                {props.isAdded ? (
                  <>
                    <Check className="mr-1 h-3 w-3" />
                    Added
                  </>
                ) : (
                  <>
                    <Plus className="mr-1 h-3 w-3" />
                    Add
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
      {props.kind === "suggestion" && isExpanded ? (
        <div
          className="relative mt-2.5 border-t pt-2.5"
          style={{ borderColor: `${meta.color}22` }}
          onClick={(event) => event.stopPropagation()}
        >
          {hasExpandedDetails ? (
            <div className="space-y-2.5">
              {place.description ? (
                <p className="rounded-md border border-border/70 bg-muted/15 px-2.5 py-2 text-xs leading-relaxed text-slate-700">
                  {place.description}
                </p>
              ) : null}

              {imageUrls.length > 1 ? (
                <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                  {imageUrls.slice(1, 5).map((url, index) => (
                    <span
                      key={`${url}-${index}`}
                      className="block h-14 w-16 shrink-0 overflow-hidden rounded-md border border-border/70 bg-muted"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </span>
                  ))}
                </div>
              ) : null}

              {merged.address ||
              merged.openingHours ||
              merged.phone ||
              merged.website ||
              merged.email ? (
                <div className="grid gap-1.5">
                  {merged.address ? (
                    <DetailRow icon={<MapPin className="h-3.5 w-3.5" />}>
                      {merged.address}
                    </DetailRow>
                  ) : null}
                  {merged.openingHours ? (
                    <DetailRow icon={<Clock className="h-3.5 w-3.5" />}>
                      {merged.openingHours}
                    </DetailRow>
                  ) : null}
                  {merged.phone ? (
                    <DetailRow icon={<Phone className="h-3.5 w-3.5" />}>
                      <a
                        className="hover:text-primary"
                        href={`tel:${merged.phone}`}
                      >
                        {merged.phone}
                      </a>
                    </DetailRow>
                  ) : null}
                  {merged.website ? (
                    <DetailRow icon={<Globe className="h-3.5 w-3.5" />}>
                      <a
                        className="break-all hover:text-primary"
                        href={merged.website}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {merged.website}
                      </a>
                    </DetailRow>
                  ) : null}
                  {merged.email ? (
                    <DetailRow icon={<Mail className="h-3.5 w-3.5" />}>
                      <a
                        className="hover:text-primary"
                        href={`mailto:${merged.email}`}
                      >
                        {merged.email}
                      </a>
                    </DetailRow>
                  ) : null}
                </div>
              ) : null}

              {enriched.extraInfo.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {enriched.extraInfo.map(({ Icon, text }) => (
                    <span
                      key={text}
                      className="inline-flex items-center gap-1 rounded-full border bg-muted/20 px-2 py-1 text-[11px] font-medium text-slate-700"
                    >
                      <Icon className="h-3 w-3" />
                      {text}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-1.5">
                {imageUrls.length > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                    <ImageIcon className="h-3 w-3" />
                    {imageUrls.length} photo{imageUrls.length === 1 ? "" : "s"}
                  </span>
                ) : null}
                {detailTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border/70 bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              No extra details found for this place.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function DetailRow({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border/70 bg-muted/15 px-2.5 py-2 text-xs text-slate-700">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <span className="min-w-0 flex-1 leading-relaxed">{children}</span>
    </div>
  );
}

export const PlaceCard = memo(PlaceCardImpl, (prev, next) => {
  if (prev.kind !== next.kind) return false;
  if (
    prev.place.id !== next.place.id ||
    prev.place.name !== next.place.name ||
    prev.place.category !== next.place.category ||
    prev.place.address !== next.place.address ||
    prev.place.description !== next.place.description ||
    prev.place.imageUrl !== next.place.imageUrl ||
    prev.place.tags !== next.place.tags ||
    prev.focused !== next.focused
  ) {
    return false;
  }
  if (prev.kind === "suggestion" && next.kind === "suggestion") {
    if (
      prev.isAdded !== next.isAdded ||
      prev.isAdding !== next.isAdding
    ) {
      return false;
    }
    if (Boolean(prev.onEditAndAdd) !== Boolean(next.onEditAndAdd)) {
      return false;
    }
  }
  return true;
});
