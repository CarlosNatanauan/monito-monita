import type { Metadata } from "next";
import { PlainBrand } from "@/app/g/[slug]/group-facts";
import { LightString, Narrow, pageClass } from "@/components/page";
import { LostSlip } from "@/components/state-art";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = {
  title: "Naligaw ang slip · Monito Monita",
};

/**
 * 404, for a wrong path or a group that doesn't exist (docs/DESIGN.md,
 * "In-between states"). Server-only: no JS of its own, and plain links
 * (no next/link): its client references load with every page. Says what to try
 * and gives a way home; never which groups exist.
 */
export default function NotFound() {
  return (
    <>
      <LightString />
      <PageTransition>
        <main className={cn(pageClass, "pt-1.5 lg:pt-3")}>
          <PlainBrand />
          <Narrow className="lg:pt-6">
            <LostSlip />
            <h1 className="font-head text-display lg:text-display-lg">Naligaw ang slip na &apos;to</h1>
            <p className="lg:text-[19px]">Wala rito ang hinahanap mo. Baka kulang ang link, o may typo.</p>
            <p className="text-small text-ube-soft">
              Galing sa GC ang link? I-copy ulit nang buo, o hingin ulit sa organizer.
            </p>
            <div className="flex flex-col gap-2.5 lg:flex-row">
              <Button asChild className="w-full lg:w-fit">
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- plain links: this boundary loads with every page, and /me ships no next/link */}
              <a href="/">Bumalik sa home</a>
              </Button>
              <Button asChild variant="secondary" className="w-full lg:min-h-[60px] lg:w-fit">
                <a href="/new">Gumawa ng group</a>
              </Button>
            </div>
          </Narrow>
        </main>
      </PageTransition>
    </>
  );
}
