# Marketing assets — PLACEHOLDERS

The images in `hero-screens/` and `templates/` are generated placeholders (colored rectangles with text labels). Replace them with real assets before launch.

## hero-screens/

5 PNGs, portrait 780×1688 (iPhone 14 viewport @ 2x). Captured from the actual Guestnix product.

- `01-welcome.png` — Hero/welcome view of `/demo/sunset-template`
- `02-wifi.png` — Wi-Fi section popup
- `03-checkin.png` — Check-in section popup
- `04-places.png` — Places/map section
- `05-ai-chat.png` — AI chat widget open with a conversation

**How to capture:**
1. Seed `sunset-template` if not already: `npx tsx scripts/seed-demo-sunset.ts`
2. `npm run dev`, open `http://localhost:3000/demo/sunset-template`
3. Chrome DevTools → device toolbar → 390×844 (iPhone 14) at 2× pixel ratio
4. Screenshot each section, save at 780×1688 as PNG
5. Overwrite the files here

## templates/

3 JPGs, 800×600 landscape. Royalty-free Unsplash photos.

- `oceanview-villa.jpg` — coastal/beach rental
- `alpine-cabin.jpg` — forest/snow cabin
- `city-flat.jpg` — modern urban apartment

**How to source:**
1. Go to unsplash.com (free, royalty-free)
2. Search the property types above
3. Download at 800×600 or larger
4. Optionally compress via tinypng.com
5. Overwrite the files here

## Regenerating placeholders

If you need to regenerate placeholders (e.g. new paths added):

```bash
npx tsx scripts/generate-marketing-placeholders.ts
```

Delete `scripts/generate-marketing-placeholders.ts` once all real assets are in place.
