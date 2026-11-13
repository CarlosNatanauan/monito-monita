"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

/**
 * The bunutan slip as pure markup: four paper panels in CSS 3D.
 *
 * Folded twice: the right half folds over the left (rotateY), then the
 * bottom half folds up over the top (rotateX). The folded state is set
 * with inline styles so the slip looks right before any JS loads.
 * `unfold-controller.tsx` animates the `data-part` elements; the folded
 * values here must match the ones it starts from.
 */

export const SLIP = {
  W: 300,
  H: 160,
  /** The folded packet is a quarter of the paper; scale it up a little (to ~190×100). */
  FOLD_SCALE: 1.25,
  FOLD_ROT: -6,
  OPEN_ROT: -2,
  /** Soft leading edge of the ink reveal, in px. */
  FEATHER: 16,
} as const;

export type SlipState = "folded" | "open";

type Side = "left" | "right" | "top" | "bottom";

const { W, H, FEATHER } = SLIP;
const INK = "75 36 114"; // ube, for shading only
const GOLD = "244 197 66"; // margarine
const OPPOSITE: Record<Side, Side> = { left: "right", right: "left", top: "bottom", bottom: "top" };

// Soft valley along a fold line, drawn at one edge of a panel. Panels draw
// half each; the flat face draws both halves, so the swap at the end is invisible.
const creaseAt = (edge: Side) => `linear-gradient(to ${OPPOSITE[edge]}, rgb(${INK} / 0.06), transparent 6px)`;
// The open slip's two faint crease lines: 1px, ube at 12%, centred both ways.
const line = (to: string) =>
  `linear-gradient(to ${to}, transparent calc(50% - 0.5px), rgb(${INK} / 0.12) calc(50% - 0.5px), rgb(${INK} / 0.12) calc(50% + 0.5px), transparent calc(50% + 0.5px))`;
const FLAT_CREASES = [line("right"), line("bottom")].join(", ");
// Outside of the folded packet. Top and left are open edges where the paper
// layers show; right and bottom are the two folds, softly rounded.
const layerLines = (to: Side) =>
  `linear-gradient(to ${to}, transparent 2px, rgb(${INK} / 0.05) 2px, rgb(${INK} / 0.05) 3px, transparent 3px, transparent 5px, rgb(${INK} / 0.04) 5px, rgb(${INK} / 0.04) 6px, transparent 6px)`;
// The diagonal flap on the folded packet: a fine line rising to the right,
// with the flap below it a faint ube tint.
const FLAP = `linear-gradient(165deg, transparent 56%, rgb(${INK} / 0.16) 56%, rgb(${INK} / 0.16) calc(56% + 1px), rgb(${INK} / 0.06) calc(56% + 1px))`;
const PACKET = [
  FLAP,
  layerLines("bottom"),
  layerLines("right"),
  `linear-gradient(to top, rgb(${INK} / 0.10), transparent 9px)`,
  `linear-gradient(to left, rgb(${INK} / 0.08), transparent 9px)`,
].join(", ");
// The outside of the paper: a slightly warm off-white, so the folded slip
// reads as paper. The inside (where the name is) stays Slip white.
const BACK = "linear-gradient(135deg, #fffefb 0%, #f8f5ee 100%)";

// Shading overlays. A turning panel darkens toward its free edge as it goes
// edge-on; a panel lifting off casts a shadow that starts at the fold.
const turnShade = (freeEdge: Side) =>
  `linear-gradient(to ${freeEdge}, rgb(${INK} / 0.06), rgb(${INK} / 0.30))`;
const castShade = (fromEdge: Side) =>
  `linear-gradient(to ${OPPOSITE[fromEdge]}, rgb(${INK} / 0.26), transparent 75%)`;

const R = 6; // outer corner radius
const p3d: CSSProperties = { transformStyle: "preserve-3d" };
const faceBase: CSSProperties = {
  position: "absolute",
  inset: 0,
  overflow: "hidden",
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
};

