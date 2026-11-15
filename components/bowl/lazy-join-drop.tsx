"use client";

import { lazy, Suspense } from "react";

// The drop overlay (slip, bowl and their markup) and its GSAP timeline are
// only needed after joining, so neither ships with the join page: both are
// fetched while someone fills in the form. A plain import() on purpose:
// next/dynamic would preload the chunk with the page.
const loadOverlay = () => import("./join-drop");
const JoinDropOverlay = lazy(() => loadOverlay().then((m) => ({ default: m.JoinDrop })));

/** Starts fetching the overlay (and, without reduced motion, its timeline) on the form's first focus. */
export function preloadDrop(): void {
  void loadOverlay().then((m) => m.preloadDrop());
}

/** Signature moment #2, loaded on demand (see join-drop.tsx). */
export function JoinDrop(props: { name: string; href: string }) {
  return (
    <Suspense fallback={null}>
      <JoinDropOverlay {...props} />
    </Suspense>
  );
}
