"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GradientButton } from "./GradientButton";

const DEMO_URL = "/demo/sunset-template";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyName: string;
};

export function ComingSoonDialog({ open, onOpenChange, propertyName }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Live demo coming soon</DialogTitle>
          <DialogDescription>
            The demo guidebook for <strong>{propertyName}</strong> is on the way.
            In the meantime, try the Oceanview Villa demo, or start your own
            guidebook in 5 minutes.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col sm:flex-row gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            render={<Link href={DEMO_URL} />}
            className="flex-1"
          >
            See Oceanview Villa demo
          </Button>
          <GradientButton href="/signup" size="default" className="flex-1">
            Start free
          </GradientButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
