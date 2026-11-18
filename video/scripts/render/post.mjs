/**
 * Post steps after a render (Remotion's bundled ffmpeg):
 *   node scripts/render/post.mjs loudness [file]   out/monito-monita-demo.mp4 (or out/<file>): -14 LUFS integrated, true peak under -1 dBTP (video copied)
 *   node scripts/render/post.mjs loop       out/loop-full.webm -> out/monito-monita-loop.webm (1280x720)
 *                                           and out/monito-monita-loop.gif (640x360, 15 fps, one shared palette, under 5 MB)
 */
import { spawnSync } from "node:child_process";
import { renameSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { FFMPEG, VIDEO } from "../audio/dsp.mjs";

const ff = (args) => {
  const r = spawnSync(FFMPEG, ["-hide_banner", ...args], { encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(r.stderr);
  return r.stderr;
};
const out = (f) => join(VIDEO, "out", f);

const step = process.argv[2];
if (step === "loudness") {
  const src = out(process.argv[3] ?? "monito-monita-demo.mp4");
  const log = ff(["-i", src, "-vn", "-af", "loudnorm=I=-14:TP=-1:LRA=11:print_format=json", "-f", "null", "-"]);
  const m = JSON.parse(log.slice(log.lastIndexOf("{"), log.lastIndexOf("}") + 1));
  const gain = -14 - Number(m.input_i);
  const peakAfter = Number(m.input_tp) + gain;
  // A plain gain keeps the mix as it is; it only fits under -1 dBTP when the peaks allow.
  const g = peakAfter > -1 ? gain - (peakAfter + 1) : gain;
  console.log(`measured ${m.input_i} LUFS, true peak ${m.input_tp} dBTP -> gain ${g.toFixed(2)} dB`);
  const tmp = out("demo-tmp.mp4");
  ff(["-y", "-i", src, "-c:v", "copy", "-af", `volume=${g.toFixed(2)}dB`, "-c:a", "aac", "-b:a", "320k", "-movflags", "+faststart", tmp]);
  rmSync(src);
  renameSync(tmp, src);
  const check = ff(["-i", src, "-vn", "-af", "loudnorm=I=-14:TP=-1:LRA=11:print_format=json", "-f", "null", "-"]);
  const c = JSON.parse(check.slice(check.lastIndexOf("{"), check.lastIndexOf("}") + 1));
  console.log(`now ${c.input_i} LUFS, true peak ${c.input_tp} dBTP`);
} else if (step === "loop") {
  const src = out("loop-full.webm");
  ff(["-y", "-loglevel", "error", "-i", src, "-vf", "scale=1280:720:flags=lanczos", "-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0", "-row-mt", "1", "-an", out("monito-monita-loop.webm")]);
  console.log("out/monito-monita-loop.webm");
  // The GIF: 15 fps, one palette for the whole loop (no flicker at the seam), ordered
  // dither (compresses far better than error diffusion), only the changed rectangle per frame.
  const gif = out("monito-monita-loop.gif");
  const graph = (colors) =>
    `scale=640:360:flags=lanczos,split[a][b];[a]palettegen=max_colors=${colors}:stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`;
  for (const colors of [160, 128, 96]) {
    // This ffmpeg build has no fps filter: -r drops every other frame at the output.
    ff(["-y", "-loglevel", "error", "-i", src, "-filter_complex", graph(colors), "-r", "15", "-loop", "0", gif]);
    const mb = statSync(gif).size / 1e6;
    console.log(`out/monito-monita-loop.gif: ${colors} colours, ${mb.toFixed(2)} MB`);
    if (mb < 5) break;
  }
  rmSync(src);
} else {
  console.log("usage: node scripts/render/post.mjs loudness|loop");
}
