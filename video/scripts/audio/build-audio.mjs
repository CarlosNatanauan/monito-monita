/**
 * Builds the soundtrack's files into public/audio/:
 * - music.wav: the edit of the track (src/data/music.json), every splice on
 *   a bar line, cut just before the next strum (detected), so no attack is
 *   chopped and no tail doubles;
 * - sfx/*.wav: every sound effect except the crowd cheer, synthesized here:
 *   paper from shaped noise, taps and clicks as short transients, glass,
 *   glockenspiel and chimes as tones in the music's key (B major
 *   pentatonic: B C# D# F# G#);
 * - crowd-cheer.mp3: copied from assets/sfx.
 *
 * Run: node scripts/audio/build-audio.mjs (from video/)
 */
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  biquad, bump, decode, hz, len, mix, noise, normalize, partials, pink, pluck, room, rng, shape, SR, tidy, VIDEO, writeWav, zeros,
} from "./dsp.mjs";

const music = JSON.parse(readFileSync(join(VIDEO, "src", "data", "music.json"), "utf8"));
const OUT = join(VIDEO, "public", "audio");
const SFX = join(OUT, "sfx");
mkdirSync(SFX, { recursive: true });

// --- Music edit --------------------------------------------------------------------

function buildMusic() {
  const [L, R] = decode(join(VIDEO, music.songFile));
  const mono = L.map((v, i) => (v + R[i]) / 2);
  const BAR = music.barSeconds;
  const BEAT = BAR / 4;
  const songBar = (k) => music.songBar0Seconds + k * BAR;
  // The intro is short by introDropBeats: from video bar 2 on, bars start that much earlier.
  const vidBar = (n) => music.v0Seconds + n * BAR - (n >= 2 ? (music.introDropBeats ?? 0) * BEAT : 0);
  const total = music.durationInFrames / music.fps;
  const N = len(total);
  const outL = zeros(N);
  const outR = zeros(N);

  /** The strum onset nearest a predicted bar line (steepest rise in high-passed energy). */
  const onsetNear = (t, w = 0.03) => {
    const h = 48;
    const a = Math.round((t - w) * SR);
    const b = Math.round((t + w) * SR);
    const e = [];
    for (let s = a; s < b; s += h) {
      let sum = 0;
      for (let i = s; i < s + h; i++) {
        const d = mono[i] - mono[i - 1];
        sum += d * d;
      }
      e.push(Math.log(sum + 1e-9));
    }
    let best = 0, bestRise = -Infinity;
    for (let k = 3; k < e.length; k++) {
      const rise = e[k] - e[k - 3];
      if (rise > bestRise) { bestRise = rise; best = k; }
    }
    return (a + best * h) / SR - 0.002;
  };

  const cos = (x) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));
  /**
   * Places song audio so that `songAt` lands on `videoAt`, between video
   * times [v0, v1], with a fade-in of `fin` before v0 and a fade-out of
   * `fout` ending at v1.
   */
  const place = (songAt, videoAt, v0, v1, fin, fout) => {
    const off = songAt - videoAt;
    const i0 = Math.max(0, Math.round((v0 - fin) * SR));
    const i1 = Math.min(N, Math.round(v1 * SR));
    for (let i = i0; i < i1; i++) {
      const t = i / SR;
      const s = Math.round((t + off) * SR);
      if (s < 0 || s >= L.length) continue;
      const g = (fin > 0 ? cos((t - (v0 - fin)) / fin) : 1) * (fout > 0 ? cos((v1 - t) / fout) : 1);
      outL[i] += L[s] * g;
      outR[i] += R[s] * g;
    }
  };

  const report = [];
  for (const seg of music.segments) {
    const vStart = vidBar(seg.videoBar);
    const sOnset = onsetNear(songBar(seg.songBar));
    if (seg.seconds) {
      // The final chord: ring out to the end, fading the last 1.4 s.
      place(sOnset, vStart, vStart, total, 0.008, 1.4);
      report.push(`final chord: song ${sOnset.toFixed(3)} -> video ${vStart.toFixed(3)}`);
      continue;
    }
    const vNext = vidBar(seg.videoBar + seg.bars);
    // Cut 2 ms before this segment's own next strum (mapped to video time).
    const nextOnset = onsetNear(songBar(seg.songBar + seg.bars));
    const vCut = Math.min(vNext, vStart + (nextOnset - sOnset)) - 0.002;
    if (seg.videoBar === 0) {
      // From the pickup at video 0, ending half a beat early (the stumble).
      const end = vNext - (seg.silenceLastBeats ?? 0) * BEAT;
      place(sOnset, vStart, 0.02, end, 0.02, 0.11);
      report.push(`seg 0: pickup from song ${(sOnset - vStart).toFixed(3)}; silence from ${end.toFixed(3)} to ${vNext.toFixed(3)}`);
    } else {
      place(sOnset, vStart, vStart, vCut, 0.008, 0.025);
      report.push(`seg ${seg.videoBar}: song bar ${seg.songBar} onset ${sOnset.toFixed(3)} (grid ${songBar(seg.songBar).toFixed(3)}) -> video ${vStart.toFixed(3)}, cut ${vCut.toFixed(3)}`);
    }
  }
  let peak = 0;
  for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(outL[i]), Math.abs(outR[i]));
  writeWav(join(OUT, "music.wav"), [outL, outR]);
  console.log(report.join("\n"));
  console.log(`music.wav: ${total.toFixed(3)} s, peak ${(20 * Math.log10(peak)).toFixed(2)} dBFS`);
}

