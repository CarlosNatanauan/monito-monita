/**
 * The app's bunutan slip and its unfold (components/slip/slip-art.tsx and
 * unfold-timeline.ts in the app), at 3x for the video, driven by the frame:
 * the same four-panel CSS 3D fold, the same GSAP timeline (seeked, never
 * played), the same ink reveal for the name (a window that opens letter by
 * letter with a soft leading edge, pausing at spaces), the ray disc that
 * scales in from 0.6, and the gold-star sparkle at the end.
 */
import gsap from "gsap";
import type React from "react";
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { continueRender, delayRender } from "remotion";
import { FPS } from "../../lib/time";
import { FONT } from "../../lib/theme";

const S = 3;
export const SLIP = { W: 300 * S, H: 160 * S, FOLD_SCALE: 1.35, FOLD_ROT: -4, OPEN_ROT: -3, FEATHER: 16 * S } as const;
const { W, H, FEATHER } = SLIP;

// Timing in seconds (the app's, at 1x).
const STEP1_AT = 0.16;
const STEP1 = 0.48;
const STEP2_AT = 0.58;
const STEP2 = 0.48;
export const FLAT_AT = STEP2_AT + STEP2;
export const WRITE_AT = FLAT_AT + 0.02;

const INK = "63 31 99";
const FLAT_SHADOW = "6px 8px 0 rgb(30 18 56 / 0.45)";
const LIFT_SHADOW = "14px 20px 0 rgb(30 18 56 / 0.28)";
type Side = "left" | "right" | "top" | "bottom";
const OPPOSITE: Record<Side, Side> = { left: "right", right: "left", top: "bottom", bottom: "top" };
const creaseAt = (edge: Side) => `linear-gradient(to ${OPPOSITE[edge]}, rgb(${INK} / 0.06), transparent ${6 * S}px)`;
const layerLines = (to: Side) =>
  `linear-gradient(to ${to}, transparent ${2 * S}px, rgb(${INK} / 0.05) ${2 * S}px, rgb(${INK} / 0.05) ${3 * S}px, transparent ${3 * S}px, transparent ${5 * S}px, rgb(${INK} / 0.04) ${5 * S}px, rgb(${INK} / 0.04) ${6 * S}px, transparent ${6 * S}px)`;
const FLAP = "linear-gradient(168deg, transparent 52%, #D9C8EC 52% 53%, #F6F1FB 53%)";
const PACKET = [FLAP, layerLines("bottom"), layerLines("right")].join(", ");
const turnShade = (free: Side) => `linear-gradient(to ${free}, rgb(${INK} / 0.06), rgb(${INK} / 0.30))`;
const castShade = (from: Side) => `linear-gradient(to ${OPPOSITE[from]}, rgb(${INK} / 0.26), transparent 75%)`;

