"use client";

import { ChevronLeft, ChevronRight, RotateCcw, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { GOLD_BUTTON, NIGHT_BUTTON, useRevealKeys } from "@/components/reveal/controls";
import { RevealScreen, type ScreenData } from "@/components/reveal/reveal-screen";
import { Button } from "@/components/ui/button";
import { CODENAMES } from "@/server/codenames";
import { revealSlipsAt, type LoopPair } from "@/server/reveal-window";

// Made-up members (the mockup's names first). Not real people.
const NAMES = [
  "Joy", "Marco", "Carlo", "Bea", "Paolo", "Tita Luz", "Jun", "Aira", "Kuya Ben", "Inday", "Lola Nena", "Mang Jun",
  "Bianca", "Ninang Cora", "Tito Boy", "Rafa", "Migs", "Trina", "Ate Grace", "Nonoy", "Pia", "Enzo", "Kaye", "Dodong",
  "Maria Clara Dela Cruz", "Gab", "Ica", "Josh", "Tess", "Bong",
];

function loop(n: number): LoopPair[] {
  const name = (i: number) => (i < NAMES.length ? NAMES[i] : `${NAMES[i % NAMES.length]} ${Math.floor(i / NAMES.length) + 1}`);
  const code = (i: number) => (i < CODENAMES.length ? CODENAMES[i] : `${CODENAMES[i % CODENAMES.length]} ${Math.floor(i / CODENAMES.length) + 1}`);
  return Array.from({ length: n }, (_, i) => ({ giverCodename: code(i), giverName: name(i), receiverName: name((i + 1) % n) }));
}

const int = (value: string | null, fallback: number) => {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
};

/** The reveal screen with local Next / Previous instead of the server. */
export function RevealLab() {
  const params = useSearchParams();
  const total = Math.min(150, Math.max(3, int(params.get("n"), 12)));
  const pairs = loop(total);
  const [step, setStep] = useState(() => Math.min(total + 1, Math.max(0, int(params.get("step"), 0))));

  const next = () => setStep((s) => Math.min(total + 1, s + 1));
  const previous = () => setStep((s) => (s > 1 && s <= total ? s - 1 : s));
  useRevealKeys(
    () => step >= 1 && step <= total && next(),
    previous,
  );

  const groupName = "Barkada Christmas 2026";
  const data: ScreenData =
    step === 0
      ? { status: "DRAWN", groupName, total }
      : step > total
        ? { status: "REVEALED", groupName, total, pairs }
        : { status: "REVEALING", groupName, step, total, pair: pairs[step - 1], slips: revealSlipsAt(pairs, step) };

  const controls =
    step === 0 ? (
      <Button type="button" className={GOLD_BUTTON} onClick={next}>
        Start the reveal
      </Button>
    ) : step > total ? (
      <Button type="button" variant="secondary" className={NIGHT_BUTTON} onClick={() => setStep(0)}>
        <RotateCcw aria-hidden /> Ulitin
      </Button>
    ) : (
      <div className="flex gap-3">
        <Button type="button" variant="secondary" className={`flex-1 ${NIGHT_BUTTON}`} disabled={step <= 1} onClick={previous}>
          <ChevronLeft aria-hidden /> Previous
        </Button>
        <Button type="button" className={`flex-[2] ${GOLD_BUTTON}`} onClick={next}>
          {step === total ? (
            <>
              <Sparkles aria-hidden /> Ilawan ang parol
            </>
          ) : (
            <>
              Next <ChevronRight aria-hidden />
            </>
          )}
        </Button>
      </div>
    );

  const speed = Math.min(2, Math.max(0.05, Number(params.get("speed") ?? 1) || 1));
  return <RevealScreen data={data} backHref="/" controls={controls} speed={speed} />;
}
