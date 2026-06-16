import Image from "next/image";

export function Bookmark({
  href,
  title,
  description,
  image,
  site,
}: {
  href: string;
  title: string;
  description?: string;
  image?: string;
  site?: string;
}) {
  const siteLabel = site ?? (() => {
    try {
      return new URL(href).hostname;
    } catch {
      return href;
    }
  })();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="not-prose my-8 flex overflow-hidden rounded-2xl border border-neutral-200 bg-white transition hover:border-neutral-300 hover:shadow-sm"
    >
      <div className="flex-1 p-5">
        <p className="line-clamp-1 font-semibold text-neutral-900">{title}</p>
        {description && (
          <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{description}</p>
        )}
        <p className="mt-3 text-xs text-neutral-500">{siteLabel}</p>
      </div>
      {image && (
        <div className="relative hidden aspect-[4/3] w-40 shrink-0 bg-neutral-100 sm:block">
          <Image src={image} alt="" fill sizes="160px" className="object-cover" />
        </div>
      )}
    </a>
  );
}