// --- Sound effects -------------------------------------------------------------------

const save = (name, x, peakDb = -3) => writeWav(join(SFX, `${name}.wav`), [normalize(tidy(x), peakDb)]);
const smoothNoise = (n, seed, cutoff) => biquad(noise(n, seed), "lp", cutoff, 0.6);

/** Glass tink: inharmonic glassy partials, a little shimmer. */
const tink = (f, sec = 1.2) =>
  mix(len(sec), [partials(sec, f, [[1, 1, 0.55], [2.32, 0.42, 0.28], [4.25, 0.18, 0.13], [6.63, 0.08, 0.07]], 0.0015, 0.0012)], [shape(biquad(noise(len(0.004), 11), "hp", 5000), (t) => 1 - t / 0.004), 0, 0.04]);

/** Glockenspiel bar: the free-bar partials, soft mallet. */
const glock = (f, sec = 2.2) =>
  mix(len(sec), [partials(sec, f, [[1, 1, 1.3], [2.756, 0.3, 0.42], [5.404, 0.09, 0.17], [8.933, 0.035, 0.07]], 0.001)], [shape(biquad(noise(len(0.006), 5), "lp", 1800), (t) => 1 - t / 0.006), 0, 0.12]);

/** Celesta-like bell for the chime. */
const bell = (f, sec = 3) => partials(sec, f, [[1, 1, 1.1], [2, 0.28, 0.6], [3, 0.1, 0.35], [4.2, 0.04, 0.2]], 0.004);

const PENTA = ["B", "C#", "D#", "F#", "G#"];
const penta = (from, count) => {
  const out = [];
  let oct = from.oct;
  let i = PENTA.indexOf(from.note);
  for (let k = 0; k < count; k++) {
    out.push(`${PENTA[i]}${oct}`);
    i++;
    if (i === PENTA.length) i = 0;
    if (PENTA[i] === "C#" && i === 1) oct++;
  }
  return out;
};

