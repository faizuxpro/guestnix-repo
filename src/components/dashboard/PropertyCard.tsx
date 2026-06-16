"use client";

import Link from "next/link";
import { formatDate } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen,
  Building2,
  Eye,
  FileCheck,
  FileText,
  MapPin,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

export interface PropertyData {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  createdAt: string;
  guidebookCount: number;
  publishedGuidebookCount: number;
  draftGuidebookCount: number;
  viewCount: number;
  lastGuidebookUpdatedAt: string | null;
}

interface PropertyCardProps {
  property: PropertyData;
  onEdit: (property: PropertyData) => void;
  onDelete: (id: string) => void;
}

export function PropertyCard({ property, onEdit, onDelete }: PropertyCardProps) {
  const location = [property.city, property.state, property.country]
    .filter(Boolean)
    .join(", ");
  const guidebookLabel =
    property.guidebookCount === 1 ? "guidebook" : "guidebooks";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">{property.name}</CardTitle>
            {location && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" />
                {location}
              </p>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="h-8 w-8" />
            }
          >
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(property)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(property.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-4">
        {property.address && (
          <p className="text-sm text-muted-foreground">{property.address}</p>
        )}

        <div className="grid grid-cols-4 gap-2 rounded-lg bg-muted/45 p-2 text-center">
          <Metric
            icon={BookOpen}
            label="Guides"
            value={property.guidebookCount.toLocaleString()}
          />
          <Metric
            icon={FileCheck}
            label="Live"
            value={property.publishedGuidebookCount.toLocaleString()}
          />
          <Metric
            icon={FileText}
            label="Draft"
            value={property.draftGuidebookCount.toLocaleString()}
          />
          <Metric
            icon={Eye}
            label="Views"
            value={property.viewCount.toLocaleString()}
          />
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            {property.guidebookCount > 0
              ? `${property.guidebookCount.toLocaleString()} ${guidebookLabel} linked`
              : "No guidebooks linked yet"}
          </p>
          <p>
            {property.lastGuidebookUpdatedAt
              ? `Last guidebook update ${formatDate(property.lastGuidebookUpdatedAt)}`
              : `Added ${formatDate(property.createdAt)}`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 border-t pt-3">
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/dashboard/guidebooks?property=${property.id}`} />}
          >
            <BookOpen className="mr-1.5 h-3.5 w-3.5" />
            View guidebooks
          </Button>
          <Button
            size="sm"
            render={
              <Link
                href={`/dashboard/guidebooks?property=${property.id}&new=1`}
              />
            }
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New guidebook
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-md bg-background text-muted-foreground shadow-sm">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="truncate text-sm font-semibold tabular-nums">{value}</div>
      <div className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
