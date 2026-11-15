import Link from "next/link";
import { cn } from "@/lib/utils";

/*
 * Its own module so pages that never show the wordmark (/me) don't pull
 * next/link into their JS via components/page.tsx.
 */

/** The wordmark, in Chelsea Market. Links home. */
export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" prefetch={false} className={cn("w-fit rounded-paper font-head text-brand focus-ring lg:py-1.5 lg:text-brand-lg", className)}>
      Monito Monita
    </Link>
  );
}
