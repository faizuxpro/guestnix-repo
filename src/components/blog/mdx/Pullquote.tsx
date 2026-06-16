import type { ReactNode } from "react";

export function Pullquote({
  author,
  role,
  children,
}: {
  author?: string;
  role?: string;
  children: ReactNode;
}) {
  return (
    <figure className="not-prose my-10 border-l-4 border-[var(--marketing-primary)] pl-6">
      <blockquote className="text-2xl font-medium italic leading-snug text-neutral-800">
        &ldquo;{children}&rdquo;
      </blockquote>
      {(author || role) && (
        <figcaption className="mt-3 text-sm text-neutral-500">
          {author && <span className="font-semibold text-neutral-700">{author}</span>}
          {author && role && <span>, </span>}
          {role && <span>{role}</span>}
        </figcaption>
      )}
    </figure>
  );
}
