import { ViewTransition } from "react";

/**
 * A soft page change (docs/DESIGN.md, "In-between states"): navigating
 * between pages fades the old page out (120ms) and the new one in, rising
 * 8px (200ms), with the browser's View Transitions where supported
 * (elsewhere pages just swap). Only on navigation: `default="none"` keeps
 * refreshes, Server Action results and streamed content from animating.
 *
 * Never on the signature moments: the reveal page has no transition (its
 * 2-second refresh and its timelines stay untouched), the bowl and the
 * slip unfold play inside a page, and the join drop has finished before
 * /me comes in. The light string sits outside it, so it stays lit and
 * still across the change. Reduced motion: no animation (globals.css).
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      {children}
    </ViewTransition>
  );
}
