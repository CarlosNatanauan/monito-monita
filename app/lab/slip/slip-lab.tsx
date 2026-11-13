"use client";

import { useReducedMotion } from "motion/react";
import { useState } from "react";
import { BunutanSlip } from "@/components/slip/bunutan-slip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const systemReduced = useReducedMotion() ?? false;
  const reducedOn = reduced ?? systemReduced;

  function replay() {
    setOpened(false);
    setRun((n) => n + 1);
  }

  return (
    <>
      <header className="flex flex-col gap-2">
        <p className="text-small font-semibold text-ube-soft">Christmas Party 2026</p>
        <h1 className="text-heading">Hi, Carlo!</h1>
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

      <Card>
        <CardHeader>
          <CardTitle>Prototype controls</CardTitle>
          <p className="text-small text-ube-soft">
            {duration
              ? `Full run: ${duration.toFixed(2)}s at 1×, ${(duration / speed).toFixed(2)}s at ${speed.toFixed(2)}×`
              : "Tap the slip to measure the run."}
            {opened ? " · Opened" : ""}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Button onClick={replay} variant="secondary" className="self-start">
            Replay
          </Button>

          <label className="flex flex-col gap-2">
            <span className="text-small font-semibold">Speed: {speed.toFixed(2)}×</span>
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
            <span className="text-small font-semibold">
              Reduced motion {reduced === undefined ? "(following your phone)" : "(overridden)"}
            </span>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-small font-semibold">Name on the slip</span>
            <Input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          </label>
        </CardContent>
      </Card>
    </>
  );
}
