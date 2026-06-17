"use client";

import { Ambulance, Flame, Phone, ShieldAlert, Siren } from "lucide-react";
import { HostIcon } from "@/components/icons/HostIcon";
import { getCountryEntry, type EmergencyNumbers } from "@/lib/emergency-numbers";
import type { EmergencyContactsContent } from "../types";

type Tile = {
  key: string;
  label: string;
  number: string;
  icon: React.ReactNode;
  tone: string;
};

type CustomService =
  NonNullable<EmergencyContactsContent["custom_services"]>[number];

function buildOfficialTiles(numbers: EmergencyNumbers): Tile[] {
  const tiles: Tile[] = [];
  if (numbers.generic) {
    tiles.push({
      key: "generic",
      label: "Emergency",
      number: numbers.generic,
      icon: <Siren className="h-5 w-5" />,
      tone: "#dc2626",
    });
  }
  if (numbers.police) {
    tiles.push({
      key: "police",
      label: "Police",
      number: numbers.police,
      icon: <ShieldAlert className="h-5 w-5" />,
      tone: "#1d4ed8",
    });
  }
  if (numbers.ambulance) {
    tiles.push({
      key: "ambulance",
      label: "Ambulance",
      number: numbers.ambulance,
      icon: <Ambulance className="h-5 w-5" />,
      tone: "#16a34a",
    });
  }
  if (numbers.fire) {
    tiles.push({
      key: "fire",
      label: "Fire",
      number: numbers.fire,
      icon: <Flame className="h-5 w-5" />,
      tone: "#ea580c",
    });
  }
  return tiles;
}

function buildCustomTile(service: CustomService, index: number): Tile | null {
  const label = service.label?.trim();
  const number = service.phone?.trim();
  if (!label && !number) return null;

  return {
    key: `custom-${index}`,
    label: label || "Emergency",
    number: number || "",
    icon: service.icon ? (
      <HostIcon value={service.icon} className="h-5 w-5" />
    ) : (
      <Phone className="h-5 w-5" />
    ),
    tone: "#0f766e",
  };
}

function getTelHref(number: string) {
  const compact = number.replace(/[^\d+]/g, "");
  return compact ? `tel:${compact}` : undefined;
}

export function EmergencyContactsBlock({
  content,
}: {
  content: Partial<EmergencyContactsContent>;
}) {
  const country =
    typeof content.country === "string" ? content.country.toUpperCase() : "US";
  const entry = getCountryEntry(country);
  const customServices = Array.isArray(content.custom_services)
    ? content.custom_services
    : [];
  const custom = Array.isArray(content.custom_contacts)
    ? content.custom_contacts
    : [];
  const tiles = [
    ...(entry ? buildOfficialTiles(entry.numbers) : []),
    ...customServices
      .map((service, index) => buildCustomTile(service, index))
      .filter((tile): tile is Tile => tile !== null),
  ];

  if (tiles.length === 0 && custom.length === 0) return null;

  return (
    <div className="my-3 space-y-3">
      {entry ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
          {entry.name} · Emergency Services
        </p>
      ) : null}

      {tiles.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tiles.map((t) => (
            <a
              key={t.key}
              href={getTelHref(t.number)}
              className="flex flex-col items-center gap-1.5 rounded-xl border bg-white p-3 text-center transition-all hover:-translate-y-[1px] hover:shadow-sm"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full text-white"
                style={{ background: t.tone }}
                aria-hidden
              >
                {t.icon}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                {t.label}
              </span>
              <span className="text-[16px] font-bold leading-none text-neutral-900">
                {t.number}
              </span>
            </a>
          ))}
        </div>
      ) : null}

      {custom.length > 0 ? (
        <div className="space-y-2">
          {custom.map((c, i) => (
            <a
              key={i}
              href={getTelHref(c.phone ?? "")}
              className="flex items-center gap-3 rounded-xl border bg-white p-3 transition-all hover:bg-neutral-50"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700"
                aria-hidden
              >
                {c.icon ? <HostIcon value={c.icon} /> : <Phone className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-neutral-900">
                  {c.label || "Contact"}
                </p>
                <p className="truncate text-[12px] text-neutral-600">{c.phone}</p>
              </div>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
