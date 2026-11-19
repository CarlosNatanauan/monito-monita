"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Art } from "@/components/art/symbols";
import { Bilao, BOWL_SLIPS, BowlGlass, BowlRim, BowlSlip } from "@/components/bowl/bowl-art";
import { SlipArt } from "@/components/slip/slip-art";
import { FIRST_SAMPLE, nextSample } from "@/lib/sample-names";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";
import type { Drawer } from "./draw-timeline";

// GSAP and the timelines, fetched only when someone is about to tap (or
// the page is idle with the bowl on screen). A plain import() on purpose:
// next/dynamic would preload the chunk with the page.
const loadDrawer = () => import("./draw-timeline").then((m) => m.createDrawer());

// idle: nothing loaded yet. ready: the first slip waits, hidden in the
// bowl, with its timeline built. drawing / shown: after a tap.
type Phase = "idle" | "ready" | "drawing" | "shown";

/** The bowl: 190×142.5 at (80, 94) on the phone design, 200×150 at (216, 90) on the laptop one. */
const BOWL =
  "pointer-events-none absolute top-[33.57%] left-[22.86%] h-[50.89%] w-[54.29%] origin-bottom transition-transform duration-150 group-has-[button:active]:scale-[0.98] lg:top-[32.14%] lg:left-[34.18%] lg:h-[53.57%] lg:w-[31.65%]";

/**
 * Signature moment #1 (docs/DESIGN.md): the bowl on the bilao in a small
 * evening-sky panel under the video (docs/design/landing-video, 1a), rays
 * from the top-right corner, the church along the bottom, no parol (the
 * poster above has one). Tap the bowl: it shakes and the slips inside
 * tumble and swap places (a new mix on every tap), then a sample slip rises
 * out and unfolds with a sample name (the same unfold as /me), top right,
 * clear of the label. Tap again for another name. Each slip in the bowl is
 * its own element, between the glass and the rim, so the mix moves them
 * with composited transforms. Reduced motion: no shake or tumble, the
 * opened slip fades in, no GSAP.
 *
 * Laid out on the handoff's designs in percent (phone 350×280, laptop
 * 632×280), so the panel keeps its aspect ratio at any width; the opened
 * slip's scale follows the panel's width.
 */
