import { ImageResponse } from "next/og";

export const alt =
  "Guestnix — Digital Welcome Guidebooks for Vacation Rental Hosts";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          color: "white",
          background: "linear-gradient(135deg, #000000 0%, #131b2e 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            opacity: 0.7,
            letterSpacing: 3,
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          Guestnix
        </div>
        <div
          style={{
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -1.5,
            marginBottom: 32,
            maxWidth: 1000,
          }}
        >
          Stop answering the same Wi-Fi question at 11 pm.
        </div>
        <div style={{ fontSize: 28, opacity: 0.85, maxWidth: 900 }}>
          Beautiful digital welcome guidebook with an AI concierge. Free
          forever.
        </div>
      </div>
    ),
    size
  );
}
