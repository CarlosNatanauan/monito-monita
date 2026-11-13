"use client";

import { Check } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <section aria-label="Mag-set ng PIN">
      <Card className="ring-2 ring-margarine">
        <CardHeader>
          <CardTitle>{saved ? "Na-save ang PIN mo!" : "Mag-set ng PIN"}</CardTitle>
          <p className="text-small text-ube-soft">
            {saved
              ? "Sa ibang phone o browser: buksan ang share link, i-tap ang “Kasali ka na? Bumalik dito”, at ilagay ang pangalan at PIN mo."
              : "Para makabalik ka kahit sa ibang phone, gamit ang pangalan mo at 4-digit PIN."}
          </p>
        </CardHeader>
        {!saved ? (
          <CardContent>
            <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
              <PinField
                id="set-pin"
                label="PIN (4 digits)"
                autoComplete="new-password"
                invalid={Boolean(error)}
                describedBy={error ? "set-pin-error" : undefined}
                onChange={() => setError(null)}
              />
              {error && (
                <p id="set-pin-error" role="alert" className="text-small font-semibold text-sili">
                  {error}
                </p>
              )}
              <Button type="submit" className="self-start" disabled={pending}>
                {pending ? "Sine-save…" : "I-save ang PIN"}
              </Button>
            </form>
          </CardContent>
        ) : (
          <CardContent>
            <p className="flex items-center gap-2 font-semibold text-dahon">
              <Check className="size-5" aria-hidden /> Tapos na.
            </p>
          </CardContent>
        )}
      </Card>
    </section>
  );
}
