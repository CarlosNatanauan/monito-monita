"use client";

import { Check } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { GroupStatus } from "@/server/db/schema";
import { drawNamesAction } from "./actions";

/**
 * Draw names / Names drawn / Redraw. Shows counts only, never pairs or who
 * has opened their slip.
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

  const errorBox = error && (
    <p role="alert" className="rounded-xl bg-destructive/8 px-4 py-3 text-caption font-semibold text-destructive">
      {error}
    </p>
  );

  if (status === "OPEN") {
    return (
      <div className="flex flex-col gap-3">
        {errorBox}
        {blockedReason && <p className="text-caption text-muted-foreground">{blockedReason}</p>}
        {!confirming ? (
          <Button type="button" size="lg" className="w-full" disabled={Boolean(blockedReason)} onClick={() => setConfirming(true)}>
            Draw names
          </Button>
        ) : (
          <div className="flex flex-col gap-3 rounded-xl bg-muted p-4" role="group" aria-label="Confirm draw">
            <p className="font-semibold">Pag na-draw na, sarado na ang sali. Sure na?</p>
            <p className="text-caption text-muted-foreground">Once names are drawn, joining closes.</p>
            <div className="flex gap-2">
              <Button type="button" disabled={pending} onClick={() => run("draw")}>
                {pending ? "Nagdi-draw…" : "Oo, i-draw na"}
              </Button>
              <Button type="button" variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>
                Huwag muna
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-title font-extrabold text-success">
        <Check className="size-6 shrink-0" aria-hidden />
        Names drawn
      </p>
      <p className="text-muted-foreground">
        {drawnCount} na ang may monito. Walang makakakita kung sino ang nakabunot kanino, kahit ikaw.
      </p>
      {status === "DRAWN" && slipsOpened.total > 0 && (
        <p className="font-semibold">
          {slipsOpened.opened} of {slipsOpened.total} have opened their slip
        </p>
      )}
      {errorBox}
      {status === "DRAWN" &&
        (!confirming ? (
          <Button type="button" variant="outline" className="self-start" onClick={() => setConfirming(true)}>
            Redraw
          </Button>
        ) : (
          <div className="flex flex-col gap-3 rounded-xl bg-destructive/8 p-4" role="group" aria-label="Confirm redraw">
            <p className="font-semibold text-destructive">Magbabago ang monito ng lahat.</p>
            <p className="text-caption">
              Everyone&apos;s monito will change. Kung may nakakita na ng monito nila, sabihan mo silang tingnan ulit.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="destructive" disabled={pending} onClick={() => run("redraw")}>
                {pending ? "Nagre-redraw…" : "Oo, i-redraw"}
              </Button>
              <Button type="button" variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>
                Huwag
              </Button>
            </div>
          </div>
        ))}
    </div>
  );
}
