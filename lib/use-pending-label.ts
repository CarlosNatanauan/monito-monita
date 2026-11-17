import { useOffline } from "next/offline";

/** What a pending button says while the connection is down (the action runs once it's back). */
export const WAITING_FOR_SIGNAL = "Hinihintay ang signal…";

/**
 * A button's label: `idle`, `busy` while its action runs ("Sumasali…",
 * "Nagbubunot…", "Sine-save…"), or "Hinihintay ang signal…" when that
 * action is waiting for the connection (experimental.useOffline keeps it
 * pending and sends it again once online). Pair with `disabled={pending}`
 * so nobody submits twice.
 */
export function usePendingLabel(pending: boolean, idle: string, busy: string): string {
  const offline = useOffline();
  if (!pending) return idle;
  // Next sets its offline state in a transition, which can wait behind the
  // very action that's pending; the browser's own flag is read right away.
  const browserOffline = typeof navigator !== "undefined" && typeof window !== "undefined" && navigator.onLine === false;
  return offline || browserOffline ? WAITING_FOR_SIGNAL : busy;
}
