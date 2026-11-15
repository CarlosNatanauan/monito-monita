"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { Art } from "@/components/art/symbols";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";
import type { RevealSlip } from "@/server/reveal-window";
import { playFade } from "./fade-transition";
import {
  bulbTransform,
  ringModel,
  segmentOpacity,
  slipTransform,
  STAGE_H,
  STAGE_W,
  windowOpacity,
  type RingGeometry,
} from "./ring";
import "./reveal.css";
import { centreLeadSize, centreNameSize, slipCodeSize, slipNameSize } from "./slip-text";
import { transitionBetween, type Cue, type Playing, type RevealStatus, type Shown, type StepTransition } from "./transition";

export interface StagePair {
  giverCodename: string;
  giverName: string;
  receiverName: string;
}

/** What the stage shows: one screen of the reveal (from the server, or the lab). */
export interface StageView {
  status: RevealStatus;
  groupName: string;
  total: number;
  /** 0 before the start, the pair on screen while revealing, total after. */
  step: number;
  /** The pair on screen (while revealing). */
  pair?: StagePair;
  /** The ring: names only on revealed slips. */
  slips: RevealSlip[];
  /** Every pair, in loop order (after the reveal). */
  pairs?: StagePair[];
}

type TimelineModule = typeof import("./reveal-timeline");

const prefersReduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The ring of slips and bulbs with the centre text. Renders the state
 * for `view` directly (a refresh mid-reveal shows exactly the right
 * thing); when the step or status changes while open, it plays the
 * transition from the previous screen: GSAP (lazy) or, with reduced
 * motion, cross-fades.
 */
