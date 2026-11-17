import { Art } from "@/components/art/symbols";
import { cn } from "@/lib/utils";

/*
 * Small pictures for the in-between pages (docs/DESIGN.md, "In-between
 * states"). Server-only markup, flat paper like the rest: no JS, no blur.
 */

/**
 * A slip that fell off the string: the wire with an empty sipit, and the
 * folded slip lying below it, a little off to the side. For "not found"
 * and links that no longer lead anywhere.
 */
export function LostSlip({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative h-[156px] w-[220px] shrink-0", className)}>
      <svg viewBox="0 0 220 40" className="absolute inset-x-0 top-0 h-10 w-full" focusable="false">
        <path d="M0 6 Q110 34 220 6" fill="none" stroke="#3F1F63" strokeWidth="1.5" />
      </svg>
      <Art name="clothespin" className="absolute top-[12px] left-[100px] h-[46px] w-4 rotate-[8deg]" />
      <div className="paper-slip absolute top-[70px] left-[64px] rotate-[4deg]" />
    </div>
  );
}
