"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/** "Simulan ang demo", with a pending label while the demo group is built. */
export function StartDemoButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Inihahanda ang demo…" : "Simulan ang demo"}
    </Button>
  );
}
