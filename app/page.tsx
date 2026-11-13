import Link from "next/link";
import { TryBunutan } from "@/components/landing/try-bunutan";
import { HeaderLights } from "@/components/lights";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
 */
export default function Home() {
  return (
    <>
      <HeaderLights />
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-6 px-5 pt-4 pb-14">
        <header className="flex flex-col gap-4">
          <h1 className="text-title font-extrabold">Monito Monita</h1>
          <p className="font-display text-heading-lg text-balance">Bunutan, wishlists, and the big reveal.</p>
          <p className="text-button font-medium">Isang link lang.</p>
        </header>

        <TryBunutan />

        <Button asChild className="w-full">
          <Link href="/new">Create your group</Link>
        </Button>

        {/* Returning visitors: their groups, right under the main action and
            above the how-it-works they no longer need. It appears only after
            hydration (localStorage), so it sits below the hero and button to
            keep them from shifting. */}
        <YourGroups />

        <Card className="gap-0 py-3">
          <ol className="flex flex-col rows-dashed" aria-label="How it works">
            {STEPS.map((step, i) => (
              <li key={step} className="flex items-center gap-6 py-4">
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
