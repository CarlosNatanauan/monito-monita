"use client";

import { useState } from "react";
import { BunutanSlip } from "@/components/slip/bunutan-slip";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { Button } from "@/components/ui/button";
import { Capiz, SectionTitle } from "@/components/ui/paper";
import { Input } from "@/components/ui/input";

type Timeline = { duration: () => number };

declare global {
  interface Window {
    /** For the frame-rate check script only. */
    __slipTimeline?: Timeline;
  }
}

export function SlipLab() {
  const [run, setRun] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [reduced, setReduced] = useState<boolean | undefined>(undefined);
  const [name, setName] = useState("Ate Joy");
  const [duration, setDuration] = useState<number | null>(null);
  const [opened, setOpened] = useState(false);

  const systemReduced = usePrefersReducedMotion();
  const reducedOn = reduced ?? systemReduced;

  function replay() {
    setOpened(false);
    setRun((n) => n + 1);
  }

  return (
    <>
      <header className="flex flex-col gap-2 pb-3">
        <h1 className="font-head text-display">Hi, <span className="nm">Carlo</span>!</h1>
        <p className="text-ube-soft">Christmas Party 2026</p>
      </header>

      <BunutanSlip
        key={`${run}-${String(reduced)}-${name}`}
        name={name || "Ate Joy"}
        speed={speed}
        reducedMotion={reduced}
        onOpened={() => setOpened(true)}
        onTimeline={(tl) => {
          window.__slipTimeline = tl;
          setDuration(tl.duration());
        }}
      />

      <Capiz>
        <div className="flex flex-col gap-1">
          <SectionTitle>Prototype controls</SectionTitle>
          <p className="text-small text-ube-soft">
            {duration
              ? `Full run: ${duration.toFixed(2)}s at 1×, ${(duration / speed).toFixed(2)}s at ${speed.toFixed(2)}×`
              : "Tap the slip to measure the run."}
            {opened ? " · Opened" : ""}
          </p>
        </div>
        <div className="flex flex-col gap-5">
          <Button onClick={replay} variant="secondary" className="self-start">
            Replay
          </Button>

          <label className="flex flex-col gap-2">
            <span className="text-small font-bold">Speed: {speed.toFixed(2)}×</span>
            <input
              type="range"
              min={0.25}
              max={2}
              step={0.05}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="accent-ube"
            />
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={reducedOn}
              onChange={(e) => setReduced(e.target.checked)}
              className="size-5 accent-ube"
            />
            <span className="text-small font-bold">
              Reduced motion {reduced === undefined ? "(following your phone)" : "(overridden)"}
            </span>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-small font-bold">Name on the slip</span>
            <Input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          </label>
        </div>
      </Capiz>
    </>
  );
}
