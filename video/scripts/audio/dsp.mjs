/**
 * Tiny DSP kit for the sound effects: seeded noise, RBJ biquads, envelopes,
 * a small room (Freeverb-style), WAV writing and ffmpeg decoding.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const SR = 48000;
const HERE = dirname(fileURLToPath(import.meta.url));
export const VIDEO = join(HERE, "..", "..");
export const FFMPEG = join(VIDEO, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe");

export const len = (sec) => Math.round(sec * SR);
export const zeros = (n) => new Float32Array(n);

/** Seeded PRNG (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function noise(n, seed = 1) {
  const r = rng(seed);
  const out = zeros(n);
  for (let i = 0; i < n; i++) out[i] = r() * 2 - 1;
  return out;
}

/** Pink-ish noise (Paul Kellet's economy filter). */
export function pink(n, seed = 2) {
  const w = noise(n, seed);
  const out = zeros(n);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < n; i++) {
    b0 = 0.99765 * b0 + w[i] * 0.099046;
    b1 = 0.963 * b1 + w[i] * 0.2965164;
    b2 = 0.57 * b2 + w[i] * 1.0526913;
    out[i] = (b0 + b1 + b2 + w[i] * 0.1848) * 0.2;
  }
  return out;
}

function coeffs(type, f, q, gainDb = 0) {
  const w0 = (2 * Math.PI * Math.min(f, SR * 0.45)) / SR;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * q);
  const A = Math.pow(10, gainDb / 40);
  let b0, b1, b2, a0, a1, a2;
  switch (type) {
    case "lp": b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = b0; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha; break;
    case "hp": b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = b0; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha; break;
    case "bp": b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha; break;
    case "peak": b0 = 1 + alpha * A; b1 = -2 * cos; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cos; a2 = 1 - alpha / A; break;
    default: throw new Error(type);
  }
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}

