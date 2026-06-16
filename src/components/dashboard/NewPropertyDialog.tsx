"use client";

import { useState } from "react";
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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { PropertyData } from "./PropertyCard";

interface NewPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  editProperty?: PropertyData | null;
}

export function NewPropertyDialog({
  open,
  onOpenChange,
  onCreated,
  editProperty,
}: NewPropertyDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(editProperty?.name ?? "");
  const [address, setAddress] = useState(editProperty?.address ?? "");
  const [city, setCity] = useState(editProperty?.city ?? "");
  const [state, setState] = useState(editProperty?.state ?? "");
  const [country, setCountry] = useState(
    editProperty?.country ?? "United States"
  );

  const isEditing = !!editProperty;

  // Reset form when dialog opens with a new property or no property
  function resetForm() {
    setName(editProperty?.name ?? "");
    setAddress(editProperty?.address ?? "");
    setCity(editProperty?.city ?? "");
    setState(editProperty?.state ?? "");
    setCountry(editProperty?.country ?? "United States");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name,
      address: address || undefined,
      city: city || undefined,
      state: state || undefined,
      country: country || undefined,
    };

    const url = isEditing
      ? `/api/properties/${editProperty.id}`
      : "/api/properties";
    const method = isEditing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error?.name?.[0] || "Failed to save property");
      setLoading(false);
      return;
    }

    toast.success(isEditing ? "Property updated" : "Property created");
    onCreated();
    onOpenChange(false);
    resetForm();
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Property" : "New Property"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your property details."
              : "Add a property to link guidebooks to."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="prop-name">Property name *</Label>
            <Input
              id="prop-name"
              placeholder="e.g. Sunset Beach House"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prop-address">Street address</Label>
            <Input
              id="prop-address"
              placeholder="123 Main St"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prop-city">City</Label>
              <Input
                id="prop-city"
                placeholder="Austin"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prop-state">State / Region</Label>
              <Input
                id="prop-state"
                placeholder="Texas"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prop-country">Country</Label>
              <Input
                id="prop-country"
                placeholder="United States"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
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
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Property"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
