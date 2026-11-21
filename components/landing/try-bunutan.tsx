"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Bilao, BOWL_SLIPS, BowlGlass, BowlRim, BowlSlip } from "@/components/bowl/bowl-art";
import { nextSample } from "@/lib/sample-names";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";
import type { Drawer } from "./draw-timeline";

// The bowl's animation code doesn't come with the page: GSAP and the
// timelines, and the slip's markup, load on the bowl's first pointer down,
// focus or key down. A tap that lands before they arrive waits for them.
// Plain import()s on purpose: next/dynamic would preload the chunks with the page.
const loadDrawer = () => import("./draw-timeline").then((m) => m.createDrawer());
type SlipArtComponent = typeof import("@/components/slip/slip-art").SlipArt;
const loadSlipArt = () => import("@/components/slip/slip-art").then((m) => m.SlipArt);

/** How long the opened slip stays before it folds back by itself. */
const AUTO_FOLD_MS = 4000;

// idle: nothing drawn yet. drawing / shown: after a tap. folding: the
// opened slip going back into the bowl; folded: back in (the next tap draws again).
type Phase = "idle" | "drawing" | "shown" | "folding" | "folded";

/** The bowl's two layers share one 80×60 box (the 200×150 drawing at 0.4). */
const BOWL_BOX = "absolute bottom-[13px] left-2 h-[60px] w-20";

/**
 * Signature moment #1 (docs/DESIGN.md §8), small: a glass bowl of slips on
 * its bilao, set on the top-right corner of the "Paano 'to?" listahan (it
 * overhangs the corner, tilted 2.5deg), with "Bumunot ka" beside it. Bowl
 * and label are one button. Tap: the bowl shakes and its slips tumble and
 * swap places (a new mix on every tap), then a sample slip rises out and
 * unfolds with a sample name (the same unfold as /me). Tap again for
 * another name. Reduced motion: no shake or tumble; the slip appears open
 * with a 150ms cross-fade, no GSAP.
 *
 * Where the opened slip lands (clear of the poster, the caption and the
 * buttons): from 600px, on the list's right half under the bowl (the lines
 * end ~370px in, the list is 560px+ wide), 200px wide, covering no text;
 * on phones, on the list itself, left, over the title row's lower edge and
 * the first steps, 170px wide (the person tapped for it). The opened slip
 * is a button too ("Ibalik ang slip"): it folds back into the bowl (the
 * draw played backwards; reduced motion, a 150ms fade), and does so by
 * itself 4s after it opened (focus moves to the bowl only if it was on the
 * slip).
 *
 * `children` is the listahan; the bowl and the slip are drawn over it and
 * never change its rows.
 */
