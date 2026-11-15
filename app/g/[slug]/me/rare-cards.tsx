"use client";

import { lazy, Suspense } from "react";

/*
 * The clean-up of ?welcome=1 right after joining: no UI and nothing to
 * tap, so it loads on its own, after the page, keeping /me's first load
 * under 150 KB of JS. (Cards with buttons stay in the main bundle: a lazy
 * one is visible before it can be tapped.)
 */
const LazyCleanWelcome = lazy(() => import("./clean-welcome").then((m) => ({ default: m.CleanWelcomeParam })));

export function CleanWelcomeParam() {
  return (
    <Suspense fallback={null}>
      <LazyCleanWelcome />
    </Suspense>
  );
}
