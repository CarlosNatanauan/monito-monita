"use client";

import { LazyMotion, MotionConfig, m } from "motion/react";
import { createContext, useContext, useState } from "react";
import { BunutanSlip } from "@/components/slip/bunutan-slip";
import { markSlipOpenedAction } from "./actions";

const loadMotionFeatures = () => import("@/lib/motion-features").then((mod) => mod.default);

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
      <LazyMotion features={loadMotionFeatures} strict>
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </LazyMotion>
    </RevealContext>
  );
}

/** The bunutan slip (signature moment #3). */
export function MonitoSlip() {
  const { receiverName, alreadyOpened, onOpened } = useReveal();
  return <BunutanSlip name={receiverName} initiallyOpened={alreadyOpened} onOpened={onOpened} />;
}

/** Shown once the slip is open; fades in right after the unfold. */
export function WhenOpened({ children }: { children: React.ReactNode }) {
  const { alreadyOpened, opened } = useReveal();
  if (!opened) return null;
  return (
    <m.div
      className="w-full"
      initial={alreadyOpened ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
    >
      {children}
    </m.div>
  );
}
