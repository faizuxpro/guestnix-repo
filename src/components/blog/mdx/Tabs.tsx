"use client";

import {
  Children,
  isValidElement,
  useState,
  type ReactNode,
  type ReactElement,
} from "react";
import { cn } from "@/lib/utils";
import type { TabProps } from "./Tab";

export function Tabs({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).filter(
    (c): c is ReactElement<TabProps> => isValidElement(c),
  );
  const [active, setActive] = useState(0);
  return (
    <div className="not-prose my-8 rounded-2xl border border-neutral-200 bg-white">
      <div className="flex gap-1 border-b border-neutral-200 p-1">
        {items.map((item, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium",
              i === active
                ? "bg-neutral-100 text-neutral-900"
                : "text-neutral-600 hover:bg-neutral-50",
            )}
          >
            {item.props.label}
          </button>
        ))}
      </div>
      <div className="p-5">{items[active]}</div>
    </div>
  );
}
