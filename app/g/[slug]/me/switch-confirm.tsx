"use client";

import { useTransition } from "react";
import { Name } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Capiz, SectionTitle } from "@/components/ui/paper";
import { confirmSwitchAction, staySwitchAction } from "./actions";

/**
 * This device is logged in as one member and someone opened another
 * member's personal link. Staying is the main (safe) choice; switching
 * replaces this device's login only if they confirm.
 */
export function SwitchConfirm({ slug, current, other }: { slug: string; current: string; other: string }) {
  const [pending, startTransition] = useTransition();
  const run = (action: typeof staySwitchAction) =>
    startTransition(async () => {
      await action({ slug });
    });

  return (
    <Capiz>
      <SectionTitle>
        Naka-login ka bilang <Name>{current}</Name> sa device na &apos;to. Ikaw ba talaga si <Name>{other}</Name>?
      </SectionTitle>
      <p className="text-ube-soft">
        Personal link ni <Name>{other}</Name> ang binuksan mo. Kung hindi ikaw si <Name>{other}</Name>, manatili ka lang.
      </p>
      <div className="flex flex-col gap-2.5 self-stretch">
        <Button type="button" className="w-full" disabled={pending} onClick={() => run(staySwitchAction)}>
          Stay as {current}
        </Button>
        <Button type="button" variant="secondary" className="w-full" disabled={pending} onClick={() => run(confirmSwitchAction)}>
          Oo, ako si {other}
        </Button>
      </div>
    </Capiz>
  );
}
