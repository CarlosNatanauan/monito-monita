"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BowlBack, BowlFront } from "@/components/bowl/bowl-art";
import { SlipArt } from "@/components/slip/slip-art";
import { nextSample } from "@/lib/sample-names";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";
import type { Drawer } from "./draw-timeline";

// GSAP and the timelines, fetched only when someone is about to tap (or
// the page is idle with the bowl on screen). A plain import() on purpose:
// next/dynamic would preload the chunk with the page.
const loadDrawer = () => import("./draw-timeline").then((m) => m.createDrawer());

type Phase = "idle" | "drawing" | "shown";

/**
 * Signature moment #1 (docs/DESIGN.md): the bowl on the bilao inside the
 * dahon arch. Tap the bowl, a sample slip rises out of it and unfolds with
 * a sample name (the same unfold as /me). Tap again for another name.
 * Reduced motion: the opened slip fades in, no GSAP.
 */
export function TryBunutan() {
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [name, setName] = useState<string | null>(null);
  const [draw, setDraw] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const drawerRef = useRef<Drawer | null>(null);
  const loading = useRef<Promise<Drawer> | null>(null);
  const busy = useRef(false);

  const load = () => {
    if (reduced) return null;
    loading.current ??= loadDrawer().then((d) => (drawerRef.current = d));
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
    const drawer = await load()!;
    if (phase === "shown" && stageRef.current) await drawer.putBack(stageRef.current);
    setName(next);
    setDraw((d) => d + 1);
    setPhase("drawing");
  }

  // A new slip is on the page (folded, invisible): play the rise + unfold.
  useLayoutEffect(() => {
    if (phase !== "drawing" || !stageRef.current || !drawerRef.current) return;
    drawerRef.current.draw(stageRef.current, () => {
      busy.current = false;
      setPhase("shown");
    });
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

  return (
    <section
      ref={sectionRef}
      aria-label="Try a bunutan"
      className="group relative rounded-t-[166px] rounded-b-[30px] bg-niyog/45 p-1.5"
    >
      <div
        className="leaf-panel relative isolate h-[340px] overflow-hidden rounded-t-[160px] rounded-b-3xl shadow-[inset_0_0_0_2px_var(--color-margarine)]"
      >
        {/* Before the first draw, the space the slip will rise into invites a tap. */}
        <p
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 top-[72px] text-center font-display text-heading text-white transition-opacity duration-200",
            name && "opacity-0",
          )}
        >
          Try a bunutan!
        </p>

        {/* Bowl, the drawn slip between its back and front glass, then the caption */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-[46px] mx-auto h-[163px] w-[236px] transition-transform duration-150 group-has-[button:active]:scale-[0.98]"
        >
          <BowlBack className="absolute inset-0 size-full" />
        </div>

        <div
          ref={stageRef}
          data-sample-slip={name ?? undefined}
          className="pointer-events-none absolute top-10 left-1/2 h-[160px] w-[300px] origin-top -translate-x-1/2 scale-[0.6] max-[359px]:scale-[0.52]"
        >
          {name && (
            <div key={draw} data-part="riser" className="absolute inset-0" style={{ opacity: reduced ? 1 : 0 }}>
              <SlipArt name={name} state={reduced ? "open" : "folded"} />
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-[46px] mx-auto h-[163px] w-[236px] transition-transform duration-150 group-has-[button:active]:scale-[0.98]">
          <BowlFront className="absolute inset-0 size-full" />
        </div>

        <button
          type="button"
          onClick={tap}
          onPointerEnter={() => void load()}
          onPointerDown={() => void load()}
          onFocus={() => void load()}
          className={cn(
            "absolute inset-x-0 bottom-0 flex h-[46px] items-start justify-center text-body font-bold text-white outline-none select-none",
            // Stretched: the whole arch is the tap target.
            "after:absolute after:inset-x-0 after:bottom-0 after:h-[340px] after:rounded-t-[160px] after:rounded-b-3xl after:content-['']",
            "focus-visible:after:shadow-[0_0_0_2px_var(--color-ube),0_0_0_6px_rgb(244_197_66/0.8)]",
            "cursor-pointer [-webkit-tap-highlight-color:transparent]",
          )}
        >
          {shown ? "Tap ulit para bumunot ng iba" : "Tap the bowl para bumunot"}
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {shown && name ? `Nabunot mo si ${name}. Sample lang ito.` : ""}
      </p>
    </section>
  );
}
