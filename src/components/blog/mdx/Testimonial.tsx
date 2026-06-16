import Image from "next/image";
import type { ReactNode } from "react";

export function Testimonial({
  avatar,
  name,
  role,
  company,
  children,
}: {
  avatar: string;
  name: string;
  role?: string;
  company?: string;
  children: ReactNode;
}) {
  return (
    <figure className="not-prose my-10 rounded-2xl border border-neutral-200 bg-white p-6">
      <blockquote className="text-lg italic text-neutral-800">&ldquo;{children}&rdquo;</blockquote>
      <figcaption className="mt-4 flex items-center gap-3">
        <Image src={avatar} alt={name} width={40} height={40} className="rounded-full" />
        <div className="text-sm">
          <p className="font-semibold text-neutral-900">{name}</p>
          {(role || company) && (
            <p className="text-neutral-500">
              {role}
              {role && company && " · "}
              {company}
            </p>
          )}
        </div>
      </figcaption>
    </figure>
  );
}
