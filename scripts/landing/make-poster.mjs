/**
 * The landing video's poster: one frame of our own demo video (the party
 * reveal, just before "Maligayang Pasko!", the star in the middle left free
 * for the play label), as AVIF and WebP at 640 and 1280 wide, into
 * public/landing/. Served from this site: the landing makes no request to
 * YouTube until someone presses play.
 *
 *   ffmpeg -ss 39.74 -i video/out/monito-monita-demo.mp4 -frames:v 1 frame.png
 *   node scripts/landing/make-poster.mjs frame.png
 *
 * (Remotion's ffmpeg is at video/node_modules/@remotion/compositor-*\/ffmpeg.)
 */
import { mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const src = process.argv[2];
if (!src) {
  console.error("usage: node scripts/landing/make-poster.mjs <frame.png>");
  process.exit(1);
}
const out = join(process.cwd(), "public", "landing");
mkdirSync(out, { recursive: true });

for (const width of [640, 1280]) {
  const base = sharp(src).resize({ width, height: Math.round((width * 9) / 16), fit: "cover" });
  const avif = join(out, `demo-poster-${width}.avif`);
  const webp = join(out, `demo-poster-${width}.webp`);
  await base.clone().avif({ quality: 52, effort: 6 }).toFile(avif);
  await base.clone().webp({ quality: 78, effort: 6 }).toFile(webp);
  for (const f of [avif, webp]) console.log(`${f.slice(out.length + 1)}: ${(statSync(f).size / 1024).toFixed(1)} KB`);
}
