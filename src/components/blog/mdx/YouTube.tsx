export function YouTube({ id, title }: { id: string; title: string }) {
  return (
    <div className="not-prose my-8 overflow-hidden rounded-2xl border border-neutral-200">
      <div className="relative aspect-video">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}`}
          title={title}
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  );
}
