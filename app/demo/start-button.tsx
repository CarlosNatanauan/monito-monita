"use client";

import { useFormStatus } from "react-dom";
import { Art } from "@/components/art/symbols";
import { Bilao, BowlBack, BowlFront } from "@/components/bowl/bowl-art";
import { Button } from "@/components/ui/button";
import { usePendingLabel, WAITING_FOR_SIGNAL } from "@/lib/use-pending-label";

/** Three slips, each dropping in from its own side. */
const SLIPS = [
  { left: "calc(50% - 46px)", dx: "-38px", r0: "-24deg", r1: "-8deg", delay: "0s" },
  { left: "calc(50% - 6px)", dx: "34px", r0: "28deg", r1: "6deg", delay: "0.45s" },
  { left: "calc(50% - 26px)", dx: "-6px", r0: "-12deg", r1: "-2deg", delay: "0.9s" },
];

/**
 * "Simulan ang demo", disabled with a pending label while the demo group
 * is built (a second or two), and over the page "Inihahanda ang demo
 * group…": the evening sky with the bowl, slips dropping in one after
 * another, like the join drop's card. Transforms and opacity only, CSS
 * keyframes; reduced motion: the slips just rest in the bowl.
 */
export function StartDemoButton() {
  const { pending } = useFormStatus();
  const label = usePendingLabel(pending, "Simulan ang demo", "Inihahanda ang demo group…");
  return (
    <>
      <Button type="submit" className="w-full" disabled={pending}>
        {label}
      </Button>
      {pending && <DemoPreparing waiting={label === WAITING_FOR_SIGNAL} />}
    </>
  );
}

function DemoPreparing({ waiting }: { waiting: boolean }) {
  return (
    <div data-demo-preparing className="fixed inset-0 z-40 flex items-center justify-center bg-takipsilim px-5 pb-10">
      <div className="sky relative h-[400px] w-full max-w-[440px] overflow-hidden rounded-sky [--rx:82%] [--ry:14%]">
        <Art name="parol" className="pointer-events-none absolute top-0 right-2.5 h-[119px] w-[84px]" />
        <div role="status" className="absolute top-6 left-[18px] max-w-[250px]">
          <p className="font-head text-[28px] leading-[1.15]">Inihahanda ang demo group…</p>
          <p className="mt-2 text-small text-gabi-text">{waiting ? WAITING_FOR_SIGNAL : "Naglalagay ng 9 na slip sa bowl."}</p>
        </div>
        <Bilao className="pointer-events-none absolute top-[338px] left-[calc(50%-118px)] h-[49px] w-[236px]" />
        <div className="pointer-events-none absolute top-[210px] left-[calc(50%-98px)] h-[147px] w-[196px]">
          <BowlBack className="absolute inset-0 size-full" />
        </div>
        {SLIPS.map((s) => (
          <span
            key={s.delay}
            aria-hidden
            className="demo-slip absolute top-[232px] h-[24px] w-[52px]"
            style={{ left: s.left, "--dx": s.dx, "--r0": s.r0, "--r1": s.r1, animationDelay: s.delay } as React.CSSProperties}
          />
        ))}
        <div className="pointer-events-none absolute top-[210px] left-[calc(50%-98px)] h-[147px] w-[196px]">
          <BowlFront className="absolute inset-0 size-full" />
        </div>
      </div>
    </div>
  );
}
