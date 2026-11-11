"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { acknowledgeMonitoUpdateAction } from "./actions";

/** Shown to the one giver whose receiver changed after a removal. */
export function MonitoUpdatedNotice({ slug }: { slug: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div role="status" className="flex w-full flex-col gap-2 rounded-2xl bg-slip p-4 ring-2 ring-parol-gold">
      <p className="font-heading text-title font-extrabold">Na-update ang monito mo</p>
      <p className="text-caption text-muted-foreground">
        Your monito was updated. May tinanggal sa group, kaya bago na ang nabunot mo. Tingnan sa baba.
      </p>
      <Button
        type="button"
        variant="outline"
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