export function TryBunutan({ className, children }: { className?: string; children: React.ReactNode }) {
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [name, setName] = useState<string | null>(null);
  const [draw, setDraw] = useState(0);
  // Reduced motion: the slip shown before this one, fading out.
  const [previous, setPrevious] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const bowlRef = useRef<HTMLButtonElement>(null);
  const slipButtonRef = useRef<HTMLButtonElement>(null);
  const folding = useRef<Promise<void> | null>(null);
  const drawerRef = useRef<Drawer | null>(null);
  const loading = useRef<Promise<Drawer> | null>(null);
  const busy = useRef(false);
  // The slip's markup, once loaded (the riser renders only after that).
  const [Slip, setSlip] = useState<SlipArtComponent | null>(null);
  const slipLoading = useRef<Promise<SlipArtComponent> | null>(null);

  const loadSlip = () =>
    (slipLoading.current ??= loadSlipArt().then((C) => {
      setSlip(() => C);
      return C;
    }));

  const load = () => {
    void loadSlip();
    if (reduced) return null;
    loading.current ??= Promise.all([loadDrawer(), loadSlip()]).then(([d]) => (drawerRef.current = d));
    return loading.current;
  };

  useEffect(() => () => drawerRef.current?.dispose(), []);

  // Intent: the bowl's first pointer down, focus or key down loads the code,
  // and prepares the sparkle (a heavy setup, so only for someone about to tap).
  const intent = () => void load()?.then((d) => d.warmSparkle());

  async function tap() {
    // A tap while the slip folds back (by itself or tapped) draws once it's in.
    if (folding.current) await folding.current;
    if (busy.current) return;
    const next = nextSample(name);
    busy.current = true;
    if (reduced) {
      // A tap before the slip's markup has arrived waits for it.
      await loadSlip();
      setPrevious(phase === "shown" ? name : null);
      setName(next);
      setDraw((d) => d + 1);
      setPhase("shown");
      busy.current = false;
      return;
    }
    // A tap before the code has arrived waits for it, then plays.
    const drawer = await load()!;
    if (phase === "shown" && stageRef.current) await drawer.putBack(stageRef.current);
    setPrevious(null);
    setName(next);
    setDraw((d) => d + 1);
    setPhase("drawing");
  }

  // The opened slip back into the bowl: tapped, or by itself 4s after it opened.
  // Focus moves to the bowl only if it was on the slip (whose button leaves); never otherwise.
  function foldBack() {
    if (busy.current || phase !== "shown") return;
    busy.current = true;
    setPhase("folding");
    if (document.activeElement === slipButtonRef.current) bowlRef.current?.focus({ preventScroll: true });
    const riser = stageRef.current?.querySelector('[data-part="riser"]');
    folding.current = (async () => {
      if (reduced || !drawerRef.current) {
        await riser?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: "linear", fill: "forwards" }).finished;
      } else {
        await drawerRef.current.fold();
      }
      setPrevious(null);
      setPhase("folded");
      busy.current = false;
      folding.current = null;
    })();
  }
  const foldBackRef = useRef(foldBack);
  useEffect(() => {
    foldBackRef.current = foldBack;
  });

  // The open slip covers the steps on phones: it folds back by itself after 4s.
  // A new draw (the bowl) starts the 4s again.
  useEffect(() => {
    if (phase !== "shown") return;
    const id = window.setTimeout(() => foldBackRef.current(), AUTO_FOLD_MS);
    return () => window.clearTimeout(id);
  }, [phase, draw]);

  // A new slip is on the page (folded, invisible): build its mix, rise and unfold, and play it.
  useLayoutEffect(() => {
    const drawer = drawerRef.current;
    if (phase !== "drawing" || !stageRef.current || !drawer) return;
    drawer.draw(stageRef.current, () => {
      busy.current = false;
      setPhase("shown");
    });
    // Only when a new draw starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draw]);

  // Reduced motion: a 150ms cross-fade (Web Animations, so the global
  // reduced-motion CSS doesn't cut it to zero).
  useLayoutEffect(() => {
    if (!reduced || draw === 0) return;
    const stage = stageRef.current;
    const timing = { duration: 150, easing: "linear", fill: "forwards" as const };
    stage?.querySelector('[data-part="riser"]')?.animate([{ opacity: 0 }, { opacity: 1 }], timing);
    const old = stage?.querySelector('[data-part="riser-old"]')?.animate([{ opacity: 1 }, { opacity: 0 }], timing);
    if (old) old.onfinish = () => setPrevious(null);
  }, [draw, reduced]);

  const shown = phase === "shown";
  const tapped = phase === "drawing" || phase === "shown";
  const label = name ? "Bumunot ulit" : "Bumunot ka";

  return (
    <div data-bunutan data-phase={phase} className={cn("relative", className)}>
      {children}

      {/* The bilao, the bowl's back glass, the slips inside, the rim: tilted on the list's corner. */}
      <button
        ref={bowlRef}
        type="button"
        onClick={tap}
        onPointerDown={intent}
        onFocus={intent}
        onKeyDown={intent}
        aria-label={`${label}: sample na bunutan`}
        className="group absolute -top-9 -right-3 z-10 flex cursor-pointer items-end gap-1 rounded-paper pl-1 select-none focus-ring [-webkit-tap-highlight-color:transparent] min-[600px]:-right-4"
      >
        <span className="mb-[9px] font-sans text-[14px] max-[379px]:mb-[43px] leading-none font-bold whitespace-nowrap text-ube">{label}</span>
        <span
          aria-hidden
          className="relative block h-[73px] w-24 shrink-0 rotate-[2.5deg] transition-transform duration-150 group-hover:-translate-y-0.5 motion-reduce:transition-none"
        >
          <Bilao className="absolute bottom-0 left-0 h-5 w-24" />
          <span data-part="bowl" className={BOWL_BOX}>
            {/* The shake moves the inner layers (GSAP). */}
            <span data-part="bowl-shake" className="absolute inset-0 origin-bottom">
              {BOWL_SLIPS.top.map((spot, i) => (
                <BowlSlip key={i} spot={spot} tone="light" />
              ))}
              <BowlGlass tone="light" className="absolute inset-0 size-full" />
            </span>
          </span>
          <span className={BOWL_BOX}>
            <span data-part="bowl-shake" className="absolute inset-0 origin-bottom">
              {BOWL_SLIPS.inside.map((spot, i) => (
                <BowlSlip key={i} spot={spot} tone="light" />
              ))}
              <BowlRim tone="light" className="absolute inset-0 size-full" />
            </span>
          </span>
        </span>
      </button>

      {/* The opened slip (300×160 drawn, scaled): phones on the list, left (170 wide); 600px+ on the list's right half (200 wide). */}
      <div
        ref={stageRef}
        data-overlap-ok
        data-sample-slip={tapped && name ? name : undefined}
        className={cn(
          "pointer-events-none absolute z-20 h-[160px] w-[300px] origin-top-left",
          "top-[34px] left-2 scale-[0.5667]",
          "min-[600px]:top-[50px] min-[600px]:left-[calc(100%-224px)] min-[600px]:scale-[0.6667]",
        )}
      >
        {previous && Slip && (
          <div key={`old-${draw}`} data-part="riser-old" className="absolute inset-0">
            <Slip name={previous} state="open" />
          </div>
        )}
        {name && Slip && (
          <div key={draw} data-part="riser" className="absolute inset-0" style={{ opacity: reduced ? 1 : 0 }}>
            <Slip name={name} state={reduced ? "open" : "folded"} />
          </div>
        )}
        {shown && (
          // The open slip is a button: tap it to put it back in the bowl. Scaled with the slip.
          <button
            type="button"
            ref={slipButtonRef}
            onClick={foldBack}
            aria-label="Ibalik ang slip"
            className="pointer-events-auto absolute inset-0 cursor-pointer rounded-paper outline-offset-4 select-none focus-ring [-webkit-tap-highlight-color:transparent]"
          />
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {shown && name ? `Nabunot mo si ${name}. Sample lang ito.` : ""}
      </p>
    </div>
  );
}
