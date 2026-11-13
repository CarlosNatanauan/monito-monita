"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BowlBack, BowlFront } from "@/components/bowl/bowl-art";
import { SlipArt } from "@/components/slip/slip-art";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

const loadDrop = () => import("./drop-timeline");

/**
 * Starts fetching the drop timeline (GSAP) while someone fills in the join
 * form. Not with reduced motion: then GSAP is never needed.
 */
export function preloadDrop(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  void loadDrop();
}

/** Reduced motion: how long the slip rests in the bowl before moving on. */
const REDUCED_HOLD_MS = 900;
/** If the animation code can't load in time, move on anyway. */
const FALLBACK_MS = 3000;

/**
 * Signature moment #2 (docs/DESIGN.md): after joining, your slip folds and
 * drops into the bowl (~1.5s), then /me. One tap skips it. The overlay is
 * a plain link to /me, so it also works before hydration. Reduced motion:
 * the slip fades in already in the bowl, then /me.
 */
export function JoinDrop({ name, href }: { name: string; href: string }) {
  const router = useRouter();
  const reduced = usePrefersReducedMotion();
  const rootRef = useRef<HTMLAnchorElement>(null);
  const left = useRef(false);
  const [done, setDone] = useState(false);

  // Next keeps the join page alive but hidden after the navigation (React
  // Activity), which runs effect cleanups. Once we've left, drop the
  // overlay so it never shows again if that page is revealed later.
  useEffect(
    () => () => {
      if (left.current) setDone(true);
    },
    [],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    router.prefetch(href);
    const go = () => {
      if (left.current) return;
      left.current = true;
      router.replace(href);
    };
    const fallback = window.setTimeout(go, FALLBACK_MS);
    // Fade in over the join page (Web Animations: not cut by the reduced-motion CSS).
    root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduced ? 250 : 150, easing: "ease-out" });
    root.focus({ preventScroll: true });

    if (reduced) {
      const t = window.setTimeout(go, REDUCED_HOLD_MS);
      return () => {
        window.clearTimeout(t);
        window.clearTimeout(fallback);
      };
    }

    let tl: { kill: () => void } | null = null;
    let alive = true;
    loadDrop().then(({ buildDropTimeline }) => {
      if (alive) tl = buildDropTimeline(root, go);
    });
    return () => {
      alive = false;
      tl?.kill();
      window.clearTimeout(fallback);
    };
  }, [href, reduced, router]);

  if (done) return null;

  return (
    <Link
      ref={rootRef}
      href={href}
      replace
      data-join-drop
      onClick={() => {
        left.current = true;
      }}
      aria-label="Kasali ka na! Tuloy sa page mo."
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-leaf-wash bg-[repeating-linear-gradient(115deg,rgb(31_107_69/0.08)_0_1px,transparent_1px_14px)] px-5 pb-10 outline-none [-webkit-tap-highlight-color:transparent]"
    >
      <div className="leaf-panel relative h-[400px] w-full max-w-[440px] overflow-hidden rounded-3xl text-white">
        <p className="absolute inset-x-0 top-7 text-center font-display text-heading">Kasali ka na!</p>

        <div
          data-part="bowl"
          className="pointer-events-none absolute inset-x-0 bottom-[46px] mx-auto h-[163px] w-[236px]"
        >
          <BowlBack className="absolute inset-0 size-full" />
        </div>
        <div className="pointer-events-none absolute top-24 left-1/2 h-[160px] w-[300px] origin-top -translate-x-1/2 scale-[0.6]">
          <div
            data-part="riser"
            className="absolute inset-0"
            // Reduced motion: already in the bowl.
            style={reduced ? { transform: "translateY(222px) scale(0.45) rotate(12deg)" } : undefined}
          >
            <SlipArt name={name} state={reduced ? "folded" : "open"} />
          </div>
        </div>
        <div
          data-part="bowl"
          className="pointer-events-none absolute inset-x-0 bottom-[46px] mx-auto h-[163px] w-[236px]"
        >
          <BowlFront className="absolute inset-0 size-full" />
        </div>

        <p className="absolute inset-x-0 bottom-3 text-center text-small font-bold">Tap para tumuloy</p>
      </div>
    </Link>
  );
}
