"use client";

import { createContext, useContext, useLayoutEffect, useRef, useState } from "react";
import { BunutanSlip } from "@/components/slip/bunutan-slip";
import { markSlipOpenedAction } from "./actions";

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

/** The bunutan slip (signature moment #3). */
export function MonitoSlip() {
  const { receiverName, alreadyOpened, onOpened } = useReveal();
  return <BunutanSlip name={receiverName} initiallyOpened={alreadyOpened} onOpened={onOpened} />;
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