/** Biquad with a cutoff that may change over time: `f` is a number or (i) => Hz. */
export function biquad(x, type, f, q = 0.707, gainDb = 0) {
  const out = zeros(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  let c = coeffs(type, typeof f === "function" ? f(0) : f, q, gainDb);
  for (let i = 0; i < x.length; i++) {
    if (typeof f === "function" && i % 32 === 0) c = coeffs(type, f(i), q, gainDb);
    const y = c[0] * x[i] + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = y;
    out[i] = y;
  }
  return out;
}

/** Multiplies by an envelope function of time in seconds. */
export function shape(x, env) {
  const out = zeros(x.length);
  for (let i = 0; i < x.length; i++) out[i] = x[i] * env(i / SR);
  return out;
}

/** Smooth bump: rises over `a` s from t0, falls over `d` s. Raised cosine. */
export const bump = (t, t0, a, d) => {
  if (t < t0 || t > t0 + a + d) return 0;
  if (t < t0 + a) return 0.5 - 0.5 * Math.cos((Math.PI * (t - t0)) / a);
  return 0.5 + 0.5 * Math.cos((Math.PI * (t - t0 - a)) / d);
};
/** Fast attack, exponential decay (time constant tau). */
export const pluck = (t, t0, attack, tau) => (t < t0 ? 0 : t < t0 + attack ? (t - t0) / attack : Math.exp(-(t - t0 - attack) / tau));

export function mix(n, ...parts) {
  const out = zeros(n);
  for (const [x, at = 0, gain = 1] of parts) {
    const o = Math.round(at * SR);
    for (let i = 0; i < x.length && i + o < n; i++) if (i + o >= 0) out[i + o] += x[i] * gain;
  }
  return out;
}

/** Sum of decaying sine partials: [[ratio, amp, tau], ...], with a short attack. */
export function partials(sec, f0, list, attack = 0.002, detune = 0) {
  const n = len(sec);
  const out = zeros(n);
  for (const [ratio, amp, tau] of list) {
    for (const d of detune ? [-detune, detune] : [0]) {
      const w = (2 * Math.PI * f0 * ratio * (1 + d)) / SR;
      const a = detune ? amp / 2 : amp;
      for (let i = 0; i < n; i++) {
        const t = i / SR;
        out[i] += a * Math.sin(w * i) * (t < attack ? t / attack : Math.exp(-(t - attack) / tau));
      }
    }
  }
  return out;
}

/** A small room (Freeverb-style combs and allpasses), mono. */
export function room(x, { wet = 0.18, size = 0.72, damp = 0.45, tail = 0.8 } = {}) {
  const n = x.length + len(tail);
  const input = zeros(n);
  input.set(x);
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((d) => Math.round((d * SR) / 44100));
  const alls = [556, 441, 341, 225].map((d) => Math.round((d * SR) / 44100));
  const wetBuf = zeros(n);
  for (const d of combs) {
    const buf = zeros(d);
    let idx = 0, store = 0;
    for (let i = 0; i < n; i++) {
      const y = buf[idx];
      store = y * (1 - damp) + store * damp;
      buf[idx] = input[i] * 0.015 + store * size;
      idx = (idx + 1) % d;
      wetBuf[i] += y;
    }
  }
  for (const d of alls) {
    const buf = zeros(d);
    let idx = 0;
    for (let i = 0; i < n; i++) {
      const b = buf[idx];
      const y = -wetBuf[i] + b;
      buf[idx] = wetBuf[i] + b * 0.5;
      idx = (idx + 1) % d;
      wetBuf[i] = y;
    }
  }
  const out = zeros(n);
  for (let i = 0; i < n; i++) out[i] = input[i] * (1 - wet * 0.5) + wetBuf[i] * wet;
  return out;
}

export function normalize(x, peakDb = -3) {
  let p = 0;
  for (const v of x) p = Math.max(p, Math.abs(v));
  const g = p > 0 ? Math.pow(10, peakDb / 20) / p : 1;
  const out = zeros(x.length);
  for (let i = 0; i < x.length; i++) out[i] = x[i] * g;
  return out;
}

/** Trims trailing near-silence and adds a 5 ms fade at both ends. */
export function tidy(x, floorDb = -70) {
  const floor = Math.pow(10, floorDb / 20);
  let end = x.length;
  while (end > 1 && Math.abs(x[end - 1]) < floor) end--;
  const out = x.slice(0, Math.min(x.length, end + len(0.01)));
  const f = len(0.005);
  for (let i = 0; i < f && i < out.length; i++) {
    out[i] *= i / f;
    out[out.length - 1 - i] *= i / f;
  }
  return out;
}

export function writeWav(path, channels) {
  const nCh = channels.length;
  const n = channels[0].length;
  const buf = Buffer.alloc(44 + n * nCh * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * nCh * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(nCh, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * nCh * 2, 28);
  buf.writeUInt16LE(nCh * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * nCh * 2, 40);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < nCh; c++) {
      const v = Math.max(-1, Math.min(1, channels[c][i]));
      buf.writeInt16LE(Math.round(v * 32767), o);
      o += 2;
    }
  }
  writeFileSync(path, buf);
}

/** Decodes any audio file to stereo float arrays at SR. */
export function decode(file) {
  // Remotion's ffmpeg has no raw muxer and no float PCM: decode to a 16-bit WAV on the pipe.
  const r = spawnSync(FFMPEG, ["-v", "error", "-i", file, "-f", "wav", "-c:a", "pcm_s16le", "-ac", "2", "-ar", String(SR), "-"], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`ffmpeg: ${r.stderr}`);
  const wav = r.stdout;
  let off = 12;
  while (off < wav.length - 8 && wav.toString("ascii", off, off + 4) !== "data") off += 8 + wav.readUInt32LE(off + 4);
  const start = off + 8;
  const n = Math.floor((wav.length - start) / 4);
  const L = zeros(n);
  const R = zeros(n);
  for (let i = 0; i < n; i++) {
    L[i] = wav.readInt16LE(start + 4 * i) / 32768;
    R[i] = wav.readInt16LE(start + 4 * i + 2) / 32768;
  }
  return [L, R];
}

/** Note name (e.g. "F#6") to Hz. */
export function hz(note) {
  const m = /^([A-G])(#?)(\d)$/.exec(note);
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0);
  const midi = 12 * (Number(m[3]) + 1) + base;
  return 440 * Math.pow(2, (midi - 69) / 12);
}
