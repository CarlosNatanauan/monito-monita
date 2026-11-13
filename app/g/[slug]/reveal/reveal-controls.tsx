"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { moveRevealFormAction, startRevealAction } from "./actions";

function ErrorBox({ message }: { message: string | null }) {
  return <ErrorMessage>{message}</ErrorMessage>;
}

// On the dark reveal screen: margarine fill with dark ube text (9.8:1), and
// a light outline for the quieter button.
const GOLD_BUTTON = "bg-margarine text-ube-night disabled:bg-gabi-leaf disabled:text-gabi-mist";
const NIGHT_BUTTON = "border-gabi-mist bg-transparent text-gabi-mist disabled:border-gabi-leaf disabled:bg-transparent disabled:text-gabi-line";

/** "Start the reveal", with a confirm (redraws and removals lock after). */
export function StartReveal({ slug }: { slug: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const start = () => {
    setError(null);
    startTransition(async () => {
      const result = await startRevealAction({ slug });
      if (!result.ok) setError(result.message);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <ErrorBox message={error} />
      {!confirming ? (
        <Button type="button" className={`self-start ${GOLD_BUTTON}`} onClick={() => setConfirming(true)}>
          Start the reveal
        </Button>
      ) : (
        <div className="flex flex-col gap-3 rounded-3xl bg-gabi-leaf p-5" role="group" aria-label="Confirm reveal">
          <p className="font-bold text-gabi-mist">Pag sinimulan na, hindi na puwedeng mag-redraw o magtanggal ng member. Go?</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" className={GOLD_BUTTON} disabled={pending} onClick={start}>
              {pending ? "Sandali…" : "Oo, simulan na"}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="text-gabi-mist" disabled={pending} onClick={() => setConfirming(false)}>
              Huwag muna
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Previous / Next, as a real form: a tap before the page hydrates (slow
 * projector laptop) still goes through. Sends the step this screen shows,
 * so a double tap or a second device can't skip a pair. Arrow keys work
 * too.
 */
export function RevealControls({ slug, step, total }: { slug: string; step: number; total: number }) {
  const [state, formAction, pending] = useActionState(moveRevealFormAction, { error: null });
  const formRef = useRef<HTMLFormElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const previousRef = useRef<HTMLButtonElement>(null);
  const last = step >= total;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const button =
        event.key === "ArrowRight" ? nextRef.current : event.key === "ArrowLeft" ? previousRef.current : null;
      if (button && !button.disabled) formRef.current?.requestSubmit(button);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="fromStep" value={step} />
      <ErrorBox message={state.error} />
      <div className="flex justify-center gap-3">
        <Button
          ref={previousRef}
          type="submit"
          name="move"
          value="previous"
          variant="secondary"
          className={`h-[58px] ${NIGHT_BUTTON}`}
          disabled={pending || step <= 1}
        >
          Previous
        </Button>
        <Button ref={nextRef} type="submit" name="move" value="next" className={GOLD_BUTTON} disabled={pending}>
          {last ? "Tapusin ang reveal" : "Next"}
        </Button>
      </div>
    </form>
  );
}
