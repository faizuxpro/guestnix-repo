import { ImageResponse } from "next/og";
import { SITE } from "@/lib/seo/site";

export const alt = `${SITE.name} Blog`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #131b2e 0%, #000000 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 40, opacity: 0.85, letterSpacing: -0.5 }}>
          {SITE.name}
        </div>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 800, marginTop: 20, letterSpacing: -2 }}>
          The Blog
        </div>
        <div style={{ display: "flex", fontSize: 32, opacity: 0.85, marginTop: 16, maxWidth: 900 }}>
          {`Hosting tips, product updates, and guides from the ${SITE.name} team.`}
        </div>
      </div>
    ),
    { ...size },
  );
}
