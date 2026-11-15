"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { CheckIcon } from "@/components/ui/icons";
import { Capiz, SectionTitle } from "@/components/ui/paper";
import { PinField } from "../pin-field";
import { setPinAction } from "./actions";

/**
 * One-time "Mag-set ng PIN" for members without one (joined before PINs,
 * or the organizer reset it). Gone on the next visit once it's set.
 */
export function SetPinCard({ slug }: { slug: string }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const pin = String(new FormData(event.currentTarget).get("pin") ?? "");
    setError(null);
    startTransition(async () => {
      const result = await setPinAction({ slug, pin });
      if (result.ok) setSaved(true);
      else setError(result.message);
    });
  };

  return (
    <Capiz aria-label="Mag-set ng PIN">
      <SectionTitle>{saved ? "Na-save ang PIN mo!" : "Mag-set ng PIN"}</SectionTitle>
      <p className="text-ube-soft">
        {saved
          ? "Sa ibang phone o browser: buksan ang share link, i-tap ang “Kasali ka na? Bumalik dito”, at ilagay ang pangalan at PIN mo."
          : "Para makabalik ka kahit sa ibang phone, gamit ang pangalan mo at 4-digit PIN."}
      </p>
      {!saved ? (
        <form onSubmit={submit} className="flex flex-col gap-2.5 self-stretch" noValidate>
          <PinField
            id="set-pin"
            label="4-digit PIN"
            autoComplete="new-password"
            invalid={Boolean(error)}
            describedBy={error ? "set-pin-error" : undefined}
            onChange={() => setError(null)}
          />
          {error && <ErrorMessage id="set-pin-error">{error}</ErrorMessage>}
          <Button type="submit" variant="secondary" className="self-start" disabled={pending}>
            {pending ? "Sine-save…" : "I-save ang PIN"}
          </Button>
        </form>
      ) : (
        <p className="flex items-center gap-2 font-bold text-dahon">
          <CheckIcon /> Tapos na.
        </p>
      )}
    </Capiz>
  );
}
