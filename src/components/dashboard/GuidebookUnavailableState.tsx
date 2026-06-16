import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  GUIDEBOOK_UNAVAILABLE_MESSAGE,
  GUIDEBOOK_UNAVAILABLE_TITLE,
} from "@/lib/guidebook-error-copy";

type Props = {
  title?: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
};

export function GuidebookUnavailableState({
  title = GUIDEBOOK_UNAVAILABLE_TITLE,
  description = GUIDEBOOK_UNAVAILABLE_MESSAGE,
  actionHref = "/dashboard/guidebooks",
  actionLabel = "Back to guidebooks",
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex min-h-[60vh] items-center justify-center bg-background p-6",
        className
      )}
    >
      <div className="w-full max-w-lg rounded-lg border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        <Button className="mt-5" render={<Link href={actionHref} />}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
