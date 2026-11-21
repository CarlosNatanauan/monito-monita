import type { CSSProperties } from "react";
import { HandwrittenName } from "./handwritten-name";
import { SLIP } from "./slip-constants";

export { SLIP };

/**
 * The bunutan slip as pure markup: four paper panels in CSS 3D
 * (docs/DESIGN.md, "The slip"): white paper, square corners, the name in
 * Gochi Hand, a flat offset shadow. No glow, no blur.
 *
 * Folded twice: the right half folds over the left (rotateY), then the
 * bottom half folds up over the top (rotateX). The folded packet hangs
 * from the slip's top edge (where the clothespin holds it), so it opens
 * downward on the string. The folded state is set with inline styles so
 * the slip looks right before any JS loads. The timelines animate the
 * `data-part` elements; the folded values here must match theirs.
 *
 * No hooks here (the written name, which measures itself, is its own
 * client component), so an already-open slip renders on the server
 * (OpenSlip) and ships no slip code.
 */

export type SlipState = "folded" | "open";

type Side = "left" | "right" | "top" | "bottom";

const { W, H } = SLIP;
const INK = "63 31 99"; // ube, for shading only
/** The one shadow: flat, offset, no blur (docs/DESIGN.md). */
const FLAT_SHADOW = "3px 4px 0 rgb(30 18 56 / 0.45)";
/** While lifted: further off the paper below, still flat. */
const LIFT_SHADOW = "7px 10px 0 rgb(30 18 56 / 0.28)";
const OPPOSITE: Record<Side, Side> = { left: "right", right: "left", top: "bottom", bottom: "top" };

// Soft valley along a fold line, drawn at one edge of a panel. Panels draw
// half each; the flat face draws both halves, so the swap at the end is invisible.
const creaseAt = (edge: Side) => `linear-gradient(to ${OPPOSITE[edge]}, rgb(${INK} / 0.06), transparent 6px)`;
// Outside of the folded packet. Top and left are open edges where the paper
// layers show; right and bottom are the two folds, softly rounded.
const layerLines = (to: Side) =>
  `linear-gradient(to ${to}, transparent 2px, rgb(${INK} / 0.05) 2px, rgb(${INK} / 0.05) 3px, transparent 3px, transparent 5px, rgb(${INK} / 0.04) 5px, rgb(${INK} / 0.04) 6px, transparent 6px)`;
// The diagonal fold on the folded packet: a fine lilac line rising to the
// right, the flap below it pale lilac (docs/design/reference.html, .fold).
const FLAP = "linear-gradient(168deg, transparent 52%, #D9C8EC 52% 53%, #F6F1FB 53%)";
const PACKET = [FLAP, layerLines("bottom"), layerLines("right")].join(", ");
// The outside of the paper: plain white, like the inside.
const BACK = "#fff";

// Shading overlays. A turning panel darkens toward its free edge as it goes
// edge-on; a panel lifting off casts a shadow that starts at the fold.
const turnShade = (freeEdge: Side) =>
  `linear-gradient(to ${freeEdge}, rgb(${INK} / 0.06), rgb(${INK} / 0.30))`;
const castShade = (fromEdge: Side) =>
  `linear-gradient(to ${OPPOSITE[fromEdge]}, rgb(${INK} / 0.26), transparent 75%)`;

const R = 0; // square paper corners
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
    // Hangs from the top edge: scale and tilt around the clothespin.
    transformOrigin: "50% 0%",
    transform: folded ? `rotate(${SLIP.FOLD_ROT}deg) scale(${SLIP.FOLD_SCALE})` : `rotate(${SLIP.OPEN_ROT}deg)`,
  };
  const footprint: CSSProperties = {
    position: "absolute",
    inset: 0,
    transformOrigin: "50% 0%",
    transform: folded ? "scale(0.5, 0.5)" : undefined,
  };
  const turned = (axis: "x" | "y") =>
    folded ? `translate3d(0px, 0px, ${axis === "x" ? 2 : 1}px) ${axis === "x" ? "rotateX(180deg)" : "rotateY(-180deg)"}` : undefined;

  return (
    <div data-part="stage" aria-hidden className="relative" style={{ width: W, height: H, perspective: 800 }}>
      {/* Flat layer under the paper: the second sheet and the flat shadows. Moves with the placer. */}
      <div data-part="shadow-placer" style={placer}>
        {/* Folded only: a second, lilac sheet behind, square to the string. */}
        <div
          data-part="under-sheet"
          style={{
            ...footprint,
            transform: folded ? `scale(0.5, 0.5) rotate(${-SLIP.FOLD_ROT}deg)` : undefined,
            background: "#E6DAF1",
            opacity: folded ? 1 : 0,
          }}
        />
        <div data-part="shadow-lift" style={{ ...footprint, boxShadow: LIFT_SHADOW, opacity: 0 }} />
        <div data-part="shadow-contact" style={{ ...footprint, boxShadow: FLAT_SHADOW }} />
      </div>

      <div data-part="placer" style={{ ...placer, ...p3d }}>
        <div
          data-part="centerer"
          style={{
            position: "absolute",
            inset: 0,
            ...p3d,
            // The packet sits at the top centre (it hangs from the top edge).
            transform: folded ? `translate(${W / 4}px, 0px)` : undefined,
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
              background: "#fff",
              transform: "translateZ(1px)",
              opacity: folded ? 0 : 1,
            }}
          >
            <HandwrittenName name={name} open={!folded} />
          </div>
        </div>
      </div>

    </div>
  );
}
