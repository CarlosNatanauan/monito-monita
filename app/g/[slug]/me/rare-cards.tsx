"use client";

import { lazy, Suspense, useSyncExternalStore } from "react";

/*
 * Things on /me that most visits never show, loaded on their own so they
 * stay out of /me's first load (150 KB JS budget):
 *
 * - the clean-up of ?welcome=1 right after joining (no UI);
 * - "Mag-set ng PIN" (only members from before PINs, or after the
 *   organizer reset theirs), the "switch member?" question (someone opened
 *   another member's link on this device) and "Na-update ang monito mo"
 *   (one giver, after a removal).
 *
 * The cards render only after hydration, once their code is in: a card
 * that showed from the server HTML before its code loaded could be tapped
 * while it doesn't work yet (and a PIN form would post as a plain GET).
 * Each one appears a moment after the page, where it belongs.
 */
const LazyCleanWelcome = lazy(() => import("./clean-welcome").then((m) => ({ default: m.CleanWelcomeParam })));
const LazySetPin = lazy(() => import("./set-pin-card").then((m) => ({ default: m.SetPinCard })));
const LazySwitch = lazy(() => import("./switch-confirm").then((m) => ({ default: m.SwitchConfirm })));
const LazyUpdated = lazy(() => import("./monito-updated").then((m) => ({ default: m.MonitoUpdatedNotice })));

const noopSubscribe = () => () => {};

/** Renders `children` only in the browser, after hydration. */
function AfterHydration({ children }: { children: React.ReactNode }) {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return hydrated ? <Suspense fallback={null}>{children}</Suspense> : null;
}

export function CleanWelcomeParam() {
  return (
    <AfterHydration>
      <LazyCleanWelcome />
    </AfterHydration>
  );
}

export function SetPinCard(props: { slug: string }) {
  return (
    <AfterHydration>
      <LazySetPin {...props} />
    </AfterHydration>
  );
}

export function SwitchConfirm(props: { slug: string; current: string; other: string }) {
  return (
    <AfterHydration>
      <LazySwitch {...props} />
    </AfterHydration>
  );
}

export function MonitoUpdatedNotice(props: { slug: string }) {
  return (
    <AfterHydration>
      <LazyUpdated {...props} />
    </AfterHydration>
  );
}
