import Image from "next/image";
import Link from "next/link";
import type { Author } from "@/lib/blog/authors";

export function AuthorCard({ author, compact = false }: { author: Author; compact?: boolean }) {
  return (
    <div
      className={`flex items-start gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 ${
        compact ? "p-4" : "p-6"
      }`}
    >
      <Image
        src={author.avatar}
        alt={author.name}
        width={compact ? 48 : 64}
        height={compact ? 48 : 64}
        className="rounded-full"
      />
      <div className="flex-1">
        <Link
          href={`/blog/author/${author.slug}`}
          className="font-semibold text-neutral-900 hover:underline"
        >
          {author.name}
        </Link>
        <p className="text-sm text-neutral-500">{author.role}</p>
        {!compact && <p className="mt-2 text-sm text-neutral-700">{author.bio}</p>}
        {!compact && (
          <div className="mt-3 flex gap-3 text-xs text-neutral-500">
            {author.twitter && (
              <a
                href={`https://twitter.com/${author.twitter}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-neutral-900"
              >
                Twitter
              </a>
            )}
            {author.linkedin && (
              <a
                href={`https://www.linkedin.com/in/${author.linkedin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-neutral-900"
              >
                LinkedIn
              </a>
            )}
            {author.website && (
              <a
                href={author.website}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-neutral-900"
              >
                Website
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
