"use client";

import { Check } from "lucide-react";
import { useState, useTransition } from "react";
import { Lights, openedStates } from "@/components/lights";
import { Button } from "@/components/ui/button";
import { CardDescription, Inset } from "@/components/ui/card";
import { ErrorMessage } from "@/components/ui/error-message";
import type { GroupStatus } from "@/server/db/schema";
import { drawNamesAction } from "./actions";

/**
 * Draw names / Names drawn / Redraw. Shows counts only, never pairs.
 * After the draw, one bulb per slip: on = opened, off = not yet.
 */
export function DrawSection({
  slug,
  status,
  drawnCount,
  slipsOpened,
  blockedReason,
}: {
  slug: string;
  status: GroupStatus;
  drawnCount: number;
  /** How many have unfolded their slip, out of everyone with a monito. */
  slipsOpened: { opened: number; total: number };
  /** Why drawing isn't possible right now (too few members, impossible exclusions). */
  blockedReason: string | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (mode: "draw" | "redraw") => {
    setError(null);
    startTransition(async () => {
      const result = await drawNamesAction({ slug, mode });
      if (result.ok) setConfirming(false);
      else setError(result.message);
    });
  };

  if (status === "OPEN") {
    return (
      <div className="flex flex-col gap-4">
        <CardDescription>
          Kapag na-draw na, sarado na ang pagsali. Walang makakakita ng resulta, kahit ikaw.
        </CardDescription>
        <ErrorMessage>{error}</ErrorMessage>
        {!confirming ? (
          <>
            <Button type="button" className="w-full" disabled={Boolean(blockedReason)} onClick={() => setConfirming(true)}>
              Draw names
            </Button>
            {blockedReason && <p className="text-small font-medium text-ube-soft">{blockedReason}</p>}
          </>
        ) : (
          <Inset className="flex flex-col gap-3" role="group" aria-label="Confirm draw">
            <p className="font-bold">Pag na-draw na, sarado na ang sali. Sure na?</p>
            <p className="text-small font-medium text-ube-soft">Once names are drawn, joining closes.</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={pending} onClick={() => run("draw")}>
                {pending ? "Nagdi-draw…" : "Oo, i-draw na"}
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => setConfirming(false)}>
                Huwag muna
              </Button>
            </div>
          </Inset>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 data-slot="card-title" className="flex items-center gap-3 text-dahon">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-dahon text-white">
          <Check className="size-5" strokeWidth={3} aria-hidden />
        </span>
        <span className="font-display text-heading">Names drawn</span>
      </h2>
      <p>{drawnCount} na ang may monito. Walang makakakita kung sino ang nakabunot kanino, kahit ikaw.</p>
      {status === "DRAWN" && slipsOpened.total > 0 && (
        <Lights
          states={openedStates(slipsOpened.opened, slipsOpened.total)}
          label={
            <p className="font-bold">
              {slipsOpened.opened} of {slipsOpened.total} have opened their slip
            </p>
          }
        />
      )}
      <ErrorMessage>{error}</ErrorMessage>
      {status === "DRAWN" &&
        (!confirming ? (
          <Button type="button" variant="secondary" size="sm" className="self-start px-8" onClick={() => setConfirming(true)}>
            Redraw
          </Button>
        ) : (
          <Inset className="flex flex-col gap-3" role="group" aria-label="Confirm redraw">
            <p className="font-bold">Magbabago ang monito ng lahat.</p>
            <p className="text-small font-medium">
              Everyone&apos;s monito will change. Kung may nakakita na ng monito nila, sabihan mo silang tingnan ulit.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => run("redraw")}>
                {pending ? "Nagre-redraw…" : "Oo, i-redraw"}
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => setConfirming(false)}>
                Huwag
              </Button>
            </div>
          </Inset>
        ))}
    </div>
  );
}
