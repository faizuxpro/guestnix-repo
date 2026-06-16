import Image from "next/image";

export function Figure({
  src,
  alt,
  caption,
  priority,
  width = 1600,
  height = 900,
}: {
  src: string;
  alt: string;
  caption?: string;
  priority?: boolean;
  width?: number;
  height?: number;
}) {
  return (
    <figure className="not-prose my-8">
      <div className="overflow-hidden rounded-2xl bg-neutral-100">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          sizes="(min-width: 768px) 720px, 100vw"
          className="h-auto w-full"
        />
      </div>
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-neutral-500">{caption}</figcaption>
      )}
    </figure>
  );
}
