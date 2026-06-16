"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { CustomFont, CustomFontFormat } from "@/lib/fonts/catalog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingFamilies: string[];
  onAdd: (font: CustomFont) => void;
};

const WEIGHT_CHOICES: Array<{ value: number; label: string }> = [
  { value: 300, label: "Light" },
  { value: 400, label: "Regular" },
  { value: 500, label: "Medium" },
  { value: 600, label: "Semi" },
  { value: 700, label: "Bold" },
  { value: 800, label: "Black" },
];

export function AddFontDialog({
  open,
  onOpenChange,
  existingFamilies,
  onAdd,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add font</DialogTitle>
          <DialogDescription>
            Use any Google Font by name, or upload your own font file.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="google">
          <TabsList className="w-full">
            <TabsTrigger value="google">Google Font</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="google" className="pt-3">
            <GoogleFontForm
              existingFamilies={existingFamilies}
              onSubmit={(font) => {
                onAdd(font);
                onOpenChange(false);
              }}
            />
          </TabsContent>

          <TabsContent value="upload" className="pt-3">
            <UploadFontForm
              existingFamilies={existingFamilies}
              onSubmit={(font) => {
                onAdd(font);
                onOpenChange(false);
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function GoogleFontForm({
  existingFamilies,
  onSubmit,
}: {
  existingFamilies: string[];
  onSubmit: (font: CustomFont) => void;
}) {
  const [family, setFamily] = useState("");
  const [weights, setWeights] = useState<number[]>([400, 700]);
  const [italics, setItalics] = useState(false);

  const trimmed = family.trim();
  const duplicate =
    trimmed.length > 0 &&
    existingFamilies.some((f) => f.toLowerCase() === trimmed.toLowerCase());
  const canSubmit = trimmed.length > 0 && weights.length > 0 && !duplicate;

  const toggleWeight = (w: number, on: boolean) => {
    setWeights((prev) => {
      const set = new Set(prev);
      if (on) set.add(w);
      else set.delete(w);
      return Array.from(set).sort((a, b) => a - b);
    });
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      family: trimmed,
      source: "google",
      weights,
      italics,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="google-font-family" className="text-xs">
          Font family
        </Label>
        <Input
          id="google-font-family"
          value={family}
          onChange={(e) => setFamily(e.target.value)}
          placeholder="e.g. Crimson Pro"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSubmit) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <p className="text-[11px] text-muted-foreground">
          Type the exact name as it appears on{" "}
          <span className="font-medium">fonts.google.com</span>.
        </p>
        {duplicate ? (
          <p className="text-[11px] text-destructive">
            A custom font with this name already exists.
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Weights</Label>
        <div className="grid grid-cols-3 gap-2">
          {WEIGHT_CHOICES.map((w) => {
            const id = `gf-w-${w.value}`;
            const checked = weights.includes(w.value);
            return (
              <label
                key={w.value}
                htmlFor={id}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border/70 px-2 py-1.5 text-[12px] hover:border-foreground/30"
              >
                <Checkbox
                  id={id}
                  checked={checked}
                  onCheckedChange={(v) => toggleWeight(w.value, v === true)}
                />
                <span style={{ fontWeight: w.value }}>{w.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-[12px]">
        <Checkbox
          checked={italics}
          onCheckedChange={(v) => setItalics(v === true)}
        />
        <span>Include italics</span>
      </label>

      <DialogFooter>
        <DialogClose render={<Button variant="outline" size="sm" />}>
          Cancel
        </DialogClose>
        <Button size="sm" disabled={!canSubmit} onClick={handleSubmit}>
          Add font
        </Button>
      </DialogFooter>
    </div>
  );
}

function UploadFontForm({
  existingFamilies,
  onSubmit,
}: {
  existingFamilies: string[];
  onSubmit: (font: CustomFont) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [family, setFamily] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<{
    url: string;
    format: CustomFontFormat;
  } | null>(null);

  const trimmed = family.trim();
  const duplicate =
    trimmed.length > 0 &&
    existingFamilies.some((f) => f.toLowerCase() === trimmed.toLowerCase());
  const canSubmit = !!uploaded && trimmed.length > 0 && !duplicate;

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/font", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          typeof data?.error === "string" ? data.error : "Upload failed";
        toast.error(message);
        return;
      }
      const data = (await res.json()) as {
        url: string;
        format: CustomFontFormat;
      };
      setUploaded(data);
      if (!family) {
        // Default family name to a cleaned-up filename, host can edit.
        const base = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
        setFamily(base.trim());
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!canSubmit || !uploaded) return;
    onSubmit({
      family: trimmed,
      source: "upload",
      url: uploaded.url,
      format: uploaded.format,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">Font file</Label>
        <input
          ref={inputRef}
          type="file"
          accept=".woff2,.woff,.ttf,.otf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="w-full justify-center gap-2"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploaded
            ? `Replace file (.${uploaded.format})`
            : uploading
              ? "Uploading…"
              : "Choose a font file"}
        </Button>
        <p className="text-[11px] text-muted-foreground">
          .woff2, .woff, .ttf, or .otf — up to 5 MB.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="upload-font-family" className="text-xs">
          Display name
        </Label>
        <Input
          id="upload-font-family"
          value={family}
          onChange={(e) => setFamily(e.target.value)}
          placeholder="e.g. My Brand Sans"
          disabled={!uploaded}
        />
        {duplicate ? (
          <p className="text-[11px] text-destructive">
            A custom font with this name already exists.
          </p>
        ) : null}
      </div>

      <DialogFooter>
        <DialogClose render={<Button variant="outline" size="sm" />}>
          Cancel
        </DialogClose>
        <Button size="sm" disabled={!canSubmit} onClick={handleSubmit}>
          Add font
        </Button>
      </DialogFooter>
    </div>
  );
}