function buildSfx() {
  // Glockenspiel notes: one per bulb (06), the tags (08), the reveal runs (07).
  const bulbNotes = penta({ note: "F#", oct: 5 }, 12);
  bulbNotes.forEach((n) => save(`glock-${n.replace("#", "s")}`, room(glock(hz(n)), { wet: 0.16 }), -4));
  for (const n of ["B5", "D#6", "F#6", "B6", "G#6", "C#7"]) save(`glock-${n.replace("#", "s")}`, room(glock(hz(n)), { wet: 0.16 }), -4);

  // 01: glass tinks running up with the bulb sweep (16 frames).
  {
    const notes = penta({ note: "B", oct: 5 }, 11);
    const parts = notes.map((n, i) => [tink(hz(n), 0.9), (i * 0.53) / notes.length, 0.55 + 0.45 * (i / notes.length)]);
    save("bulbs-run", room(mix(len(1.6), ...parts), { wet: 0.2 }), -4);
  }
  // 05: the name is written: a soft chime (B, D#, F# arpeggio) and a sparkle of tinks.
  save("chime", room(mix(len(3.2), [bell(hz("B5")), 0, 0.8], [bell(hz("D#6")), 0.07, 0.62], [bell(hz("F#6")), 0.14, 0.5]), { wet: 0.25, tail: 1.2 }), -4);
  save(
    "sparkle",
    room(mix(len(1.4), ...["F#6", "B6", "D#7", "F#7", "B7"].map((n, i) => [tink(hz(n), 0.8), [0, 0.05, 0.11, 0.18, 0.26][i], 0.75 - i * 0.1])), { wet: 0.25 }),
    -5,
  );
  // 07: bulbs sweep at the finale: a rising glockenspiel glissando.
  {
    const notes = penta({ note: "B", oct: 5 }, 11);
    save("glock-gliss", room(mix(len(2.4), ...notes.map((n, i) => [glock(hz(n), 1.6), i * 0.075, 0.5 + 0.5 * (i / notes.length)])), { wet: 0.2 }), -4);
  }

  // --- Paper ---
  // The hero unfold (05), on the app's timeline: lift 0-0.22 s, fold one
  // 0.16-0.64 s, fold two 0.58-1.06 s, lies flat at 1.06 s. Gentle swells,
  // no crackle.
  {
    const sec = 1.6;
    const n = len(sec);
    const tex = smoothNoise(n, 41, 28);
    const grain = (t) => 1 + 0.16 * tex[Math.min(n - 1, Math.round(t * SR))] * 6;
    const fold = (t0, f0, f1, seed, amp) => {
      const src = pink(n, seed);
      const band = biquad(src, "bp", (i) => f0 * Math.pow(f1 / f0, Math.min(1, Math.max(0, (i / SR - t0) / 0.5))), 0.8);
      const body = biquad(pink(n, seed + 7), "lp", 420, 0.7);
      const env = (t) => bump(t, t0, 0.22, 0.3) * grain(t);
      return mix(n, [shape(band, env), 0, amp], [shape(body, env), 0, amp * 0.35]);
    };
    const lift = shape(biquad(pink(n, 3), "bp", 1300, 0.7), (t) => bump(t, 0, 0.08, 0.17));
    const air = shape(biquad(noise(n, 9), "hp", 4200, 0.7), (t) => (bump(t, 0.16, 0.22, 0.3) + bump(t, 0.58, 0.22, 0.32)) * 0.5);
    const settle = shape(biquad(noise(n, 13), "lp", 340, 0.8), (t) => pluck(t, 1.06, 0.004, 0.035));
    const unfold = mix(n, [lift, 0, 0.22], [fold(0.16, 900, 1700, 21, 0.85)], [fold(0.58, 1000, 1900, 31, 0.78)], [air, 0, 0.05], [settle, 0, 0.55]);
    save("paper-unfold", room(unfold, { wet: 0.12, tail: 0.5 }), -3);
  }
  // Paper flutters (02): flapping on the way down; four variants.
  [
    [2200, 14, 0.36],
    [1700, 11, 0.42],
    [2700, 16, 0.3],
    [1900, 13, 0.38],
  ].forEach(([f, rate, sec], v) => {
    const n = len(sec);
    const band = biquad(noise(n, 50 + v), "bp", f, 1.1);
    const phase = rng(70 + v)() * 6;
    save(`paper-flutter-${v + 1}`, room(shape(band, (t) => bump(t, 0, 0.05, sec - 0.06) * (0.55 + 0.45 * Math.sin(2 * Math.PI * rate * t + phase))), { wet: 0.1 }), -4);
  });
  // Paper sweep (02 clean-up): everything falls off.
  {
    const n = len(0.62);
    const band = biquad(pink(n, 81), "bp", (i) => 600 * Math.pow(4, i / n), 0.7);
    const low = biquad(pink(n, 82), "lp", 320);
    save("paper-sweep", room(mix(n, [shape(band, (t) => bump(t, 0, 0.12, 0.48))], [shape(low, (t) => bump(t, 0, 0.12, 0.45)), 0, 0.25]), { wet: 0.12 }), -4);
  }
  // Paper air (tilts, pans): a sheet moving through air. Barely there.
  {
    const n = len(0.55);
    const x = biquad(pink(n, 91), "lp", (i) => 380 + 1100 * bump(i / SR, 0, 0.22, 0.33), 0.7);
    save("paper-air", shape(x, (t) => bump(t, 0, 0.22, 0.33)), -6);
  }
  // Air pull into the phone (04 to 05): rising.
  {
    const n = len(0.5);
    const x = biquad(pink(n, 95), "bp", (i) => 300 * Math.pow(6, i / n), 0.6);
    save("air-pull", shape(x, (t) => bump(t, 0, 0.42, 0.08)), -6);
  }
  // Paper tok (bubble lifts and lands): a soft thup.
  {
    const n = len(0.12);
    const thud = shape(biquad(noise(n, 101), "lp", 950), (t) => pluck(t, 0, 0.002, 0.012));
    const sine = partials(0.12, 160, [[1, 1, 0.03]], 0.002);
    save("paper-tok", mix(n, [thud, 0, 1], [sine, 0, 0.55]), -4);
  }
  // Paper flip (07): a quick swish.
  {
    const n = len(0.2);
    const sw = shape(biquad(noise(n, 111), "bp", 2400, 0.9), (t) => bump(t, 0, 0.04, 0.11));
    const tick = shape(biquad(noise(n, 112), "hp", 2500), (t) => pluck(t, 0.1, 0.0005, 0.003));
    save("paper-flip", mix(n, [sw, 0, 1], [tick, 0, 0.25]), -4);
  }
  // Paper slide (05 to 06 wipe).
  {
    const n = len(0.55);
    const x = biquad(biquad(pink(n, 121), "lp", 2100), "bp", (i) => 800 * Math.pow(2, i / n), 0.6);
    save("paper-slide", room(shape(x, (t) => bump(t, 0, 0.2, 0.33)), { wet: 0.1 }), -4);
  }
  // Fringe rustle (07 to 08): many small strips, then the sheet lands.
  {
    const n = len(0.75);
    const tex = smoothNoise(n, 131, 22);
    const strips = biquad(noise(n, 132), "bp", 3000, 0.8);
    const land = biquad(noise(n, 133), "lp", 300);
    save(
      "fringe-rustle",
      room(mix(n, [shape(strips, (t) => bump(t, 0, 0.32, 0.4) * (0.6 + 4 * Math.abs(tex[Math.min(n - 1, Math.round(t * SR))])))], [shape(land, (t) => pluck(t, 0.46, 0.003, 0.03)), 0, 0.5]), { wet: 0.12 }),
      -4,
    );
  }
  // Paper flick (08 tags catch on the wire).
  {
    const n = len(0.12);
    const tap = shape(biquad(noise(n, 141), "lp", 1800), (t) => pluck(t, 0, 0.001, 0.008));
    const snap = shape(biquad(noise(n, 142), "bp", 3500, 1), (t) => pluck(t, 0, 0.001, 0.02));
    save("paper-flick", mix(n, [tap, 0, 1], [snap, 0, 0.3]), -4);
  }
  // The join drop (04): the slip folds, then lands in the glass bowl.
  {
    const n = len(0.36);
    const x = biquad(pink(n, 151), "bp", (i) => 1100 + 700 * (i / n), 0.8);
    save("slip-fold", shape(x, (t) => bump(t, 0, 0.12, 0.22)), -5);
    const m = len(1.0);
    const thud = shape(biquad(noise(m, 152), "lp", 900), (t) => pluck(t, 0, 0.002, 0.014));
    save("slip-in-glass", room(mix(m, [thud, 0, 1], [tink(hz("B6"), 0.9), 0.006, 0.35], [tink(hz("F#7"), 0.7), 0.05, 0.18]), { wet: 0.18 }), -4);
  }

  // --- Taps and clicks ---
  // Laptop keys: press click and bottom-out thud, six variants.
  for (let v = 0; v < 6; v++) {
    const r = rng(200 + v);
    const n = len(0.07);
    const press = shape(biquad(noise(n, 210 + v), "bp", 2800 + r() * 900, 2), (t) => pluck(t, 0, 0.0005, 0.004));
    const bottom = shape(biquad(noise(n, 220 + v), "lp", 800 + r() * 300), (t) => pluck(t, 0.011 + r() * 0.004, 0.001, 0.009));
    const res = shape(biquad(noise(n, 230 + v), "bp", 1700 + r() * 400, 6), (t) => pluck(t, 0.011, 0.001, 0.012));
    save(`key-${v + 1}`, mix(n, [press, 0, 0.5], [bottom, 0, 0.9], [res, 0, 0.35]), -5);
  }
  // Trackpad click.
  {
    const n = len(0.06);
    const a = shape(biquad(noise(n, 241), "hp", 1500), (t) => pluck(t, 0, 0.0003, 0.002));
    const b = shape(biquad(noise(n, 242), "bp", 2300, 8), (t) => pluck(t, 0, 0.0005, 0.012));
    const c = partials(0.06, 140, [[1, 1, 0.008]], 0.001);
    save("trackpad-click", mix(n, [a, 0, 0.6], [b, 0, 0.5], [c, 0, 0.4]), -4);
  }
  // Phone taps (glass), three variants for typing on the phone.
  for (let v = 0; v < 3; v++) {
    const n = len(0.06);
    const a = shape(biquad(noise(n, 251 + v), "lp", 2500 + v * 300), (t) => pluck(t, 0, 0.0003, 0.003));
    const b = shape(biquad(noise(n, 261 + v), "bp", 260 + v * 30, 4), (t) => pluck(t, 0, 0.001, 0.02));
    save(`phone-tap-${v + 1}`, mix(n, [a, 0, 0.6], [b, 0, 0.5]), -5);
  }
  // PIN taps: soft wooden taps rising (B4 C#5 D#5 F#5); also used for the chat pops.
  ["B4", "C#5", "D#5", "F#5", "G#5", "B5", "C#6"].forEach((note, i) => {
    const f = hz(note);
    const n = len(0.16);
    const exc = shape(noise(n, 271 + i), (t) => pluck(t, 0, 0.0004, 0.0018));
    const body = mix(n, [biquad(exc, "bp", f, 24), 0, 1], [biquad(exc, "bp", f * 2.76, 18), 0, 0.35]);
    save(`wood-${note.replace("#", "s")}`, room(shape(body, (t) => Math.exp(-t / 0.05)), { wet: 0.1 }), -4);
  });
  // Clothespin click (09): two quick wooden clicks.
  {
    const n = len(0.12);
    const click = (at, seed) => {
      const exc = shape(noise(n, seed), (t) => pluck(t, at, 0.0004, 0.001));
      return mix(n, [biquad(exc, "bp", 1400, 10), 0, 1], [biquad(exc, "bp", 2900, 12), 0, 0.6]);
    };
    save("clothespin-click", room(mix(n, [click(0, 281)], [click(0.014, 282), 0, 0.7]), { wet: 0.1 }), -4);
  }
  // Light switch (06 lights down): a small plastic toggle, two clicks.
  {
    const n = len(0.08);
    const snap = (at, seed, g) => {
      const exc = shape(noise(n, seed), (t) => pluck(t, at, 0.0003, 0.0015));
      return mix(n, [biquad(exc, "bp", 3400, 3), 0, g], [biquad(exc, "bp", 850, 4), 0, g * 0.7]);
    };
    save("switch-click", room(mix(n, [snap(0, 311, 1)], [snap(0.007, 312, 0.45)]), { wet: 0.08 }), -4);
  }
  // TV comes on (07): a soft low thump.
  {
    const sec = 0.5;
    const n = len(sec);
    const out = zeros(n);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      ph += (2 * Math.PI * (45 + 25 * Math.exp(-t / 0.08))) / SR;
      out[i] = Math.sin(ph) * pluck(t, 0, 0.004, 0.12);
    }
    const rumble = shape(biquad(noise(n, 291), "lp", 200), (t) => pluck(t, 0, 0.002, 0.04));
    save("tv-thump", mix(n, [out, 0, 1], [rumble, 0, 0.4]), -4);
  }
  // Crickets (01 and 09): kuliglig at night, three of them.
  {
    const sec = 7;
    const n = len(sec);
    const out = zeros(n);
    const cricket = (f, period, pulses, amp, seed, start) => {
      const r = rng(seed);
      let t0 = start;
      while (t0 < sec - 0.3) {
        for (let p = 0; p < pulses; p++) {
          const pt = t0 + p * 0.032;
          const a = len(pt);
          const pl = len(0.015);
          for (let i = 0; i < pl && a + i < n; i++) {
            const t = i / SR;
            const env = Math.sin((Math.PI * i) / pl);
            out[a + i] += amp * env * Math.sin(2 * Math.PI * (f + 25 * Math.sin(2 * Math.PI * 30 * t)) * (pt + t));
          }
        }
        t0 += period * (0.92 + 0.16 * r());
      }
    };
    cricket(4400, 0.62, 3, 1, 301, 0.1);
    cricket(4750, 0.71, 4, 0.6, 302, 0.35);
    cricket(3900, 0.9, 3, 0.3, 303, 0.55);
    save("crickets", room(biquad(out, "lp", 7000), { wet: 0.3, tail: 0.6 }), -6);
  }
  copyFileSync(join(VIDEO, "assets", "sfx", "crowd-cheer.mp3"), join(OUT, "crowd-cheer.mp3"));
}

const t0 = Date.now();
buildMusic();
buildSfx();
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
