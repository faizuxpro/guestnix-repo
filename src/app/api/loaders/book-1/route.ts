import { readFileSync } from "node:fs";
import path from "node:path";

const DEFAULT_STROKE = "#ff0000";
const SVG_STROKE_TOKEN = DEFAULT_STROKE;
const LOOPING_REPEAT_TOKEN = 'repeatCount="indefinite"';
const SINGLE_PASS_REPEAT_TOKEN = 'repeatCount="1"';
const SAFE_HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;
const BOOK_ONE_SVG_PATH = path.join(
  process.cwd(),
  "public",
  "loaders",
  "guidebook-book-1.svg"
);
const BOOK_ONE_SVG = readFileSync(BOOK_ONE_SVG_PATH, "utf8").replaceAll(
  LOOPING_REPEAT_TOKEN,
  SINGLE_PASS_REPEAT_TOKEN
);

function readColor(request: Request) {
  const color = new URL(request.url).searchParams.get("color") ?? "";
  return SAFE_HEX_COLOR.test(color) ? color : DEFAULT_STROKE;
}

export function GET(request: Request) {
  const color = readColor(request);
  const svg = BOOK_ONE_SVG.replaceAll(SVG_STROKE_TOKEN, color);

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
