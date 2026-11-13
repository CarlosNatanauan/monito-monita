"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

/** How often an open, visible reveal screen checks for a new step. */
export const REVEAL_REFRESH_MS = 2000;

/**
 * Phone as remote: re-fetches the reveal screen every 2 seconds, so a
 * laptop on the projector follows when the organizer taps Next on their
 * phone. Only while this page is open and the tab is visible; a hidden
 * tab stops, and catches up right away when it's shown again. A refresh
 * never starts while the previous one is still loading.
 */
export function RevealAutoRefresh() {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible" || refreshing) return;
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
  }, [router, refreshing]);

  return null;
}
