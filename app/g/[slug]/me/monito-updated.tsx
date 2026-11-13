"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { acknowledgeMonitoUpdateAction } from "./actions";

/** Shown to the one giver whose receiver changed after a removal. */
export function MonitoUpdatedNotice({ slug }: { slug: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div role="status" className="flex w-full flex-col gap-3 rounded-3xl bg-niyog p-5">
      <p className="text-title font-extrabold">Na-update ang monito mo</p>
      <p className="text-ube-soft">
        Your monito was updated. May tinanggal sa group, kaya bago na ang nabunot mo. Tingnan sa baba.
      </p>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="self-start"
        disabled={pending}
        onClick={() => startTransition(async () => void (await acknowledgeMonitoUpdateAction({ slug })))}
      >
        Okay, gets ko
      </Button>
    </div>
  );
}
