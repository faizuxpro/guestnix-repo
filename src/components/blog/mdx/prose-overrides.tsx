import Link from "next/link";
import type { AnchorHTMLAttributes } from "react";

export function StyledLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const href = props.href ?? "";
  const isExternal = href.startsWith("http");
  if (isExternal) {
    return <a {...props} target="_blank" rel="noopener noreferrer" />;
  }
  return <Link href={href} {...props} />;
}
