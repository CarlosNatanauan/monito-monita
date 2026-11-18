"""Tempo, beat grid, downbeats, key and per-bar energy of the music track.

numpy and matplotlib only. Decode the mp3 to WAV first (Remotion bundles ffmpeg):
  npx remotion ffmpeg -i assets/music/<track>.mp3 -ac 2 -ar 48000 .rec/audio/music-full.wav
  python scripts/audio/analyze-music.py .rec/audio/music-full.wav .rec/audio/music-analysis.json .rec/audio/music.png
"""
import json
import sys
import wave

import numpy as np

wav_path, out_json, out_png = sys.argv[1], sys.argv[2], sys.argv[3]

with wave.open(wav_path, "rb") as w:
    sr = w.getframerate()
    n = w.getnframes()
    ch = w.getnchannels()
    raw = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768.0
x = raw.reshape(-1, ch).mean(axis=1)
dur = len(x) / sr
print(f"sr={sr} duration={dur:.3f}s")

# --- STFT -------------------------------------------------------------------
HOP = 480  # 10 ms at 48 kHz
NFFT = 4096
win = np.hanning(NFFT).astype(np.float32)
pad = np.concatenate([np.zeros(NFFT // 2, np.float32), x, np.zeros(NFFT // 2, np.float32)])
nfr = 1 + (len(pad) - NFFT) // HOP
idx = np.arange(NFFT)[None, :] + HOP * np.arange(nfr)[:, None]
frames = pad[idx] * win
spec = np.abs(np.fft.rfft(frames, axis=1)).astype(np.float32)
freqs = np.fft.rfftfreq(NFFT, 1 / sr)
fps = sr / HOP
times = np.arange(nfr) / fps

# Log-frequency bands for onset strength
edges = np.geomspace(40, 12000, 41)
band_idx = np.digitize(freqs, edges) - 1
bands = np.zeros((nfr, 40), np.float32)
for b in range(40):
    m = band_idx == b
    if m.any():
        bands[:, b] = spec[:, m].sum(axis=1)
logb = np.log1p(100 * bands)
flux = np.maximum(0, np.diff(logb, axis=0, prepend=logb[:1])).sum(axis=1)
# low-band flux (bass / thumb strums)
low = np.maximum(0, np.diff(logb[:, :10], axis=0, prepend=logb[:1, :10])).sum(axis=1)


def smooth(v, k):
    ker = np.hanning(k)
    ker /= ker.sum()
    return np.convolve(v, ker, mode="same")


onset = flux - smooth(flux, 101)
onset = np.maximum(0, onset)
onset /= onset.max() + 1e-9

# --- Tempo by autocorrelation -------------------------------------------------
o = onset - onset.mean()
ac = np.correlate(o, o, mode="full")[len(o) - 1 :]
ac /= ac[0]
bpm_range = np.arange(60, 200.01, 0.05)
lags = 60 * fps / bpm_range
acv = np.interp(lags, np.arange(len(ac)), ac)
cands = sorted(zip(acv, bpm_range), reverse=True)
seen = []
for v, b in cands:
    if all(abs(b - s) > 3 for _, s in seen):
        seen.append((v, b))
    if len(seen) >= 6:
        break
print("autocorr tempo candidates:", [(round(b, 2), round(float(v), 3)) for v, b in seen])

# --- Fine grid fit: maximize comb sum over (period, phase) ----------------------
def comb_score(period_s, phase_s, env, start=0.0, end=None):
    end = end if end is not None else dur
    ts = np.arange(phase_s, end, period_s)
    ts = ts[ts >= start]
    fi = np.round(ts * fps).astype(int)
    fi = fi[(fi >= 0) & (fi < len(env))]
    # take the max in a +/- 2 frame window (20 ms)
    vals = np.max(np.stack([env[np.clip(fi + d, 0, len(env) - 1)] for d in range(-2, 3)]), axis=0)
    return vals.mean()


best = None
for _, b0 in seen[:4]:
    for bpm in np.arange(b0 - 1.5, b0 + 1.5, 0.01):
        period = 60 / bpm
        for ph in np.arange(0, period, 0.005):
            s = comb_score(period, ph, onset)
            if best is None or s > best[0]:
                best = (s, bpm, ph)
score, bpm, phase = best
period = 60 / bpm
print(f"grid fit: bpm={bpm:.3f} period={period:.5f}s phase={phase:.4f}s score={score:.3f}")

# Check half/double-time alternatives
for mult in (0.5, 2.0, 2 / 3, 1.5):
    b2 = bpm * mult
    p2 = 60 / b2
    s2 = max(comb_score(p2, ph, onset) for ph in np.arange(0, p2, 0.005))
    print(f"  alt bpm {b2:.2f}: score {s2:.3f}")

# Refine with local peaks: find onset peak nearest each predicted beat, fit a line
beat_t = np.arange(phase, dur, period)
peaks = []
for t in beat_t:
    i0 = int(round(t * fps))
    lo, hi = max(0, i0 - 6), min(len(onset), i0 + 7)
    j = lo + int(np.argmax(onset[lo:hi]))
    if onset[j] > 0.15:
        peaks.append((t, j / fps))
peaks = np.array(peaks)
k = np.round((peaks[:, 0] - phase) / period)
A = np.stack([k, np.ones_like(k)], axis=1)
sol, *_ = np.linalg.lstsq(A, peaks[:, 1], rcond=None)
period_ref, phase_ref = float(sol[0]), float(sol[1])
resid = peaks[:, 1] - (k * period_ref + phase_ref)
print(f"refined: bpm={60/period_ref:.4f} period={period_ref:.5f} phase={phase_ref:.4f} "
      f"resid ms mean={np.mean(np.abs(resid))*1000:.1f} max={np.max(np.abs(resid))*1000:.1f} n={len(peaks)}")

# Drift check: fit separately on first and second half
half = len(peaks) // 2
for name, sl in (("first half", slice(0, half)), ("second half", slice(half, None))):
    kk = k[sl]
    s, *_ = np.linalg.lstsq(np.stack([kk, np.ones_like(kk)], 1), peaks[sl, 1], rcond=None)
    print(f"  {name}: bpm={60/s[0]:.4f} phase@k0={s[1]:.4f}")

period, phase = period_ref, phase_ref
while phase - period >= -0.02:
    phase -= period
beats = np.arange(phase, dur, period)

# --- Chroma per beat -------------------------------------------------------------
pitch_mask = (freqs > 55) & (freqs < 4200)
midi = 69 + 12 * np.log2(np.maximum(freqs, 1e-6) / 440.0)
pc = (np.round(midi).astype(int) % 12)
chroma = np.zeros((nfr, 12), np.float32)
for c in range(12):
    m = pitch_mask & (pc == c)
    chroma[:, c] = (spec[:, m] ** 2).sum(axis=1)
chroma = np.sqrt(chroma)


def seg_mean(arr, t0, t1):
    a, b = int(t0 * fps), max(int(t0 * fps) + 1, int(t1 * fps))
    return arr[a:b].mean(axis=0)


beat_chroma = np.array([seg_mean(chroma, t, t + period) for t in beats])
beat_chroma_n = beat_chroma / (np.linalg.norm(beat_chroma, axis=1, keepdims=True) + 1e-9)
harm_change = np.r_[0, 1 - np.sum(beat_chroma_n[1:] * beat_chroma_n[:-1], axis=1)]
beat_low = np.array([low[int(t * fps): int(t * fps) + 4].max() if int(t * fps) + 4 < len(low) else 0 for t in beats])
beat_low /= beat_low.max() + 1e-9
beat_rms = np.array([np.sqrt(np.mean(x[int(t * sr): int((t + period) * sr)] ** 2) + 1e-12) for t in beats])

# Downbeat phase: which beat index mod 4 has most harmonic change + bass
scores = []
for m4 in range(4):
    sel = np.arange(m4, len(beats), 4)
    scores.append((harm_change[sel].mean(), beat_low[sel].mean()))
print("downbeat phase scores (harm change, low onset) for beat%4 =", [tuple(round(float(v), 3) for v in s) for s in scores])
combo = [s[0] / max(1e-9, max(t[0] for t in scores)) + 0.5 * s[1] / max(1e-9, max(t[1] for t in scores)) for s in scores]
down = int(np.argmax(combo))
print("chosen downbeat offset:", down, "combo", [round(c, 3) for c in combo])

# --- Key (Krumhansl-Schmuckler) ---------------------------------------------------
maj = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
minr = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
tot = chroma[(times > 1) & (times < dur - 1)].sum(axis=0)
tot = tot / tot.sum()
res = []
for r in range(12):
    res.append((np.corrcoef(tot, np.roll(maj, r))[0, 1], names[r] + " major"))
    res.append((np.corrcoef(tot, np.roll(minr, r))[0, 1], names[r] + " minor"))
res.sort(reverse=True)
print("key candidates:", [(n, round(float(v), 3)) for v, n in res[:4]])
print("chroma profile:", {names[i]: round(float(tot[i]), 3) for i in range(12)})

# --- Bars -------------------------------------------------------------------------
bar_starts = beats[down::4]
bars = []
for i, t in enumerate(bar_starts):
    t1 = t + 4 * period
    a, b = int(t * sr), min(len(x), int(t1 * sr))
    rms = float(np.sqrt(np.mean(x[a:b] ** 2) + 1e-12)) if b > a else 0.0
    ch = seg_mean(chroma, t, min(t1, dur - 0.01))
    chn = ch / (np.linalg.norm(ch) + 1e-9)
    hi = seg_mean(bands[:, 30:], t, min(t1, dur - 0.01)).sum()
    lo_ = seg_mean(bands[:, :8], t, min(t1, dur - 0.01)).sum()
    bars.append({"i": i, "t": round(float(t), 4), "rms_db": round(20 * np.log10(rms + 1e-9), 2),
                 "chroma": [round(float(v), 3) for v in chn], "hi": float(hi), "lo": float(lo_)})

print("\nbar  time    rms_db  top-chroma")
for bdat in bars:
    top = np.argsort(bdat["chroma"])[::-1][:3]
    print(f"{bdat['i']:3d} {bdat['t']:7.3f} {bdat['rms_db']:7.2f}  {' '.join(names[j] for j in top)}")

# Tail: when does the sound decay
env_db = 20 * np.log10(np.sqrt(smooth(x ** 2, int(0.05 * sr))[:: HOP] + 1e-12) + 1e-12)
tail = [(round(float(t), 2), round(float(v), 1)) for t, v in zip(times[::50], env_db[::50]) if t > dur - 14]
print("\ntail envelope (t, dB):", tail)

json.dump({
    "sr": sr, "duration": dur, "bpm": 60 / period, "period": period, "phase": float(phase),
    "downbeat_offset": down, "beats": [round(float(b), 4) for b in beats],
    "bars": bars, "key_candidates": [(n, float(v)) for v, n in res[:6]],
}, open(out_json, "w"), indent=1)

# --- Plot -------------------------------------------------------------------------
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

fig, axes = plt.subplots(3, 1, figsize=(26, 12))
axes[0].plot(times, env_db, lw=0.6)
for t in bar_starts:
    axes[0].axvline(t, color="r", lw=0.4)
axes[0].set_xlim(0, dur)
axes[0].set_ylim(-60, 0)
axes[0].set_title(f"envelope dB, bars at {60/period:.2f} BPM")
axes[1].plot(times, onset, lw=0.4)
for t in beats:
    axes[1].axvline(t, color="g", lw=0.2)
for t in bar_starts:
    axes[1].axvline(t, color="r", lw=0.6)
axes[1].set_xlim(0, 20)
axes[1].set_title("onset (first 20 s), beats green, bars red")
axes[2].imshow(np.array([b["chroma"] for b in bars]).T, aspect="auto", origin="lower", cmap="magma",
               extent=[0, len(bars), -0.5, 11.5])
axes[2].set_yticks(range(12))
axes[2].set_yticklabels(names)
axes[2].set_title("chroma per bar")
plt.tight_layout()
plt.savefig(out_png, dpi=60)
print("plot saved")
