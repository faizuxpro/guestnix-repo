import { Info, Lightbulb, AlertTriangle, XCircle, CheckCircle2, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type CalloutType = "info" | "tip" | "warning" | "danger" | "success" | "note";

const STYLES: Record<CalloutType, { bg: string; border: string; icon: ReactNode }> = {
  info:    { bg: "bg-sky-50",    border: "border-sky-300",    icon: <Info className="h-5 w-5 text-sky-600" /> },
  tip:     { bg: "bg-amber-50",  border: "border-amber-300",  icon: <Lightbulb className="h-5 w-5 text-amber-600" /> },
  warning: { bg: "bg-orange-50", border: "border-orange-300", icon: <AlertTriangle className="h-5 w-5 text-orange-600" /> },
  danger:  { bg: "bg-red-50",    border: "border-red-300",    icon: <XCircle className="h-5 w-5 text-red-600" /> },
  success: { bg: "bg-emerald-50",border: "border-emerald-300",icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" /> },
  note:    { bg: "bg-neutral-50",border: "border-neutral-300",icon: <StickyNote className="h-5 w-5 text-neutral-600" /> },
};

export function Callout({
  type = "info",
  title,
  children,
}: {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
}) {
  const s = STYLES[type];
  return (
    <aside
      className={cn("not-prose my-6 flex gap-3 rounded-xl border-l-4 px-4 py-3", s.bg, s.border)}
    >
      <div className="mt-0.5 shrink-0">{s.icon}</div>
      <div className="flex-1 text-sm text-neutral-800">
        {title && <p className="mb-1 font-semibold text-neutral-900">{title}</p>}
        <div className="[&>p:last-child]:mb-0 [&>p]:mb-2">{children}</div>
      </div>
    </aside>
  );
}
