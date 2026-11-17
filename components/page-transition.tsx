import { ViewTransition } from "react";

/**
 * A soft page change (docs/DESIGN.md, "In-between states"): navigating
 * between pages fades the old page out (120ms) and the new one in, rising
 * 8px (200ms), with the browser's View Transitions where supported
 * (elsewhere pages just swap). Only on navigation: `default="none"` keeps
 * refreshes, Server Action results and streamed content from animating.
 *
 * Used on the landing, /demo, /new, the organizer page and the 404. Never
 * on the signature moments: not on the reveal (its 2-second refresh and
 * timelines stay untouched), and not on the join page or /me, which the
 * join drop hands off between and where the slip unfolds. (React starts a
 * view transition whenever one of these mounts, and snapshotting the drop's
 * 3D slip crashed WebKit in testing.) The light string sits outside it, so
 * it stays lit and still across the change. Reduced motion: no animation
 * (globals.css).
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      {children}
    </ViewTransition>
  );
}
