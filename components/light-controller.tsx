"use client";

import { useEffect, useState } from "react";

/**
 * The light string's controller (docs/DESIGN.md, "Light string"), on the
 * landing and /me: like the button box on a real string of Christmas
 * lights. Every 8 seconds the string moves to the next mode; a tap moves
 * on at once. The modes themselves are CSS (`[data-mode]` in globals.css):
 * this only switches an attribute, never runs per frame. Under reduced
 * motion there are no modes: the string stays steady and lit, and is plain
 * decoration instead of a button.
 *
 * While the page is hidden the string is steady and lit (`data-paused`
 * turns the animations off) and the cycle waits. Phones don't always say
 * when a page is visible again (back from the back/forward cache, app
 * switches in in-app browsers), so the visibility is read again on every
 * event that can mean "back" and once a second while hidden: a missed event
 * can never leave the string dark or stuck.
 *
 * The string's SVG comes in as children, rendered on the server, so this
 * adds only a few hundred bytes of JS.
 */
const MODES = ["steady", "alternate", "chase", "fade", "twinkle"] as const;
const MODE_MS = 8000;
const HIDDEN_RECHECK_MS = 1000;
const BACK_EVENTS = ["visibilitychange", "pageshow", "focus", "resume", "pagehide", "freeze"] as const;

const isHidden = () => document.visibilityState === "hidden";

export function LightController({ className, children }: { className: string; children: React.ReactNode }) {
  const [mode, setMode] = useState(0);
  const [still, setStill] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setStill(reduce.matches);
    const syncVisible = () => setHidden(isHidden());
    syncMotion();
    syncVisible();
    reduce.addEventListener("change", syncMotion);
    BACK_EVENTS.forEach((e) => window.addEventListener(e, syncVisible, true));
    return () => {
      reduce.removeEventListener("change", syncMotion);
      BACK_EVENTS.forEach((e) => window.removeEventListener(e, syncVisible, true));
    };
  }, []);

  // Visible: a fresh 8 seconds after every change (tap, timer, coming
  // back), then the next mode, unless the page turned out to be hidden.
  // Hidden: look again every second, in case no event says it's back.
  useEffect(() => {
    if (still) return;
    if (hidden) {
      const id = setInterval(() => {
        if (!isHidden()) setHidden(false);
      }, HIDDEN_RECHECK_MS);
      return () => clearInterval(id);
    }
    const id = setTimeout(() => (isHidden() ? setHidden(true) : setMode((m) => (m + 1) % MODES.length)), MODE_MS);
    return () => clearTimeout(id);
  }, [mode, still, hidden]);

  if (still) {
    return (
      <div aria-hidden data-light-string data-mode="steady" className={className}>
        {children}
      </div>
    );
  }
  return (
    <button
      type="button"
      aria-label="Palitan ang ilaw"
      data-light-string
      data-mode={MODES[mode]}
      data-paused={hidden || undefined}
      onClick={() => {
        setHidden(isHidden());
        setMode((m) => (m + 1) % MODES.length);
      }}
      className={className}
    >
      {children}
    </button>
  );
}
