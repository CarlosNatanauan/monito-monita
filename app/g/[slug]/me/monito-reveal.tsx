"use client";

import { LazyMotion, MotionConfig, m } from "motion/react";
import { useState } from "react";
import { BunutanSlip } from "@/components/slip/bunutan-slip";
import { markSlipOpenedAction } from "./actions";

const loadMotionFeatures = () => import("@/lib/motion-features").then((mod) => mod.default);

/**
 * Your monito on /me: the bunutan slip, your codename, then their wishlist (children)
 * once it's open. First visit after the draw plays the full unfold; later
 * visits show the slip already open, and GSAP is never loaded.
 */
export function MonitoReveal({
  slug,
  receiverName,
  alreadyOpened,
  codename,
  children,
}: {
  slug: string;
  receiverName: string;
  alreadyOpened: boolean;
  /** "Codename mo: …", right under the slip. */
  codename: React.ReactNode;
  children: React.ReactNode;
}) {
  const [opened, setOpened] = useState(alreadyOpened);

  function handleOpened() {
    setOpened(true);
    // Fire and forget: if it fails, they just see the unfold again next time.
    void markSlipOpenedAction({ slug });
  }

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user">
        <BunutanSlip name={receiverName} initiallyOpened={alreadyOpened} onOpened={handleOpened} />
        {codename}
        {opened && (
          <m.div
            className="w-full"
            initial={alreadyOpened ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
          >
            {children}
          </m.div>
        )}
      </MotionConfig>
    </LazyMotion>
  );
}
