"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

/**
 * Buttons on the dark reveal screen: margarine fill with dark ube text
 * (9.8:1), and a light outline for the quieter ones. On a projector
 * (landscape) they size with the window so they read from the back of
 * the room; on a phone they're normal tap targets.
 */
export const GOLD_BUTTON =
  "bg-margarine text-ube-night disabled:bg-gabi-leaf disabled:text-gabi-mist landscape:h-[clamp(48px,6vh,68px)] landscape:px-[clamp(20px,2.4vh,34px)] landscape:text-[clamp(17px,2.5vh,28px)]";
export const NIGHT_BUTTON =
  "h-[58px] border-[1.5px] border-gabi-mist bg-transparent text-gabi-mist disabled:border-gabi-leaf disabled:bg-transparent disabled:text-gabi-line landscape:h-[clamp(48px,6vh,68px)] landscape:px-[clamp(20px,2.4vh,34px)] landscape:text-[clamp(17px,2.5vh,28px)]";
export const ICON_BUTTON =
  "h-12 gap-2 rounded-full px-4 font-bold text-gabi-mist hover:bg-gabi-leaf landscape:h-[clamp(44px,5.4vh,64px)] landscape:text-[clamp(16px,2.4vh,28px)]";

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
