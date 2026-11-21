"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { SLIP } from "./slip-constants";

const { W, FEATHER } = SLIP;
const MAX_FONT = 72; // 64px on a phone panel (drawn at 0.887), 86px on a laptop (1.2)
const MIN_FONT = 20;

/**
 * The name in Gochi Hand, one span per character so the controller can
 * "write" it letter by letter. The clip window and the feather are moved
 * with transforms only (see unfold-controller.tsx). The only part of the
 * slip that needs the browser (it measures the name to fit it), so SlipArt
 * itself can render on the server.
 */
export function HandwrittenName({ name, open }: { name: string; open: boolean }) {
  const text = name.trim();
  const innerRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(MAX_FONT);

  // Shrink long names to fit on one line.
  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const fit = () => {
      const available = W - 16 - FEATHER * 2;
      const current = parseFloat(getComputedStyle(inner).fontSize) || MAX_FONT;
      const widthAtMax = (inner.scrollWidth * MAX_FONT) / current;
      setFontSize(
        widthAtMax > available ? Math.max(MIN_FONT, Math.floor((MAX_FONT * available) / widthAtMax)) : MAX_FONT,
      );
    };
    fit();
    // The webfont may arrive after first paint.
    document.fonts?.ready.then(fit).catch(() => {});
  }, [text]);

  return (
    <span
      data-part="name-clip"
      className="relative inline-block overflow-hidden"
      style={{ paddingInline: FEATHER, paddingBlock: 6 }}
    >
      <span
        ref={innerRef}
        data-part="name-inner"
        className="relative block whitespace-nowrap font-hand leading-none text-ube"
        style={{ fontSize }}
      >
        {Array.from(text).map((ch, i) => (
          <span key={i} data-char={ch}>
            {ch === " " ? " " : ch}
          </span>
        ))}
      </span>
      <span
        data-part="feather"
        className="absolute inset-y-0 right-0"
        style={{
          width: FEATHER,
          // Paper, faded in by a static mask: the soft edge of the wet ink.
          background: "#fff",
          maskImage: "linear-gradient(to right, transparent, #000)",
          WebkitMaskImage: "linear-gradient(to right, transparent, #000)",
          opacity: open ? 0 : 1,
        }}
      />
    </span>
  );
}
