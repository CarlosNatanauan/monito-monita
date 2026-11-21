import Link from "next/link";
import { cn } from "@/lib/utils";

/*
 * Its own module so pages that never show the wordmark (/me) don't pull
 * next/link into their JS via components/page.tsx.
 */

/** The wordmark, in Chelsea Market. Links home. */
export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" prefetch={false} className={cn(
        // The tap area reaches 11px above and below the wordmark (44px on phones) without moving anything.
        "relative w-fit rounded-paper font-head text-brand focus-ring before:absolute before:inset-x-0 before:-inset-y-[11px] before:content-[''] lg:py-1.5 lg:text-brand-lg",
        className,
      )}>
      Monito Monita
    </Link>
  );
}
