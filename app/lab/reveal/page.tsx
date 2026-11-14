import type { Metadata } from "next";
import { Suspense } from "react";
import { RevealLab } from "./reveal-lab";

// The party reveal with made-up names: ?n=3..150 members, ?step=0 (before
// the start) .. n, or n+1 for after the finale, ?speed=0.2 for slow
// timelines. Not linked from anywhere,
// no database. For tuning, screenshots and scripts/perf/reveal-perf.mjs.
export const metadata: Metadata = {
  title: "Reveal lab · Monito Monita",
  robots: { index: false, follow: false },
};

export default function RevealLabPage() {
  return (
    <Suspense>
      <RevealLab />
    </Suspense>
  );
}