const p3d: CSSProperties = { transformStyle: "preserve-3d" };
const faceBase: CSSProperties = { position: "absolute", inset: 0, overflow: "hidden", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" };

const Face: React.FC<{ background: string; back?: "x" | "y"; children?: React.ReactNode }> = ({ background, back, children }) => (
  <div style={{ ...faceBase, background, transform: back === "x" ? "rotateX(180deg)" : back === "y" ? "rotateY(180deg)" : undefined }}>{children}</div>
);
const Shade: React.FC<{ part: string; background: string; initial?: number }> = ({ part, background, initial = 0 }) => (
  <div data-part={part} style={{ position: "absolute", inset: 0, background, opacity: initial }} />
);

const NAME_SIZE = 72 * S;

/** The slip markup (folded state as inline styles, like the app). */
const SlipMarkup: React.FC<{ name: string }> = ({ name }) => {
  const half: CSSProperties = { position: "absolute", left: 0, width: W, height: H / 2, ...p3d };
  const quarter: CSSProperties = { position: "absolute", top: 0, width: W / 2, height: H / 2, ...p3d };
  const placer: CSSProperties = { position: "absolute", inset: 0, transformOrigin: "50% 0%", transform: `rotate(${SLIP.FOLD_ROT}deg) scale(${SLIP.FOLD_SCALE})` };
  const footprint: CSSProperties = { position: "absolute", inset: 0, transformOrigin: "50% 0%", transform: "scale(0.5, 0.5)" };
  const turned = (axis: "x" | "y") => `translate3d(0px, 0px, ${axis === "x" ? 2 * S : S}px) ${axis === "x" ? "rotateX(180deg)" : "rotateY(-180deg)"}`;
  return (
    <div data-part="stage" style={{ position: "relative", width: W, height: H, perspective: 800 * S }}>
      <div data-part="shadow-placer" style={placer}>
        <div data-part="under-sheet" style={{ ...footprint, transform: `scale(0.5, 0.5) rotate(${-SLIP.FOLD_ROT}deg)`, background: "#E6DAF1" }} />
        <div data-part="shadow-lift" style={{ ...footprint, boxShadow: LIFT_SHADOW, opacity: 0 }} />
        <div data-part="shadow-contact" style={{ ...footprint, boxShadow: FLAT_SHADOW }} />
      </div>
      <div data-part="placer" style={{ ...placer, ...p3d }}>
        <div data-part="centerer" style={{ position: "absolute", inset: 0, ...p3d, transform: `translate(${W / 4}px, 0px)` }}>
          <div data-part="top" style={{ ...half, top: 0 }}>
            <div style={{ ...quarter, left: 0 }}>
              <Face background={`${creaseAt("right")}, ${creaseAt("bottom")}, #fff`}>
                <Shade part="tl-cast" background={castShade("right")} />
              </Face>
            </div>
            <div data-part="tr" style={{ ...quarter, left: W / 2, transformOrigin: "0% 50%", transform: turned("y") }}>
              <Face background={`${creaseAt("left")}, ${creaseAt("bottom")}, #fff`}>
                <Shade part="tr-front-shade" background={turnShade("right")} />
              </Face>
              <Face background="#fff" back="y">
                <Shade part="tr-back-shade" background={turnShade("left")} />
                <Shade part="tr-back-cast" background={castShade("bottom")} />
              </Face>
            </div>
          </div>
          <div data-part="bottom" style={{ ...half, top: H / 2, transformOrigin: "50% 0%", transform: turned("x") }}>
            <div style={{ ...quarter, left: 0 }}>
              <Face background={`${creaseAt("right")}, ${creaseAt("top")}, #fff`}>
                <Shade part="bl-cast" background={castShade("right")} />
              </Face>
              <Face background={`${PACKET}, #fff`} back="x">
                <Shade part="bl-back-shade" background={turnShade("top")} />
              </Face>
            </div>
            <div data-part="br" style={{ ...quarter, left: W / 2, transformOrigin: "0% 50%", transform: turned("y") }}>
              <Face background={`${creaseAt("left")}, ${creaseAt("top")}, #fff`}>
                <Shade part="br-front-shade" background={turnShade("right")} />
              </Face>
              <Face background="#fff" back="y">
                <Shade part="br-back-shade" background={turnShade("left")} initial={1} />
              </Face>
            </div>
          </div>
          <div
            data-part="flat"
            style={{ position: "absolute", inset: 0, background: "#fff", transform: "translateZ(1px)", opacity: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <span data-part="name-clip" style={{ position: "relative", display: "inline-block", overflow: "hidden", paddingInline: FEATHER, paddingBlock: 6 * S }}>
              <span data-part="name-inner" style={{ position: "relative", display: "block", whiteSpace: "nowrap", fontFamily: FONT.hand, lineHeight: 1, color: "#3F1F63", fontSize: NAME_SIZE }}>
                {Array.from(name).map((ch, i) => (
                  <span key={i} data-char={ch}>
                    {ch === " " ? " " : ch}
                  </span>
                ))}
              </span>
              <span
                data-part="feather"
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  right: 0,
                  width: FEATHER,
                  background: "#fff",
                  maskImage: "linear-gradient(to right, transparent, #000)",
                  WebkitMaskImage: "linear-gradient(to right, transparent, #000)",
                }}
              />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

type Built = { tl: gsap.core.Timeline; write: (p: number) => void; duration: number; feather: HTMLElement };

/** The app's timeline, verbatim apart from the scale and the callbacks (handled by the frame instead). */
function build(root: HTMLElement): Built {
  const q = gsap.utils.selector(root);
  const one = (part: string) => q(`[data-part="${part}"]`)[0] as HTMLElement;
  const placers = q('[data-part="placer"], [data-part="shadow-placer"]');
  const footprints = q('[data-part="shadow-contact"], [data-part="shadow-lift"]');
  const turners = q('[data-part="tr"], [data-part="br"]');
  const moved = [...placers, ...footprints, ...turners, one("centerer"), one("bottom")];
  gsap.set(moved, { clearProps: "transform" });
  gsap.set([...placers, ...footprints], { transformOrigin: "50% 0%" });
  gsap.set(placers, { rotation: SLIP.FOLD_ROT, scale: SLIP.FOLD_SCALE });
  gsap.set(one("centerer"), { x: W / 4, y: 0 });
  gsap.set(one("bottom"), { z: 2 * S, rotationX: 180 });
  gsap.set(turners, { z: S, rotationY: -180 });
  gsap.set(footprints, { scaleX: 0.5, scaleY: 0.5 });

  const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.inOut" } });
  tl.to(one("under-sheet"), { opacity: 0, duration: 0.2, ease: "power1.out" }, 0)
    .to(placers, { scale: SLIP.FOLD_SCALE * 1.06, rotation: -3, duration: 0.22, ease: "power2.out" }, 0)
    .to(one("shadow-lift"), { opacity: 1, duration: 0.25, ease: "power1.out" }, 0)
    .to(one("shadow-contact"), { opacity: 0.35, duration: 0.25, ease: "power1.out" }, 0);
  tl.to(one("bottom"), { rotationX: 0, z: 0, duration: STEP1 }, STEP1_AT)
    .to(footprints, { scaleY: 1, duration: STEP1 }, STEP1_AT)
    .to(placers, { scale: 1.12, duration: STEP1 }, STEP1_AT)
    .fromTo(one("bl-back-shade"), { opacity: 0 }, { opacity: 1, duration: STEP1 / 2, ease: "power1.in" }, STEP1_AT)
    .fromTo(one("br-back-shade"), { opacity: 1 }, { opacity: 0, duration: STEP1 / 2, ease: "power1.out" }, STEP1_AT + STEP1 / 2)
    .fromTo(one("tr-back-cast"), { opacity: 0 }, { opacity: 1, duration: STEP1 / 2, ease: "power1.in" }, STEP1_AT)
    .to(one("tr-back-cast"), { opacity: 0, duration: STEP1 / 2, ease: "power1.out" }, STEP1_AT + STEP1 / 2);
  tl.to(turners, { rotationY: 0, z: 0, duration: STEP2 }, STEP2_AT)
    .to(one("centerer"), { x: 0, duration: STEP2 }, STEP2_AT)
    .to(footprints, { scaleX: 1, duration: STEP2 }, STEP2_AT)
    .to(placers, { scale: 1, rotation: SLIP.OPEN_ROT, duration: STEP2 + 0.06 }, STEP2_AT)
    .fromTo(q('[data-part="tr-back-shade"], [data-part="br-back-shade"]'), { opacity: 0 }, { opacity: 1, duration: STEP2 / 2, ease: "power1.in" }, STEP2_AT)
    .fromTo(q('[data-part="tr-front-shade"], [data-part="br-front-shade"]'), { opacity: 1 }, { opacity: 0, duration: STEP2 / 2, ease: "power1.out" }, STEP2_AT + STEP2 / 2)
    .fromTo(q('[data-part="tl-cast"], [data-part="bl-cast"]'), { opacity: 1 }, { opacity: 0, duration: STEP2, ease: "power2.in" }, STEP2_AT);
  tl.to(one("shadow-lift"), { opacity: 0, duration: 0.3, ease: "power1.inOut" }, FLAT_AT - 0.2)
    .to(one("shadow-contact"), { opacity: 1, duration: 0.3, ease: "power1.inOut" }, FLAT_AT - 0.2)
    .set(one("flat"), { opacity: 1 }, FLAT_AT)
    // Keep the timeline long enough to hold the end state.
    .set({}, {}, 4);

  // The ink reveal (makeWriter in the app).
  const clip = one("name-clip");
  const inner = one("name-inner");
  const chars = Array.from(root.querySelectorAll<HTMLElement>("[data-char]"));
  const ease = gsap.parseEase("sine.inOut");
  const duration = gsap.utils.clamp(0.45, 0.85, chars.length * 0.055);
  const width = clip.offsetWidth;
  const edges: number[] = [];
  const weights: number[] = [];
  chars.forEach((el, i) => {
    const last = i === chars.length - 1;
    edges.push(last ? width : Math.min(width, FEATHER + el.offsetLeft + el.offsetWidth + FEATHER * 0.6));
    weights.push(el.dataset.char === " " ? 0.9 : 0.5 + el.offsetWidth / S / 30);
  });
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let acc = 0;
  const ends = weights.map((w) => (acc += w / total));
  const setEdge = (e: number) => {
    clip.style.transform = `translateX(${e - width}px)`;
    inner.style.transform = `translateX(${width - e}px)`;
  };
  const write = (p: number) => {
    let i = ends.findIndex((end) => p <= end);
    if (i < 0) i = ends.length - 1;
    const start = i === 0 ? 0 : ends[i - 1];
    const t = ends[i] > start ? (p - start) / (ends[i] - start) : 1;
    const from = i === 0 ? FEATHER : edges[i - 1];
    setEdge(from + (edges[i] - from) * ease(t));
  };
  write(0);
  return { tl, write, duration, feather: one("feather") };
}

/** Seconds after the tap at which the name has been written. */
export const writeEnd = (name: string) => WRITE_AT + Math.min(0.85, Math.max(0.45, Array.from(name).length * 0.055));

/**
 * The slip, seeked to `t` seconds after the tap (negative = folded, waiting).
 */
export const UnfoldingSlip: React.FC<{ name: string; t: number; style?: CSSProperties }> = ({ name, t, style }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [built, setBuilt] = useState<Built | null>(null);
  const [handle] = useState(() => delayRender("Building the slip timeline"));
  const released = useRef(false);

  useLayoutEffect(() => {
    let alive = true;
    document.fonts.ready.then(() => {
      if (alive && ref.current) setBuilt(build(ref.current));
    });
    return () => {
      alive = false;
    };
  }, []);

  useLayoutEffect(() => {
    if (!built) return;
    const time = Math.max(0, t);
    built.tl.seek(time, true);
    const p = Math.min(1, Math.max(0, (time - WRITE_AT) / built.duration));
    built.write(p);
    built.feather.style.opacity = time >= WRITE_AT + built.duration ? "0" : "1";
    if (!released.current) {
      released.current = true;
      continueRender(handle);
    }
  }, [built, t, handle]);

  return (
    <div ref={ref} style={style}>
      <SlipMarkup name={name} />
    </div>
  );
};

// --- The gold-star sparkle (the app's canvas-confetti burst, deterministic) ---

const STAR = "M12 0 L14.9 8.6 L24 8.6 L16.6 13.9 L19.4 22.5 L12 17.3 L4.6 22.5 L7.4 13.9 L0 8.6 L9.1 8.6 Z";
const TWINKLE = "M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z";
const GOLD = ["#F4C542", "#F4C542", "#E9B42A", "#D9A11A", "#F7D063"];

const rnd = (i: number) => {
  const x = Math.sin(i * 91.17 + 7.31) * 43758.5453;
  return x - Math.floor(x);
};

type Particle = { angle: number; v0: number; scalar: number; flat: boolean; color: string; shape: string; wobble: number };

/** Burst at `t` seconds after it fires (canvas-confetti physics: 60 ticks/s). `k` scales distances. */
export const Sparkle: React.FC<{ t: number; k?: number; style?: CSSProperties }> = ({ t, k = S, style }) => {
  const particles = useMemo<Particle[]>(() => {
    const out: Particle[] = [];
    for (let i = 0; i < 30; i++) {
      const flat = i < 20;
      const sv = flat ? 17 : 12;
      out.push({
        angle: rnd(i * 3 + 1) * Math.PI * 2,
        v0: sv * 0.5 + rnd(i * 3 + 2) * sv,
        scalar: flat ? 1.15 : 0.9,
        flat,
        color: GOLD[Math.floor(rnd(i * 5 + 3) * GOLD.length)],
        shape: rnd(i * 7 + 4) < 0.5 ? STAR : TWINKLE,
        wobble: rnd(i * 11 + 5) * 10,
      });
    }
    return out;
  }, []);
  if (t < 0) return null;
  const ticks = Math.floor(t * FPS * 2);
  const LIFE = 80;
  if (ticks > LIFE) return null;
  return (
    <svg width={2} height={2} style={{ position: "absolute", overflow: "visible", ...style }} aria-hidden>
      {particles.map((p, i) => {
        let x = 0;
        let y = 0;
        let v = p.v0;
        for (let n = 0; n < ticks; n++) {
          x += Math.cos(p.angle) * v;
          y += Math.sin(p.angle) * v + 0.45 * 3;
          v *= 0.9;
        }
        const opacity = 1 - ticks / LIFE;
        const size = 10 * p.scalar;
        const tumble = p.flat ? 1 : Math.abs(Math.cos(p.wobble + ticks * 0.1));
        return (
          <path
            key={i}
            d={p.shape}
            fill={p.color}
            opacity={opacity}
            transform={`translate(${x * k} ${y * k}) scale(${(size / 24) * k * tumble} ${(size / 24) * k}) translate(-12 -12)`}
          />
        );
      })}
    </svg>
  );
};
