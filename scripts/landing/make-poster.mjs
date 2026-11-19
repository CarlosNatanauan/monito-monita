/**
 * The landing video's poster (docs/design/landing-video, direction 1a): the
 * opened slip "Carlo" on the gold ray disc, rendered from the Remotion still
 * (video/src/Poster.tsx), as WebP at 1280×720, 800×450 and 640×360 into
 * public/landing/ (the <img> srcset). Served from this site.
 *
 *   cd video && npx remotion still LandingPoster out/landing-poster.png && cd ..
 *   node scripts/landing/make-poster.mjs video/out/landing-poster.png
 */
import { mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const src = process.argv[2];
if (!src) {
  console.error("usage: node scripts/landing/make-poster.mjs <still.png>");
  process.exit(1);
}
const out = join(process.cwd(), "public", "landing");
mkdirSync(out, { recursive: true });

for (const [width, quality] of [
  [1280, 86],
  [800, 84],
  [640, 82],
]) {
  const file = join(out, `poster-${width}.webp`);
  await sharp(src)
    .resize({ width, height: Math.round((width * 9) / 16), fit: "cover" })
    .webp({ quality, effort: 6, smartSubsample: true })
    .toFile(file);
  console.log(`poster-${width}.webp: ${(statSync(file).size / 1024).toFixed(1)} KB`);
}
