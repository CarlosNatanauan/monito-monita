"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Capiz } from "@/components/ui/paper";
import { acknowledgeMonitoUpdateAction } from "./actions";

/** Shown to the one giver whose receiver changed after a removal. */
export function MonitoUpdatedNotice({ slug }: { slug: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Capiz role="status">
      <p className="font-head text-section lg:text-section-lg">Na-update ang monito mo</p>
      <p className="text-ube-soft">
        Your monito was updated. May tinanggal sa group, kaya bago na ang nabunot mo. Tingnan sa baba.
      </p>
      <Button
        type="button"
        variant="secondary"
        className="self-start"
        disabled={pending}
        onClick={() => startTransition(async () => void (await acknowledgeMonitoUpdateAction({ slug })))}
      >
        Okay, gets ko
      </Button>
    </Capiz>
  );
}
