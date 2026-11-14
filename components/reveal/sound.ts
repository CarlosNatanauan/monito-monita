"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import type { Cue } from "./transition";

/**
 * Optional reveal sound, off by default: soft bell tones made with the Web
 * Audio API (no audio files). A rising note per bulb, a low one going
 * back, and a short chord for the parol. The choice is remembered on this
 * device only.
 */

const KEY = "mm-reveal-sound";
// A major pentatonic from A4: the bulbs climb it toward the receiver.
const BULB_NOTES = [440, 494, 554, 659, 740];

function readSaved(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

function save(on: boolean) {
  try {
    window.localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // Private mode or blocked storage: it just isn't remembered.
  }
}

// The choice as a tiny store: the server always renders "off".
const listeners = new Set<() => void>();
let current: boolean | null = null;
const snapshot = () => (current ??= readSaved());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};
function setSound(on: boolean) {
  current = on;
  save(on);
  for (const listener of listeners) listener();
}

function bell(ctx: AudioContext, freq: number, at: number, length = 0.9, gain = 0.12) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(gain, at + 0.015);
  env.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(env).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + length + 0.05);
}

export function useRevealSound() {
  const on = useSyncExternalStore(subscribe, snapshot, () => false);
  const ctxRef = useRef<AudioContext | null>(null);

  const ensure = useCallback(() => {
    if (!ctxRef.current) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      ctxRef.current = new Ctx();
    }
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const toggle = useCallback(() => {
    const next = !snapshot();
    setSound(next);
    // The tap itself unlocks audio in the browser.
    if (next) {
      const ctx = ensure();
      if (ctx) bell(ctx, BULB_NOTES[2], ctx.currentTime, 0.5, 0.08);
    }
  }, [ensure]);

  const play = useCallback(
    (cue: Cue) => {
      if (!on) return;
      const ctx = ensure();
      if (!ctx) return;
      const now = ctx.currentTime;
      if (cue.kind === "bulb") bell(ctx, BULB_NOTES[Math.min(cue.n, BULB_NOTES.length - 1)], now, 0.7);
      else if (cue.kind === "back") bell(ctx, 330, now, 0.6, 0.08);
      else if (cue.kind === "finale") [440, 554, 659, 880].forEach((f, i) => bell(ctx, f, now + i * 0.12, 1.6, 0.1));
      else if (cue.kind === "burst") bell(ctx, 1319, now, 1.2, 0.06);
    },
    [on, ensure],
  );

  useEffect(() => () => void ctxRef.current?.close(), []);

  return { on, toggle, play };
}
