import { Children, isValidElement, type ReactNode, type ReactElement } from "react";
import { Schema } from "../Schema";
import { buildFaqJsonLd } from "@/lib/blog/jsonld";
import type { FaqItemProps } from "./FaqItem";

export function Faq({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).filter(
    (c): c is ReactElement<FaqItemProps> => isValidElement(c),
  );
  const schema = buildFaqJsonLd(items.map((i) => ({ q: i.props.q, a: i.props.a })));
  return (
    <section className="not-prose my-8">
      <div className="space-y-2">{children}</div>
      <Schema data={schema} />
    </section>
  );
}