export function TryBunutan({ className }: { className?: string }) {
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [name, setName] = useState<string | null>(null);
  const [draw, setDraw] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const drawerRef = useRef<Drawer | null>(null);
  const loading = useRef<Promise<Drawer> | null>(null);
  const busy = useRef(false);
  // Panel width over its design width (phone 350, laptop 632): the opened slip's scale.
  const [fit, setFit] = useState(1);
  const phaseRef = useRef<Phase>("idle");
  useEffect(() => {
    phaseRef.current = phase;
  });

  const load = () => {
    if (reduced) return null;
    loading.current ??= loadDrawer().then((d) => {
      drawerRef.current = d;
      // Put the first slip in the bowl now, so the first tap only plays.
      if (phaseRef.current === "idle" && !busy.current) {
        setName(FIRST_SAMPLE);
        setDraw((n) => n + 1);
        setPhase("ready");
      }
      return d;
    });
    return loading.current;
  };

  // Idle prefetch once the bowl is on screen, so the first tap is instant.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || reduced) return;
    let idle = 0;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const ric = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
      idle = ric(() => void load(), { timeout: 4000 });
    });
    io.observe(el);
    return () => {
      io.disconnect();
      window.cancelIdleCallback?.(idle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load() only reads refs and `reduced`
  }, [reduced]);

  useEffect(() => () => drawerRef.current?.dispose(), []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      setFit(w / (window.matchMedia("(min-width: 1024px)").matches ? 632 : 350));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The sparkle's setup waits for the first interaction anywhere on the
  // page (scrolling, touching), so it stays out of the page load.
  useEffect(() => {
    if (reduced) return;
    const events = ["pointerdown", "touchstart", "scroll", "keydown"] as const;
    const warm = () => {
      events.forEach((e) => window.removeEventListener(e, warm));
      // Already loaded (the usual case after idle): set up right now, so a
      // first touch on the bowl does it before its click starts the draw.
      if (drawerRef.current) drawerRef.current.warmSparkle();
      else void load()?.then((d) => d.warmSparkle());
    };
    events.forEach((e) => window.addEventListener(e, warm, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, warm));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load() only reads refs and `reduced`
  }, [reduced]);

  async function tap() {
    if (busy.current) return;
    const next = nextSample(name);
    if (reduced) {
      setName(next);
      setDraw((d) => d + 1);
      setPhase("shown");
      return;
    }
    busy.current = true;
    if (phase === "ready" && drawerRef.current) {
      setPhase("drawing");
      drawerRef.current.play();
      return;
    }
    const drawer = await load()!;
    if (phase === "shown" && stageRef.current) await drawer.putBack(stageRef.current);
    setName(next);
    setDraw((d) => d + 1);
    setPhase("drawing");
  }

  // A new slip is on the page (folded, invisible): build its rise + unfold,
  // and play it right away unless it's the waiting first slip.
  useLayoutEffect(() => {
    const drawer = drawerRef.current;
    if ((phase !== "drawing" && phase !== "ready") || !stageRef.current || !drawer) return;
    const done = () => {
      busy.current = false;
      setPhase("shown");
    };
    if (phase === "ready") drawer.prepare(stageRef.current, done);
    else drawer.draw(stageRef.current, done);
    // Only when a new draw starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draw]);

  // Reduced motion: a plain fade (Web Animations, so the global
  // reduced-motion CSS doesn't cut it to zero).
  useLayoutEffect(() => {
    if (!reduced || draw === 0) return;
    stageRef.current
      ?.querySelector('[data-part="riser"]')
      ?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350, easing: "ease-out" });
  }, [draw, reduced]);

  const shown = phase === "shown";
  const tapped = phase === "drawing" || phase === "shown";

  return (
    <section
      ref={sectionRef}
      aria-label="Try a bunutan"
      className={cn(
        "group relative isolate aspect-[350/280] w-full overflow-hidden rounded-sky text-white lg:aspect-[632/280]",
        "[background:repeating-conic-gradient(from_0deg_at_100%_0%,var(--color-ube)_0deg_6deg,var(--color-ube-sky)_6deg_12deg)]",
        className,
      )}
    >
      {/* The church along the bottom: full width on phones, the right two thirds on laptops. */}
      <Art name="simbahan" className="pointer-events-none absolute right-0 bottom-0 h-[37.5%] w-full lg:h-[45%] lg:w-[66.46%]" />

      {/* The bilao, the bowl's back glass, the drawn slip, the front glass. */}
      <Bilao className="pointer-events-none absolute top-[77.86%] left-[17.43%] h-[16.96%] w-[65.14%] lg:top-[78.57%] lg:left-[31.01%] lg:h-[17.86%] lg:w-[37.97%]" />
      <div data-part="bowl" className={BOWL}>
        {/* The shake moves this inner layer (GSAP); the press scale stays on the outer one (CSS). */}
        <div data-part="bowl-shake" className="absolute inset-0 origin-bottom">
          {BOWL_SLIPS.top.map((spot, i) => (
            <BowlSlip key={i} spot={spot} />
          ))}
          <BowlGlass className="absolute inset-0 size-full" />
        </div>
      </div>

      {/* The opened slip lands top right, clear of the label: 0.48 of its size on the phone design, 0.65 on the laptop one. */}
      <div
        ref={stageRef}
        data-sample-slip={tapped && name ? name : undefined}
        className="pointer-events-none absolute top-[5%] left-[55.43%] h-[160px] w-[300px] origin-top-left scale-(--slip) [--slip-base:0.48] lg:top-[8.57%] lg:left-[66.46%] lg:[--slip-base:0.65]"
        style={{ "--slip": `calc(var(--slip-base) * ${fit})` } as React.CSSProperties}
      >
        {name && (
          <div key={draw} data-part="riser" className="absolute inset-0" style={{ opacity: reduced ? 1 : 0 }}>
            <SlipArt name={name} state={reduced ? "open" : "folded"} />
          </div>
        )}
      </div>

      <div data-part="bowl" className={BOWL}>
        {/* The shake moves this inner layer (GSAP); the press scale stays on the outer one (CSS). */}
        <div data-part="bowl-shake" className="absolute inset-0 origin-bottom">
          {BOWL_SLIPS.inside.map((spot, i) => (
            <BowlSlip key={i} spot={spot} />
          ))}
          <BowlRim className="absolute inset-0 size-full" />
        </div>
      </div>

      <button
        type="button"
        onClick={tap}
        onPointerEnter={() => void load()?.then((d) => d.warmSparkle())}
        onPointerDown={() => void load()}
        onFocus={() => void load()}
        className={cn(
          // Stretched: the whole sky is the tap target; the words sit under the slip.
          "absolute inset-0 cursor-pointer rounded-sky text-left font-bold text-white outline-none select-none [-webkit-tap-highlight-color:transparent]",
          "focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ilaw",
        )}
      >
        {/* Top left, kept clear of where the opened slip lands. */}
        <span className="absolute top-[7.86%] left-[5.71%] max-w-[47.4%] text-body leading-[1.2] lg:top-[9.29%] lg:left-[4.11%] lg:max-w-[60.8%] lg:text-[17px]">
          {shown ? (
            "Tap ulit para bumunot ng iba"
          ) : (
            <>
              <span className="lg:hidden">Tap</span>
              <span className="hidden lg:inline">Click</span> the bowl para bumunot
            </>
          )}
        </span>
      </button>
      <p className="sr-only" aria-live="polite">
        {shown && name ? `Nabunot mo si ${name}. Sample lang ito.` : ""}
      </p>
    </section>
  );
}
