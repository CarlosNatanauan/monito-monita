"use client";

import { useEffect, useState } from "react";

/** How long the projector screen waits, without the mouse, before hiding its controls. */
export const IDLE_MS = 3000;

/**
 * True once the pointer has been still for `ms` (no movement, no click or
 * tap). Keys don't count: Space and the arrows keep working while the
 * controls are hidden, and keyboard focus shows them on its own (CSS).
 */
export function useIdle(ms = IDLE_MS): boolean {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let timer = window.setTimeout(() => setIdle(true), ms);
    const wake = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), ms);
    };
    window.addEventListener("pointermove", wake, { passive: true });
    window.addEventListener("pointerdown", wake, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("pointerdown", wake);
    };
  }, [ms]);
  return idle;
}
