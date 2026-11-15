"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

/**
 * Buttons on the dark reveal screen: the gold button (ilaw fill, gabi
 * text, 10.8:1) for the main step, a light outline for the quieter ones,
 * plain text buttons in the corners. On a projector (landscape) they size
 * with the window so they read from the back of the room; on a phone
 * they are normal tap targets. Hand-cut corners, never pills.
 */
export const GOLD_BUTTON =
  "h-[58px] landscape:h-[clamp(48px,6vh,68px)] landscape:px-[clamp(20px,2.4vh,34px)] landscape:text-[clamp(18px,2.6vh,30px)]";
export const NIGHT_BUTTON =
  "h-[58px] rounded-btn border-[1.5px] border-gabi-text bg-transparent text-gabi-text disabled:border-gabi-2 disabled:bg-transparent disabled:text-gabi-line landscape:h-[clamp(48px,6vh,68px)] landscape:px-[clamp(20px,2.4vh,34px)] landscape:text-[clamp(17px,2.5vh,28px)]";
export const ICON_BUTTON =
  "inline-flex h-12 cursor-pointer items-center gap-2 rounded-btn-sm px-3 font-bold text-gabi-text focus-ring landscape:h-[clamp(44px,5.4vh,64px)] landscape:text-[clamp(16px,2.4vh,28px)]";

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/**
 * Space and → for Next, ← for Previous. Space on a focused button presses
 * that button instead (the browser's own behaviour), so it never moves twice.
 */
export function useRevealKeys(next: () => void, previous: () => void) {
  const handlers = useRef({ next, previous });
  useEffect(() => {
    handlers.current = { next, previous };
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat || isTyping(event.target)) return;
      if (event.key === "ArrowRight" || (event.key === " " && !(event.target instanceof HTMLButtonElement))) {
        event.preventDefault();
        handlers.current.next();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        handlers.current.previous();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

const noop = () => () => {};
const onFullscreenChange = (listener: () => void) => {
  document.addEventListener("fullscreenchange", listener);
  return () => document.removeEventListener("fullscreenchange", listener);
};

/** Fullscreen for the whole page (projectors). Unsupported (iPhone): `supported` is false. */
export function useFullscreen() {
  const supported = useSyncExternalStore(noop, () => Boolean(document.fullscreenEnabled), () => false);
  const active = useSyncExternalStore(onFullscreenChange, () => document.fullscreenElement !== null, () => false);
  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void document.documentElement.requestFullscreen().catch(() => undefined);
  };
  return { supported, active, toggle };
}
