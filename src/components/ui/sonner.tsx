"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      closeButton
      visibleToasts={4}
      gap={10}
      containerAriaLabel="Status updates"
      icons={{
        success: (
          <CircleCheckIcon className="size-5 text-success" />
        ),
        info: (
          <InfoIcon className="size-5 text-primary" />
        ),
        warning: (
          <TriangleAlertIcon className="size-5 text-warning" />
        ),
        error: (
          <OctagonXIcon className="size-5 text-destructive" />
        ),
        loading: (
          <Loader2Icon className="size-5 animate-spin text-primary" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        duration: 4500,
        classNames: {
          toast:
            "cn-toast rounded-xl border border-border/90 bg-popover/98 px-4 py-3 text-popover-foreground shadow-2xl ring-1 ring-foreground/5 backdrop-blur-md",
          title: "text-sm font-semibold leading-snug",
          description: "mt-1 text-xs leading-relaxed text-muted-foreground",
          content: "gap-0",
          icon: "mr-2.5 shrink-0",
          closeButton:
            "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
          actionButton:
            "rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90",
          cancelButton:
            "rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted",
          success: "border-success/35",
          error: "border-destructive/35",
          warning: "border-warning/45",
          loading: "border-primary/30",
          info: "border-primary/25",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