export function RevealStage({
  view,
  showList,
  className,
  onCue,
  onFinaleDone,
  speed = 1,
}: {
  view: StageView;
  showList: boolean;
  className?: string;
  /** Timeline speed (lab only). */
  speed?: number;
  onCue?: (cue: Cue) => void;
  onFinaleDone?: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Scale the 1920×1080 stage to fit its box (no React re-render).
  useLayoutEffect(() => {
    const box = boxRef.current;
    const stage = stageRef.current;
    if (!box || !stage) return;
    const fit = () => {
      const { width, height } = box.getBoundingClientRect();
      if (!width || !height) return;
      stage.style.setProperty("--stage-scale", String(Math.min(width / STAGE_W, height / STAGE_H)));
      stage.dataset.measured = "true";
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const reduced = usePrefersReducedMotion();
  const finale = view.status === "REVEALED";
  const model = ringModel(view.total, view.step, view.slips, finale);
  const { g } = model;

  // GSAP loads after the screen is up (never with reduced motion, never
  // once it's all over), so it's ready before the first Next.
  const timelines = useRef<TimelineModule | null>(null);
  useEffect(() => {
    // Asked directly: during hydration the hook still says "no preference".
    if (prefersReduced() || finale || timelines.current) return;
    let alive = true;
    import("./reveal-timeline").then((m) => {
      if (alive) timelines.current = m;
    });
    return () => {
      alive = false;
    };
  }, [reduced, finale]);

  // Gold stars for the finale, set up while the last pair is on screen.
  const stars = useRef<import("./stars").Stars | null>(null);
  const nearEnd = view.status === "REVEALING" && view.step === view.total;
  useEffect(() => {
    if (!nearEnd || prefersReduced() || stars.current) return;
    let alive = true;
    import("./stars").then((m) => {
      if (alive) stars.current = m.prepareStars();
    });
    return () => {
      alive = false;
    };
  }, [nearEnd, reduced]);
  useEffect(() => () => stars.current?.dispose(), []);

  const callbacks = useRef({ onCue, onFinaleDone });
  useEffect(() => {
    callbacks.current = { onCue, onFinaleDone };
  });

  const shown = useRef<Shown | null>(null);
  const playing = useRef<Playing | null>(null);
  const count = useRef(0);

  useLayoutEffect(() => {
    const root = stageRef.current;
    const next: Shown = { status: view.status, step: view.step, slips: view.slips };
    const previous = shown.current;
    shown.current = next;
    if (!root || !previous) return;
    const t: StepTransition | null = transitionBetween(previous, next, g);
    if (!t) return;

    playing.current?.finish();
    count.current += 1;
    root.dataset.animating = t.kind;
    root.dataset.lastTransition = t.kind;
    root.dataset.transitions = String(count.current);
    const options = {
      speed,
      cue: (cue: Cue) => {
        callbacks.current.onCue?.(cue);
        if (cue.kind === "burst") stars.current?.burst();
      },
      done: () => {
        delete root.dataset.animating;
        playing.current = null;
        if (t.kind === "finale") callbacks.current.onFinaleDone?.();
      },
    };
    const gsapTimelines = reduced ? null : timelines.current;
    playing.current = gsapTimelines ? gsapTimelines.playTransition(root, t, g, options) : playFade(root, t, g, options);
    // g changes only with the group size, which never changes mid-reveal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.status, view.step, view.slips, reduced]);

  useEffect(() => () => playing.current?.finish(), []);

  return (
    <div ref={boxRef} className={className}>
      <div
        ref={stageRef}
        className="rv-stage"
        data-measured="false"
        data-status={view.status}
        data-step={view.step}
        data-finale={finale}
        data-transitions="0"
      >
        {/* The parol's frame behind the centre text: dim, then gold at the finale. */}
        <Art name="parol-outline" className="rv-frame rv-frame-dim" />
        <Art name="parol-outline" className="rv-frame rv-frame-gold" />
        <Art name="simbahan" className="rv-simbahan" />
        <div data-part="ring" hidden={showList}>
          <div aria-hidden>
            {model.segments.flatMap((seg) =>
              Array.from({ length: g.bulbsPerSegment }, (_, k) => {
                const pos = seg.pos + (k + 1) / (g.bulbsPerSegment + 1);
                return (
                  <div
                    key={`${seg.index}-${k}`}
                    className="rv-bulb"
                    data-bulb=""
                    data-seg={seg.index}
                    data-seg-pos={seg.pos}
                    data-pos={pos}
                    data-state={seg.state}
                    style={{ transform: bulbTransform(pos, g), opacity: segmentOpacity(seg.pos, g) }}
                  >
                    <div className="rv-bulb-on" data-part="on" />
                  </div>
                );
              }),
            )}
          </div>

          <ol aria-label="Slips">
            {model.slips.map((s) => {
              const opacity = windowOpacity(s.pos, g);
              return (
                <li
                  key={s.index}
                  className="rv-slip"
                  data-slip={s.index}
                  data-pos={s.pos}
                  data-face={s.face}
                  data-halo={s.halo}
                  aria-current={s.current ? "step" : undefined}
                  aria-hidden={opacity === 0 || s.face === "blank" ? true : undefined}
                  style={{ width: g.slipW, height: g.slipH, transform: slipTransform(s.pos, s.index, g), opacity }}
                >
                  <div className="rv-flip" data-part="flip">
                    <div className="rv-face rv-front" data-part="front">
                      <span
                        className="rv-code"
                        data-part="code"
                        style={{ fontSize: slipCodeSize(s.codename ?? "", g) }}
                      >
                        {s.codename}
                      </span>
                    </div>
                    <div className="rv-face rv-back" data-part="back">
                      <SlipBack slip={s} g={g} />
                    </div>
                  </div>
                  <div className="rv-halo" data-part="halo" />
                </li>
              );
            })}
          </ol>

          <section data-part="centre" className="rv-centre" aria-label="Reveal" aria-live="polite">
            <Centre view={view} />
          </section>
        </div>

        {showList && view.pairs && <PairList pairs={view.pairs} />}
      </div>
    </div>
  );
}

function SlipBack({ slip, g }: { slip: { face: string; giverName?: string; receiverName?: string }; g: RingGeometry }) {
  if (slip.face === "revealed" && slip.giverName) {
    return (
      <>
        <span key="name" className="rv-name" style={{ fontSize: slipNameSize(slip.giverName, g) }}>
          {slip.giverName}
        </span>
        <span key="to" className="rv-to">
          → kay <span className="nm">{slip.receiverName}</span>
        </span>
      </>
    );
  }
  // Filled only while a slip turns back over (Previous); empty otherwise.
  return (
    <>
      <span key="ghost-name" className="rv-name" data-part="ghost-name" />
      <span key="ghost-to" className="rv-to" data-part="ghost-to" />
    </>
  );
}

function Centre({ view }: { view: StageView }) {
  if (view.status === "DRAWN") {
    return (
      <>
        <h1 className="font-head text-[118px] leading-[1.05]">Handa na?</h1>
        <p className={cn("rv-centre-line", "text-[45px] leading-[1.2] font-bold text-balance")}>
          {view.total} slips, {view.total} sikreto. Pindutin para simulan.
        </p>
      </>
    );
  }
  if (view.status === "REVEALED") {
    return (
      <div className="rv-banner">
        <h1 className="font-head text-[101px] leading-[1.05]">Maligayang Pasko!</h1>
        <p className="mt-3 text-[37px] leading-[1.2] font-bold text-balance">Buo na ang parol. Bigayan na ng regalo!</p>
      </div>
    );
  }
  const pair = view.pair;
  if (!pair) return null;
  return (
    <>
      <p className={cn("rv-centre-line", "font-bold leading-[1.15] text-gabi-text")} style={{ fontSize: centreLeadSize(pair.giverCodename) }}>
        Si {pair.giverCodename} ay si…
      </p>
      <p
        className={cn("rv-centre-line", "max-w-[1000px] font-hand leading-[1.05] text-ilaw")}
        style={{ fontSize: centreNameSize(pair.giverName) }}
      >
        {pair.giverName}!
      </p>
      <p className={cn("rv-centre-line", "font-head text-[45px] leading-[1.2] text-white")}>
        Ang monito niya: <span className="nm">{pair.receiverName}</span>
      </p>
    </>
  );
}

/** Every pair in loop order, in columns that fit 1080p at 24px and up. */
function PairList({ pairs }: { pairs: StagePair[] }) {
  const columns = Math.min(4, Math.max(1, Math.ceil(pairs.length / 15)));
  return (
    <div className="rv-list">
      <h2 className="mb-6 text-center font-head text-[64px] leading-none text-white">Lahat ng pairs</h2>
      <div className="rv-list-scroll">
        <ol aria-label="All pairs" className="rv-list-items" style={{ columnCount: columns }}>
          {pairs.map((p, i) => (
            <li key={i} className="rv-list-item">
              <span className="font-hand text-[34px] leading-tight text-ilaw">{p.giverName}</span>{" "}
              <span className="text-[24px] leading-tight font-bold text-gabi-text">
                → kay <span className="nm text-[30px]">{p.receiverName}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
