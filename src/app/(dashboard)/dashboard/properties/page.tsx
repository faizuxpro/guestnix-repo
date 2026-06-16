"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Building2, Plus } from "lucide-react";
import { PropertyCard, type PropertyData } from "@/components/dashboard/PropertyCard";
import { NewPropertyDialog } from "@/components/dashboard/NewPropertyDialog";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";
import { toastApiError } from "@/lib/toast-error";
import { useFeedbackDialog } from "@/components/ui/feedback-dialog";

export default function PropertiesPage() {
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProperty, setEditProperty] = useState<PropertyData | null>(null);
  const { requestConfirmation } = useFeedbackDialog();

  const fetchProperties = useCallback(async () => {
    const result = await apiFetch<PropertyData[]>("/api/properties");
    setLoading(false);
    if (!result.ok) {
      toastApiError(result.error, {
        title: "Couldn't load properties",
        // eslint-disable-next-line react-hooks/immutability
        onRetry: () => void fetchProperties(),
      });
      return;
    }
    setProperties(result.data);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchProperties();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchProperties]);

  async function handleDelete(id: string) {
    const confirmed = await requestConfirmation({
      title: "Delete this property?",
      description:
        "Guidebooks linked to it won't be deleted, but they will be unlinked from this property.",
      confirmLabel: "Delete property",
      tone: "danger",
      busyLabel: "Deleting...",
    });
    if (!confirmed) {
      return;
    }
    const toastId = toast.loading("Deleting property...");
    const result = await apiFetch(`/api/properties/${id}`, {
      method: "DELETE",
      parseJson: false,
    });
    if (!result.ok) {
      toastApiError(result.error, {
        id: toastId,
        title: "Couldn't delete property",
        onRetry: () => void handleDelete(id),
      });
      return;
    }
    toast.success("Property deleted", {
      id: toastId,
      description: "The property was removed from your portfolio.",
    });
    void fetchProperties();
  }

  function handleEdit(property: PropertyData) {
    setEditProperty(property);
    setDialogOpen(true);
  }

  function handleNewProperty() {
    setEditProperty(null);
    setDialogOpen(true);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
          <p className="text-muted-foreground">
            Manage your portfolio and the guidebooks linked to each place.
          </p>
        </div>
        <Button onClick={handleNewProperty}>
          <Plus className="mr-2 h-4 w-4" />
          Add Property
        </Button>
      </div>

      {/* Property grid or empty state */}
      {properties.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No properties yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Add your first property to start creating guidebooks for your guests.
            </p>
            <Button onClick={handleNewProperty}>
              <Plus className="mr-2 h-4 w-4" />
              Add Property
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Dialog */}
      <NewPropertyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={() => {
          void fetchProperties();
        }}
        editProperty={editProperty}
      />
    </div>
  );
}
