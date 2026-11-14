import Link from "next/link";
import { TryBunutan } from "@/components/landing/try-bunutan";
import { HeaderLights } from "@/components/lights";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { widePageClass } from "@/components/page";
import { cn } from "@/lib/utils";
import { YourGroups } from "./your-groups";

const STEPS = [
  "Gumawa ng group at i-share ang link sa GC.",
  "Sumali ang lahat, tapos draw names.",
  "Buksan ang slip mo. Sikreto hanggang party.",
];

/**
 * The landing page (mockup 01-landing): header lights, the hero, the bowl
 * in the arch ("Try a bunutan", signature moment #1), "Create your group",
 * then the 3 steps. Static: rendered at build time, no database.
 *
 * Phones: one column in that order. From md (tablets, laptops): the hero,
 * the button and "Your groups" on the left, the arch on the right, and the
 * steps as a row of three below. The DOM keeps the phone order; the grid
 * places each part.
 */
export default function Home() {
  return (
    <>
      <HeaderLights />
      <main
        className={cn(
          widePageClass,
          "gap-5 pt-3 md:grid md:flex-none md:grid-cols-2 md:grid-rows-[1fr_auto_auto_1fr_auto] md:gap-x-12 md:gap-y-6 md:pt-10",
          "lg:gap-x-16",
        )}
      >
        <header className="flex flex-col gap-3 md:col-start-1 md:row-start-2 md:gap-4">
          <h1 className="text-title font-extrabold">Monito Monita</h1>
          <p className="font-display text-heading-lg text-balance">Bunutan, wishlists, and the big reveal.</p>
          <p className="text-button font-medium">Isang link lang.</p>
        </header>

        <div className="md:col-start-2 md:row-span-4 md:row-start-1 md:flex md:items-center md:justify-center">
          <TryBunutan className="md:w-full md:max-w-[440px]" />
        </div>

        <Button asChild className="w-full md:col-start-1 md:row-start-3 md:max-w-[440px]">
          <Link href="/new">Create your group</Link>
        </Button>

        {/* Returning visitors: their groups, right under the main action and
            above the how-it-works they no longer need. It appears only after
            hydration (localStorage), so it sits below the hero and button to
            keep them from shifting. */}
        <YourGroups className="md:col-start-1 md:row-start-4 md:max-w-[440px] md:self-start" />

        <Card className="gap-0 py-2 md:col-span-2 md:row-start-5 md:mt-4 md:px-0 md:py-6">
          <ol className="flex flex-col rows-dashed md:grid md:grid-cols-3 md:[&>*+*]:border-t-0 md:[&>*+*]:border-l-[1.5px] md:[&>*+*]:border-dashed" aria-label="How it works">
            {STEPS.map((step, i) => (
              <li key={step} className="flex items-center gap-6 py-3 md:gap-5 md:px-7 md:py-1 lg:px-8">
                <span aria-hidden className="w-6 shrink-0 text-center font-display text-heading-lg text-dahon">
                  {i + 1}
                </span>
                <span className="text-button">{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      </main>
    </>
  );
}
