import Link from "next/link";
import { HeaderLights } from "@/components/lights";
import { Slip } from "@/components/slip";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { YourGroups } from "./your-groups";

const STEPS = [
  "Gumawa ng group at i-share ang link sa GC.",
  "Sumali ang lahat, tapos draw names.",
  "Buksan ang slip mo. Sikreto hanggang party.",
];

// Home page, restyled. The full landing page (the bowl in the arch, "Try a
// bunutan") comes in Phase 2 of the redesign.
export default function Home() {
  return (
    <>
      <HeaderLights />
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-5 px-5 pt-6 pb-14">
        <header className="flex flex-col gap-4">
          <h1 className="text-title font-extrabold">Monito Monita</h1>
          <p className="font-display text-heading-lg">Bunutan, wishlists, and the big reveal.</p>
          <p className="text-button font-medium">Isang link lang.</p>
        </header>

        <div aria-label="Sample slip" role="img" className="leaf-panel mt-2 flex justify-center rounded-3xl px-5 py-14">
          <Slip className="shadow-[0_0_40px_8px_rgb(244_197_66/0.45)]">Ate Joy</Slip>
        </div>

        <Button asChild className="w-full">
          <Link href="/new">Create your group</Link>
        </Button>

        {/* Returning on this device: groups they created or joined. */}
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
