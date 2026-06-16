import { Check } from "lucide-react";
import type { ReactNode } from "react";

export function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-neutral-800">
      <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
      <span>{children}</span>
    </li>
  );
}