function Face({
  background,
  back,
  radius,
  children,
}: {
  background: string;
  /** "x" or "y": the axis this face is flipped around to be a back face. */
  back?: "x" | "y";
  radius: Partial<Record<"tl" | "tr" | "bl" | "br", boolean>>;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        ...faceBase,
        background,
        transform: back === "x" ? "rotateX(180deg)" : back === "y" ? "rotateY(180deg)" : undefined,
        borderTopLeftRadius: radius.tl ? R : 0,
        borderTopRightRadius: radius.tr ? R : 0,
        borderBottomLeftRadius: radius.bl ? R : 0,
        borderBottomRightRadius: radius.br ? R : 0,
      }}
    >
      {children}
    </div>
  );
}

function Shade({ part, background, initial = 0 }: { part: string; background: string; initial?: number }) {
  return <div data-part={part} style={{ position: "absolute", inset: 0, background, opacity: initial }} />;
}

// Back faces are flipped, so their rounded corner is mirrored: around Y it
// swaps left/right, around X it swaps top/bottom.
export function SlipArt({ name, state }: { name: string; state: SlipState }) {
  const folded = state === "folded";
  const half: CSSProperties = { position: "absolute", left: 0, width: W, height: H / 2, ...p3d };
  const quarter: CSSProperties = { position: "absolute", top: 0, width: W / 2, height: H / 2, ...p3d };
  const placer: CSSProperties = {
    position: "absolute",
    inset: 0,
    transform: folded ? `rotate(${SLIP.FOLD_ROT}deg) scale(${SLIP.FOLD_SCALE})` : `rotate(${SLIP.OPEN_ROT}deg)`,
  };
  const footprint: CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: R,
    transform: folded ? "scale(0.5, 0.5)" : undefined,
  };
  const turned = (axis: "x" | "y") =>
    folded ? `translate3d(0px, 0px, ${axis === "x" ? 2 : 1}px) ${axis === "x" ? "rotateX(180deg)" : "rotateY(-180deg)"}` : undefined;

  return (
    <div data-part="stage" aria-hidden className="relative" style={{ width: W, height: H, perspective: 800 }}>
      {/* Gold glow behind everything (finish only) */}
      <div
        data-part="glow"
        className="pointer-events-none absolute"
        style={{
          left: -W * 0.2,
          right: -W * 0.2,
          top: -H * 0.6,
          bottom: -H * 0.6,
          background:
            `radial-gradient(closest-side, rgb(${GOLD} / 0.55), rgb(${GOLD} / 0.18) 55%, transparent 100%)`,
          opacity: folded ? 0 : 0.3,
        }}
      />

      {/* Flat layer under the paper: shadows and the gold rim. Moves with the placer. */}
      <div data-part="shadow-placer" style={placer}>
        {/* Folded only: a second sheet peeking out behind at +3°, and a soft gold glow. */}
        <div
          data-part="under-sheet"
          style={{
            ...footprint,
            transform: folded ? `scale(0.5, 0.5) translate(6px, 4px) rotate(${3 - SLIP.FOLD_ROT}deg)` : undefined,
            background: "linear-gradient(135deg, #f1e9da, #e2d6c0)",
            boxShadow: "0 2px 6px rgb(13 43 31 / 0.25)",
            opacity: folded ? 1 : 0,
          }}
        />
        <div
          data-part="fold-glow"
          style={{ ...footprint, boxShadow: `0 0 80px 24px rgb(${GOLD} / 0.4)`, opacity: folded ? 1 : 0 }}
        />
        <div
          data-part="shadow-lift"
          style={{ ...footprint, boxShadow: `0 24px 36px -10px rgb(${INK} / 0.32)`, opacity: 0 }}
        />
        <div
          data-part="shadow-contact"
          style={{ ...footprint, boxShadow: "0 1px 2px rgb(13 43 31 / 0.18), 0 8px 18px rgb(13 43 31 / 0.22)" }}
        />
        <div
          data-part="rim"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: R,
            // 3px margarine outline, the gold halo, and a drop shadow.
            boxShadow: `0 0 0 3px rgb(${GOLD}), 0 0 50px 10px rgb(${GOLD} / 0.75), 0 22px 30px -6px rgb(13 43 31 / 0.4)`,
            opacity: folded ? 0 : 1,
          }}
        />
      </div>

      <div data-part="placer" style={{ ...placer, ...p3d }}>
        <div
          data-part="centerer"
          style={{
            position: "absolute",
            inset: 0,
            ...p3d,
            transform: folded ? `translate(${W / 4}px, ${H / 4}px)` : undefined,
          }}
        >
          {/* Top half: TL stays put, TR folds over it */}
          <div data-part="top" style={{ ...half, top: 0 }}>
            <div style={{ ...quarter, left: 0 }}>
              <Face background={`${creaseAt("right")}, ${creaseAt("bottom")}, #fff`} radius={{ tl: true }}>
                <Shade part="tl-cast" background={castShade("right")} />
              </Face>
            </div>
            <div
              data-part="tr"
              style={{ ...quarter, left: W / 2, transformOrigin: "0% 50%", transform: turned("y") }}
            >
              <Face background={`${creaseAt("left")}, ${creaseAt("bottom")}, #fff`} radius={{ tr: true }}>
                <Shade part="tr-front-shade" background={turnShade("right")} />
              </Face>
              <Face background={BACK} back="y" radius={{ tl: true }}>
                <Shade part="tr-back-shade" background={turnShade("left")} />
                <Shade part="tr-back-cast" background={castShade("bottom")} />
              </Face>
            </div>
          </div>

          {/* Bottom half: folds up over the top half */}
          <div
            data-part="bottom"
            style={{ ...half, top: H / 2, transformOrigin: "50% 0%", transform: turned("x") }}
          >
            <div style={{ ...quarter, left: 0 }}>
              <Face background={`${creaseAt("right")}, ${creaseAt("top")}, #fff`} radius={{ bl: true }}>
                <Shade part="bl-cast" background={castShade("right")} />
              </Face>
              {/* The outside of the folded packet */}
              <Face background={`${PACKET}, ${BACK}`} back="x" radius={{ tl: true }}>
                <Shade part="bl-back-shade" background={turnShade("top")} />
              </Face>
            </div>
            <div
              data-part="br"
              style={{ ...quarter, left: W / 2, transformOrigin: "0% 50%", transform: turned("y") }}
            >
              <Face background={`${creaseAt("left")}, ${creaseAt("top")}, #fff`} radius={{ br: true }}>
                <Shade part="br-front-shade" background={turnShade("right")} />
              </Face>
              <Face background={BACK} back="y" radius={{ bl: true }}>
                <Shade part="br-back-shade" background={turnShade("left")} initial={folded ? 1 : 0} />
              </Face>
            </div>
          </div>

          {/* One flat face for the open slip: hides panel seams, holds the name */}
          <div
            data-part="flat"
            className="flex items-center justify-center"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: R,
              background: `${FLAT_CREASES}, #fff`,
              transform: "translateZ(1px)",
              opacity: folded ? 0 : 1,
            }}
          >
            <HandwrittenName name={name} open={!folded} />
          </div>
        </div>
      </div>

      {/* Three small gold diamonds around the open slip. */}
      <div data-part="diamonds" className="pointer-events-none absolute inset-0" style={{ opacity: folded ? 0 : 1 }}>
        {DIAMONDS.map((d, i) => (
          <span
            key={i}
            className="absolute rotate-45 border-[1.5px] border-margarine-edge bg-margarine"
            style={{ left: d.x, top: d.y, width: d.size, height: d.size }}
          />
        ))}
      </div>
    </div>
  );
}

// Positions relative to the 300×160 stage.
const DIAMONDS = [
  { x: -14, y: 8, size: 10 },
  { x: W - 6, y: -30, size: 11 },
  { x: W + 6, y: H + 2, size: 10 },
];

const MAX_FONT = 64; // text-hand-xl
const MIN_FONT = 20;

/**
 * The name in Gochi Hand, one span per character so the controller can
 * "write" it letter by letter. The clip window and the feather are moved
 * with transforms only (see unfold-controller.tsx).
 */
function HandwrittenName({ name, open }: { name: string; open: boolean }) {
  const text = `~ ${name.trim()} ~`;
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
          // Paper (with the crease that runs behind the name), faded in by a
          // static mask so the moving edge never cuts a gap in the crease.
          background: `${line("bottom")}, #fff`,
          maskImage: "linear-gradient(to right, transparent, #000)",
          WebkitMaskImage: "linear-gradient(to right, transparent, #000)",
          opacity: open ? 0 : 1,
        }}
      />
    </span>
  );
}
