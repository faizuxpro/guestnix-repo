"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EditorPanelShell,
  EditorSection,
  SettingRow,
  ToggleRow,
} from "@/components/editor/settings-ui";
import { useEditorStore } from "@/stores/editor-store";
import {
  DEFAULT_BASE_LANGUAGE,
  DEFAULT_LANGUAGES_SETTINGS,
  LANGUAGES,
  readLanguagesSettings,
} from "@/lib/languages";

export function LanguagesPanel() {
  const settings = useEditorStore((s) => s.guidebookSettings);
  const update = useEditorStore((s) => s.updateGuidebookSettings);

  const current = readLanguagesSettings(settings as Record<string, unknown>);
  const enabled = current.enabled;
  const baseLanguage = current.base_language || DEFAULT_BASE_LANGUAGE;
  const available = new Set(current.available);

  const writeLanguages = (patch: Partial<typeof current>) => {
    const next = { ...current, ...patch };
    // Strip the base language from available if it ever ends up there.
    next.available = next.available.filter((c) => c !== next.base_language);
    update({ languages: next });
  };

  return (
    <EditorPanelShell contentClassName="space-y-4">
      <EditorSection title="Language switcher">
        <ToggleRow
          id="lang-enabled"
          label="Multi-language"
          description="Show a language switcher on the guidebook so guests can translate it into their language."
          checked={enabled}
          onCheckedChange={(v) =>
            writeLanguages({ enabled: v, ...(v ? {} : DEFAULT_LANGUAGES_SETTINGS) })
          }
        />
      </EditorSection>

      {enabled && (
        <>
          <EditorSection title="Base">
            <SettingRow
              label="Base language"
              hint="The language your guidebook content is written in."
            >
            <Select
              value={baseLanguage}
              onValueChange={(value) => {
                if (typeof value === "string") {
                  writeLanguages({ base_language: value });
                }
              }}
            >
              <SelectTrigger className="w-full rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    <span className="mr-2">{l.flag_emoji}</span>
                    {l.name}
                    <span className="ml-2 text-muted-foreground">
                      ({l.native_name})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </SettingRow>
          </EditorSection>

          <EditorSection
            title="Available languages"
            description="Guests can switch between these from the globe icon on the guidebook."
          >
            <div className="grid grid-cols-1 gap-1 rounded-md border border-border/65 bg-muted/20 p-1.5">
              {LANGUAGES.filter((l) => l.code !== baseLanguage).map((l) => {
                const id = `lang-avail-${l.code}`;
                const checked = available.has(l.code);
                return (
                  <label
                    key={l.code}
                    htmlFor={id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-background"
                  >
                    <Checkbox
                      id={id}
                      checked={checked}
                      onCheckedChange={(v) => {
                        const nextSet = new Set(available);
                        if (v) nextSet.add(l.code);
                        else nextSet.delete(l.code);
                        writeLanguages({ available: Array.from(nextSet) });
                      }}
                    />
                    <span aria-hidden className="text-base leading-none">
                      {l.flag_emoji}
                    </span>
                    <span className="flex-1 text-[13px]">{l.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {l.native_name}
                    </span>
                  </label>
                );
              })}
            </div>
          </EditorSection>

          <p className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs leading-snug text-muted-foreground">
            Translations are powered by Google Translate. They are generated
            automatically on the guest&apos;s device and may not be perfectly
            accurate. Each guest visit makes a request to Google.
          </p>
        </>
      )}
    </EditorPanelShell>
  );
}
