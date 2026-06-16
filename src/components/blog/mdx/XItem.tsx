import { X } from "lucide-react";
import type { ReactNode } from "react";

export function XItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-neutral-800">
      <X className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
      <span>{children}</span>
    </li>
  );
}
