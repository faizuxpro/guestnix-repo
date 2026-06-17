"use client";

import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, Download } from "lucide-react";

type Props = {
  url: string;
  urlLabel?: string;
  secondaryUrl?: string;
  secondaryUrlLabel?: string;
};

export function QrCodeCard({
  url,
  urlLabel = "Guestnix app link",
  secondaryUrl,
  secondaryUrlLabel = "Guestnix app link",
}: Props) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement | null>(null);
  const hasSecondaryUrl = Boolean(secondaryUrl);
  const copyButtonLabel =
    copied || !hasSecondaryUrl ? (copied ? "Copied" : "Copy link") : "Copy custom link";

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadQr = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const imageSize = 1024;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(imageSize));
    clone.setAttribute("height", String(imageSize));

    const svgText = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgText], {
      type: "image/svg+xml;charset=utf-8",
    });
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = imageSize;
      canvas.height = imageSize;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        return;
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, imageSize, imageSize);
      context.drawImage(image, 0, 0, imageSize, imageSize);
      URL.revokeObjectURL(objectUrl);

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = "guidebook-qr.png";
      link.click();
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
    };

    image.src = objectUrl;
  };

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border p-4">
      <div className="flex w-full flex-wrap items-center justify-center gap-2 text-center">
        <span className="text-sm font-medium">
          QR code uses {urlLabel.toLowerCase()}
        </span>
        {hasSecondaryUrl ? <Badge>Primary</Badge> : null}
      </div>
      <div ref={qrRef}>
        <QRCodeSVG value={url} size={128} marginSize={2} />
      </div>
      <div className="w-full space-y-2">
        <div className="rounded border bg-muted/50 px-2 py-2">
          <div className="mb-1 flex flex-wrap items-center justify-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground">
              {urlLabel}
            </span>
            {hasSecondaryUrl ? (
              <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                Copied by default
              </Badge>
            ) : null}
          </div>
          <div className="break-all text-center text-xs">{url}</div>
        </div>
        {secondaryUrl ? (
          <div className="rounded border bg-background px-2 py-2">
            <div className="mb-1 flex flex-wrap items-center justify-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                {secondaryUrlLabel}
              </span>
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                Also exists
              </Badge>
            </div>
            <div className="break-all text-center text-xs text-muted-foreground">
              {secondaryUrl}
            </div>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? (
            <Check className="mr-1 h-3.5 w-3.5" />
          ) : (
            <Copy className="mr-1 h-3.5 w-3.5" />
          )}
          {copyButtonLabel}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={downloadQr}>
          <Download className="mr-1 h-3.5 w-3.5" />
          Download QR
        </Button>
      </div>
    </div>
  );
}
