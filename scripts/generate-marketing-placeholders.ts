/**
 * One-shot placeholder generator for marketing assets.
 * Creates solid-color PNGs/JPGs at the exact paths the landing page expects,
 * so the build works before real screenshots / photos arrive.
 *
 * Run once: npx tsx scripts/generate-marketing-placeholders.ts
 * Safe to re-run — overwrites existing placeholders. Delete this script
 * once real assets are in place.
 */

import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";

type Placeholder = {
  file: string;
  width: number;
  height: number;
  bg: string; // hex
  label: string;
  format: "png" | "jpg";
};

const HERO_DIR = "public/marketing/hero-screens";
const TEMPLATE_DIR = "public/marketing/templates";

const PLACEHOLDERS: Placeholder[] = [
  { file: `${HERO_DIR}/01-welcome.png`, width: 780, height: 1688, bg: "#002927", label: "Welcome", format: "png" },
  { file: `${HERO_DIR}/02-wifi.png`, width: 780, height: 1688, bg: "#03817b", label: "Wi-Fi", format: "png" },
  { file: `${HERO_DIR}/03-checkin.png`, width: 780, height: 1688, bg: "#1c1a17", label: "Check-in", format: "png" },
  { file: `${HERO_DIR}/04-places.png`, width: 780, height: 1688, bg: "#3a5a40", label: "Places", format: "png" },
  { file: `${HERO_DIR}/05-ai-chat.png`, width: 780, height: 1688, bg: "#d4a23a", label: "AI Chat", format: "png" },
  { file: `${TEMPLATE_DIR}/oceanview-villa.jpg`, width: 800, height: 600, bg: "#2e86ab", label: "Oceanview Villa", format: "jpg" },
  { file: `${TEMPLATE_DIR}/alpine-cabin.jpg`, width: 800, height: 600, bg: "#3a5a40", label: "Alpine Cabin", format: "jpg" },
  { file: `${TEMPLATE_DIR}/city-flat.jpg`, width: 800, height: 600, bg: "#6c757d", label: "City Flat", format: "jpg" },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

async function makePlaceholder(p: Placeholder) {
  const bg = hexToRgb(p.bg);
  const fontSize = Math.floor(p.width / 12);

  const svg = Buffer.from(`
    <svg width="${p.width}" height="${p.height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="rgb(${bg.r},${bg.g},${bg.b})"/>
      <text
        x="50%" y="50%"
        font-family="Montserrat, Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="700"
        fill="rgba(255,255,255,0.85)"
        text-anchor="middle"
        dominant-baseline="middle"
      >${p.label}</text>
      <text
        x="50%" y="${Math.floor(p.height * 0.6)}"
        font-family="Arial, sans-serif"
        font-size="${Math.floor(fontSize * 0.4)}"
        font-weight="400"
        fill="rgba(255,255,255,0.5)"
        text-anchor="middle"
        dominant-baseline="middle"
      >placeholder — replace with real asset</text>
    </svg>
  `);

  const pipeline = sharp(svg).resize(p.width, p.height);
  if (p.format === "png") {
    await pipeline.png().toFile(p.file);
  } else {
    await pipeline.jpeg({ quality: 85 }).toFile(p.file);
  }
  console.log(`Generated ${p.file}`);
}

async function main() {
  await fs.mkdir(HERO_DIR, { recursive: true });
  await fs.mkdir(TEMPLATE_DIR, { recursive: true });
  for (const p of PLACEHOLDERS) {
    const dir = path.dirname(p.file);
    await fs.mkdir(dir, { recursive: true });
    await makePlaceholder(p);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
