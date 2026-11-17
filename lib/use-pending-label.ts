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
  return pending ? (offline ? WAITING_FOR_SIGNAL : busy) : idle;
}
