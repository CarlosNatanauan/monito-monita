"use client";

import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useActionState, useRef, useState, useTransition } from "react";
import { GOLD_BUTTON, NIGHT_BUTTON, useRevealKeys } from "@/components/reveal/controls";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { moveRevealFormAction, startRevealAction } from "./actions";

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
    <div className="flex flex-col gap-3 landscape:max-w-[min(560px,40vw)] landscape:items-end">
      <ErrorMessage>{error}</ErrorMessage>
      {!confirming ? (
        <Button type="button" className={GOLD_BUTTON} onClick={() => setConfirming(true)}>
          Start the reveal
        </Button>
      ) : (
        <div className="flex flex-col gap-3 rounded-3xl bg-gabi-leaf p-5" role="group" aria-label="Confirm reveal">
          <p className="font-bold text-gabi-mist landscape:text-[clamp(16px,2.2vh,24px)]">
            Pag sinimulan na, hindi na puwedeng mag-redraw o magtanggal ng member. Go?
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className={GOLD_BUTTON} disabled={pending} onClick={start}>
              {pending ? "Sandali…" : "Oo, simulan na"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-[58px] px-5 text-gabi-mist landscape:text-[clamp(16px,2.2vh,24px)]"
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
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
 * so a double tap or a second device can't skip a pair. Space and the
 * arrow keys work too. On the last pair, Next lights the parol.
 */
export function RevealControls({ slug, step, total }: { slug: string; step: number; total: number }) {
  const [state, formAction, pending] = useActionState(moveRevealFormAction, { error: null });
  const formRef = useRef<HTMLFormElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const previousRef = useRef<HTMLButtonElement>(null);
  const last = step >= total;

  const press = (button: HTMLButtonElement | null) => {
    if (button && !button.disabled) formRef.current?.requestSubmit(button);
  };
  useRevealKeys(
    () => press(nextRef.current),
    () => press(previousRef.current),
  );

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3 landscape:items-end">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="fromStep" value={step} />
      <ErrorMessage>{state.error}</ErrorMessage>
      <div className="flex gap-3">
        <Button
          ref={previousRef}
          type="submit"
          name="move"
          value="previous"
          variant="secondary"
          className={`flex-1 ${NIGHT_BUTTON}`}
          disabled={pending || step <= 1}
        >
          <ChevronLeft aria-hidden />
          Previous
        </Button>
        <Button
          ref={nextRef}
          type="submit"
          name="move"
          value="next"
          className={`flex-[2] ${GOLD_BUTTON}`}
          disabled={pending}
        >
          {last ? (
            <>
              <Sparkles aria-hidden />
              Ilawan ang parol
            </>
          ) : (
            <>
              Next
              <ChevronRight aria-hidden />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
