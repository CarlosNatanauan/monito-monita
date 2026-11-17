"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";

/** How often an open, visible reveal screen checks for a new step. */
export const REVEAL_REFRESH_MS = 2000;

/** A refresh still pending after this long is treated as lost, so polling never stops for good. */
export const REVEAL_REFRESH_STALL_MS = 8000;

/**
 * Phone as remote: re-fetches the reveal screen every 2 seconds, so a
 * laptop on the projector follows when the organizer taps Next on their
 * phone. Only while this page is open and the tab is visible; a hidden
 * tab stops, and catches up right away when it's shown again.
 *
 * One steady interval for the life of the page (not restarted after each
 * refresh, which stretched the cadence to 2 s plus every refresh's own
 * time), and one refresh in flight at a time. If a refresh stays pending
 * (a slow network, or entangled with a Next/Previous action), the next
 * tick after REVEAL_REFRESH_STALL_MS starts a new one instead of waiting
 * forever.
 */
export function RevealAutoRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Mirrors `pending` for the interval (which outlives renders), and when
  // the latest refresh started, for the stall guard.
  const inFlight = useRef(false);
  const startedAt = useRef(0);

  useEffect(() => {
    inFlight.current = pending;
  }, [pending]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      if (inFlight.current && Date.now() - startedAt.current < REVEAL_REFRESH_STALL_MS) return;
      startedAt.current = Date.now();
      startTransition(() => router.refresh());
    };
    const timer = window.setInterval(refresh, REVEAL_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}
