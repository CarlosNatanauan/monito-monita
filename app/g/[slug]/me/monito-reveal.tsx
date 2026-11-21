"use client";

import { createContext, lazy, Suspense, useContext, useLayoutEffect, useRef, useState } from "react";
import { markSlipOpenedAction } from "./actions";

// The interactive slip, loaded only for a slip that is still folded (React's
// lazy, not next/dynamic: that one adds ~2.4 KB of its own to /me). The
// load never fails: if the connection drops before the chunk arrives, the
// folded slip from the server stays and it tries again once the signal is
// back (a rejected lazy would throw to the error page and take the whole
// page, wishlist included, with it).
type SlipModule = { default: typeof import("@/components/slip/bunutan-slip").BunutanSlip };
function loadSlip(): Promise<SlipModule> {
  return import("@/components/slip/bunutan-slip").then(
    (m) => ({ default: m.BunutanSlip }),
    () =>
      new Promise<SlipModule>((resolve) => {
        const retry = () => {
          window.removeEventListener("online", retry);
          loadSlip().then(resolve);
        };
        if (navigator.onLine === false) window.addEventListener("online", retry);
        else setTimeout(retry, 3000);
      }),
  );
}
const BunutanSlip = lazy(loadSlip);

interface RevealState {
  receiverName: string;
  alreadyOpened: boolean;
  opened: boolean;
  onOpened: () => void;
}

const RevealContext = createContext<RevealState | null>(null);

function useReveal(): RevealState {
  const state = useContext(RevealContext);
  if (!state) throw new Error("MonitoSlip and WhenOpened go inside MonitoReveal");
  return state;
}

/**
 * Your monito on /me. Holds whether the slip is open, so its parts can sit
 * in different columns: the slip (`MonitoSlip`, the sticky left column from
 * md) and what waits for it to open (`WhenOpened`: their wishlist, on the
 * right). First visit after the draw plays the full unfold; later visits
 * show the slip already open, and GSAP is never loaded.
 */
export function MonitoReveal({
  slug,
  receiverName,
  alreadyOpened,
  children,
}: {
  slug: string;
  receiverName: string;
  alreadyOpened: boolean;
  children: React.ReactNode;
}) {
  const [opened, setOpened] = useState(alreadyOpened);

  function onOpened() {
    setOpened(true);
    // Fire and forget: if it fails, they just see the unfold again next time.
    void markSlipOpenedAction({ slug });
  }

  return (
    <RevealContext value={{ receiverName, alreadyOpened, opened, onOpened }}>
      {children}
    </RevealContext>
  );
}

/**
 * The bunutan slip (signature moment #3). Opened on an earlier visit: the
 * server-rendered `openSlip` (OpenSlip), and no slip code at all. Still
 * folded: the interactive slip with the unfold, its code loaded on demand;
 * until it's in, `foldedSlip` (FoldedSlip, the same markup from the
 * server) shows. While the page hydrates React keeps the server HTML and
 * replays a tap on the slip once it's ready. Decided once, when the page
 * loads, so a refresh (after a wishlist change) never swaps one for the other.
 */
export function MonitoSlip({ openSlip, foldedSlip }: { openSlip: React.ReactNode; foldedSlip: React.ReactNode }) {
  const { receiverName, alreadyOpened, onOpened } = useReveal();
  const [startedOpen] = useState(alreadyOpened && openSlip != null);
  if (startedOpen) return openSlip;
  return (
    <Suspense fallback={foldedSlip}>
      <BunutanSlip name={receiverName} initiallyOpened={alreadyOpened} onOpened={onOpened} />
    </Suspense>
  );
}

/**
 * Shown once the slip is open; fades in right after the unfold (Web
 * Animations, transform and opacity; a plain cross-fade with reduced motion).
 */
export function WhenOpened({ children }: { children: React.ReactNode }) {
  const { alreadyOpened, opened } = useReveal();
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!opened || alreadyOpened) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ref.current?.animate(
      reduced
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [
            { opacity: 0, transform: "translateY(12px)" },
            { opacity: 1, transform: "none" },
          ],
      { duration: reduced ? 150 : 400, delay: reduced ? 0 : 100, easing: "ease-out", fill: "backwards" },
    );
  }, [opened, alreadyOpened]);
  if (!opened) return null;
  return (
    <div ref={ref} className="w-full">
      {children}
    </div>
  );
}
