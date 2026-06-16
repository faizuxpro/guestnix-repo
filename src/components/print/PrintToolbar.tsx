"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { waitForPrintAssets } from "@/components/print/print-ready";

type Props = {
  title: string;
  backHref: string;
  publicUrl: string;
  templateName: string;
};

export function PrintToolbar({
  title,
  backHref,
  publicUrl,
  templateName,
}: Props) {
  const [preparing, setPreparing] = useState(false);

  async function handlePrint() {
    if (preparing) return;
    setPreparing(true);
    try {
      await waitForPrintAssets();
      window.print();
    } finally {
      window.setTimeout(() => setPreparing(false), 250);
    }
  }

  return (
    <div className="print:hidden sticky top-0 z-40 border-b bg-background/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="sm" render={<Link href={backHref} />}>
            <ArrowLeft className="h-4 w-4" />
            Settings
          </Button>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{title}</div>
            <div className="truncate text-xs text-muted-foreground">
              {templateName}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={
              <a href={publicUrl} target="_blank" rel="noreferrer noopener" />
            }
          >
            <ExternalLink className="h-4 w-4" />
            Live guide
          </Button>
          <Button size="sm" onClick={() => void handlePrint()} disabled={preparing}>
            <Printer className="h-4 w-4" />
            {preparing ? "Preparing..." : "Print / PDF"}
          </Button>
        </div>
      </div>
    </div>
  );
}
