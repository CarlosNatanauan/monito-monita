"use client";

import { useEffect, useState } from "react";

/**
 * The light string's controller (docs/DESIGN.md, "Light string"), on the
 * landing and /me: like the button box on a real string of Christmas
 * lights. Every 8 seconds the string moves to the next mode; a tap moves
 * on at once. The modes themselves are CSS (`[data-mode]` in globals.css):
 * this only switches an attribute, never runs per frame, and stops while
 * the tab is hidden. Under reduced motion there are no modes: the string
 * stays steady and lit, and is plain decoration instead of a button.
 *
 * The string's SVG comes in as children, rendered on the server, so this
 * adds only a few hundred bytes of JS.
 */
const MODES = ["steady", "alternate", "chase", "fade", "twinkle"] as const;
const MODE_MS = 8000;

export function LightController({ className, children }: { className: string; children: React.ReactNode }) {
  const [mode, setMode] = useState(0);
  const [still, setStill] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setStill(reduce.matches);
      setHidden(document.hidden);
    };
    sync();
    reduce.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      reduce.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  // A fresh 8 seconds after every change, tap or timer; none while hidden.
  useEffect(() => {
    if (still || hidden) return;
    const id = setTimeout(() => setMode((m) => (m + 1) % MODES.length), MODE_MS);
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
      onClick={() => setMode((m) => (m + 1) % MODES.length)}
      className={className}
    >
      {children}
    </button>
  );
}
