"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="ring-2 ring-parol-gold">
      <CardHeader>
        <CardTitle>
          Naka-login ka bilang {current} sa device na &apos;to. Ikaw ba talaga si {other}?
        </CardTitle>
        <p className="text-caption text-muted-foreground">
          Personal link ni {other} ang binuksan mo. Kung hindi ikaw si {other}, manatili ka lang.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button type="button" size="lg" className="w-full" disabled={pending} onClick={() => run(staySwitchAction)}>
          Stay as {current}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={pending}
          onClick={() => run(confirmSwitchAction)}
        >
          Oo, ako si {other}
        </Button>
      </CardContent>
    </Card>
  );
}
