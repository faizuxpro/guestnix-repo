"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";
import { toastApiError } from "@/lib/toast-error";

interface Property {
  id: string;
  name: string;
}

const TEMPLATES = [
  {
    id: "sunset-lakehouse",
    name: "Sunset Lakehouse",
    description: "Warm, inviting design perfect for vacation homes",
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    description: "Clean, minimalist design for urban stays",
  },
  {
    id: "cozy-cabin",
    name: "Cozy Cabin",
    description: "Rustic, cozy aesthetic for mountain retreats",
  },
];

interface NewGuidebookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
  initialPropertyId?: string;
}

export function NewGuidebookDialog({
  open,
  onOpenChange,
  onCreated,
  initialPropertyId,
}: NewGuidebookDialogProps) {
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [title, setTitle] = useState("");
  const [propertyId, setPropertyId] = useState<string>("");
  const [templateId, setTemplateId] = useState("sunset-lakehouse");

  const fetchProperties = useCallback(async () => {
    const result = await apiFetch<Property[]>("/api/properties");
    if (result.ok) {
      setProperties(result.data);
    }
    // Silent on failure: this is a non-essential populate; the dialog still
    // works with the "No property" option.
  }, []);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPropertyId(initialPropertyId ?? "");
    void fetchProperties();
  }, [open, fetchProperties, initialPropertyId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = await apiFetch<{ id: string }>("/api/guidebooks", {
      method: "POST",
      body: {
        title,
        propertyId: propertyId || undefined,
        templateId,
      },
    });

    setLoading(false);

    if (!result.ok) {
      toastApiError(result.error, {
        title: "Couldn't create guidebook",
        onRetry: () => void handleSubmit(e),
      });
      return;
    }

    toast.success("Guidebook created!");
    onCreated(result.data.id);
    onOpenChange(false);
    setTitle("");
    setPropertyId(initialPropertyId ?? "");
    setTemplateId("sunset-lakehouse");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Guidebook</DialogTitle>
          <DialogDescription>
            Set up your guidebook basics. You can customize everything in the editor.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="gb-title">Guidebook title *</Label>
            <Input
              id="gb-title"
              placeholder="e.g. Sunset Beach Welcome Guide"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Property */}
          <div className="space-y-1.5">
            <Label>Property (optional)</Label>
            <Select value={propertyId} onValueChange={(v) => setPropertyId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
                {properties.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No properties yet. You can add one later.
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Template */}
          <div className="space-y-1.5">
            <Label>Template</Label>
            <div className="grid gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplateId(t.id)}
                  className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                    templateId === t.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="h-8 w-8 rounded bg-primary/10 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create & Open Editor
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
