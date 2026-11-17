"use client";

import { usePendingLabel } from "@/lib/use-pending-label";
import { useState, useTransition, type ReactNode } from "react";
import { Lights, openedStates } from "@/components/lights";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { Capiz, DoneTitle, SectionTitle } from "@/components/ui/paper";
import type { GroupStatus } from "@/server/db/schema";
import { drawNamesAction } from "./actions";

/** A confirm step: plain paper with an ube edge, under the button it replaces. */
export function ConfirmBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2.5 self-stretch rounded-paper border-[1.5px] border-ube bg-papel p-4">
      {children}
    </div>
  );
}

/**
 * Draw names / Names drawn / Redraw. Shows counts only, never pairs.
 * After the draw: the "Names drawn" capiz card, then one bulb per slip
 * (on = opened, off = not yet). `announce` (right after the draw) goes in
 * the card and the slip count moves under it (docs/design/13 and 14).
 */
export function DrawSection({
  slug,
  status,
  drawnCount,
  slipsOpened,
  blockedReason,
  announce,
}: {
  slug: string;
  status: GroupStatus;
  drawnCount: number;
  /** How many have unfolded their slip, out of everyone with a monito. */
  slipsOpened: { opened: number; total: number };
  /** Why drawing isn't possible right now (too few members, impossible exclusions). */
  blockedReason: string | null;
  /** The GC announcement, inside the card right after the draw. */
  announce?: ReactNode;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const drawLabel = usePendingLabel(pending, "Oo, i-draw na", "Nagbubunot…");
  const redrawLabel = usePendingLabel(pending, "Oo, i-redraw", "Nagbubunot ulit…");

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
      <section aria-labelledby="draw-title" className="flex flex-col gap-2.5">
        <SectionTitle id="draw-title">Bunutan</SectionTitle>
        <p className="text-small lg:text-body">Kapag na-draw na, sarado na ang pagsali. Walang makakakita ng resulta, kahit ikaw.</p>
        <ErrorMessage>{error}</ErrorMessage>
        {!confirming ? (
          <div className="mt-2 flex flex-col gap-2">
            <Button type="button" className="w-full lg:w-fit" disabled={Boolean(blockedReason)} onClick={() => setConfirming(true)}>
              Draw names
            </Button>
            {blockedReason && <p className="text-small text-ube-soft">{blockedReason}</p>}
          </div>
        ) : (
          <ConfirmBox label="Confirm draw">
            <p className="font-bold">Pag na-draw na, sarado na ang sali. Sure na?</p>
            <p className="text-small text-ube-soft">Once names are drawn, joining closes.</p>
            <div className="flex flex-wrap gap-2.5">
              <Button type="button" disabled={pending} onClick={() => run("draw")}>
                {drawLabel}
              </Button>
              <Button type="button" variant="secondary" disabled={pending} onClick={() => setConfirming(false)}>
                Huwag muna
              </Button>
            </div>
          </ConfirmBox>
        )}
      </section>
    );
  }

  const progress = (
    <>
      {status === "DRAWN" && slipsOpened.total > 0 && (
        <Lights
          plan={openedStates(slipsOpened.opened, slipsOpened.total)}
          label={
            <p className="font-bold lg:text-[19px]">
              {slipsOpened.opened} of {slipsOpened.total} have opened their slip
            </p>
          }
        />
      )}
      <ErrorMessage>{error}</ErrorMessage>
      {status === "DRAWN" &&
        (!confirming ? (
          <Button type="button" variant="secondary" className="self-start px-8" onClick={() => setConfirming(true)}>
            Redraw
          </Button>
        ) : (
          <ConfirmBox label="Confirm redraw">
            <p className="font-bold">Magbabago ang monito ng lahat.</p>
            <p className="text-small">
              Everyone&apos;s monito will change. Kung may nakakita na ng monito nila, sabihan mo silang tingnan ulit.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <Button type="button" variant="secondary" disabled={pending} onClick={() => run("redraw")}>
                {redrawLabel}
              </Button>
              <Button type="button" variant="link" disabled={pending} onClick={() => setConfirming(false)}>
                Huwag
              </Button>
            </div>
          </ConfirmBox>
        ))}
    </>
  );

  return (
    <>
      <Capiz aria-label="Names drawn">
        <DoneTitle>Names drawn</DoneTitle>
        <p className="text-small lg:text-body">
          {drawnCount} na ang may monito. Walang makakakita kung sino ang nakabunot kanino, kahit ikaw.
        </p>
        {announce ?? progress}
      </Capiz>
      {announce && <div className="flex flex-col gap-[18px] lg:gap-[22px]">{progress}</div>}
    </>
  );
}
