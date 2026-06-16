"use client";

import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Check, Copy, Download } from "lucide-react";

type Props = {
  url: string;
};

export function QrCodeCard({ url }: Props) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement | null>(null);

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
      <div ref={qrRef}>
        <QRCodeSVG value={url} size={128} marginSize={2} />
      </div>
      <div className="w-full break-all rounded bg-muted px-2 py-1 text-center text-xs">
        {url}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? (
            <Check className="mr-1 h-3.5 w-3.5" />
          ) : (
            <Copy className="mr-1 h-3.5 w-3.5" />
          )}
          {copied ? "Copied" : "Copy link"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={downloadQr}>
          <Download className="mr-1 h-3.5 w-3.5" />
          Download QR
        </Button>
      </div>
    </div>
  );
}
