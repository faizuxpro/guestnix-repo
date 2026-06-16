import { ImageResponse } from "next/og";
import { getPost, getAllPostSlugs } from "@/lib/blog/content";
import { requireAuthor } from "@/lib/blog/authors";
import { getCategory } from "@/lib/blog/taxonomy";
import { SITE } from "@/lib/seo/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function generateStaticParams() {
  const slugs = await getAllPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) {
    return new ImageResponse(
      <div style={{ display: "flex" }}>Not found</div>,
      size
    );
  }
  const author = await requireAuthor(post.author);
  const category = getCategory(post.category);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "#0a0a0a",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              padding: "8px 20px",
              borderRadius: 999,
              background: category.accent,
              color: "white",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            {category.name}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 68,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: -1.5,
            maxWidth: 1000,
          }}
        >
          {post.title}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28 }}>
          <div style={{ display: "flex", opacity: 0.85 }}>{`By ${author.name}`}</div>
          <div style={{ display: "flex", opacity: 0.5 }}>·</div>
          <div style={{ display: "flex", opacity: 0.85 }}>{SITE.name}</div>
        </div>
      </div>
    ),
    size
  );
}
