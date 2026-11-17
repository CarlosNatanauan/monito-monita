import Link from "next/link";
import { TryBunutan } from "@/components/landing/try-bunutan";
import { Button } from "@/components/ui/button";
import { Listahan, LstStarRow } from "@/components/ui/paper";
import { Brand } from "@/components/brand";
import { colClass, colsClass, LightString, pageClass } from "@/components/page";
import { cn } from "@/lib/utils";
import { YourGroups } from "./your-groups";

const STEPS = {
  phone: ["Gumawa ng group, i-share sa GC.", "Sali ang lahat, tapos draw names.", "Buksan ang slip mo. Sikreto muna!"],
  laptop: [
    "Gumawa ng group, i-share ang link sa GC.",
    "Sumali ang lahat, tapos draw names.",
    "Buksan ang slip mo. Sikreto hanggang party.",
  ],
};

/**
 * The landing page (docs/design/01-landing-*.png): the light string, the
 * headline, the evening sky with the bowl ("Try a bunutan", signature
 * moment #1), "Create your group", then "Paano 'to?" on a listahan.
 * Static: rendered at build time, no database.
 *
 * Phones: one column in that order. Laptops: the text, the button and
 * the lists on the left, the sky on the right. Asymmetric, never centred.
 */
export default function Home() {
  return (
    <>
      <LightString controller />
      <main className={cn(pageClass, "pt-1.5 lg:pt-3")}>
        <div className={colsClass}>
          <div className={cn(colClass, "lg:col-start-1 lg:row-start-1")}>
            <Brand />
            <h1 className="font-head text-display text-pretty lg:text-display-lg">Isang link lang para sa buong bunutan.</h1>
            <p className="hidden max-w-[440px] text-[19px] lg:block">
              Sali ang lahat sa isang link, draw names, wishlists, weekly themes, at reveal sa party.
            </p>
          </div>

          <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <TryBunutan />
          </div>

          <div className={cn(colClass, "lg:col-start-1 lg:row-start-2")}>
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-4">
              <Button asChild className="w-full lg:w-fit">
                <Link href="/new">Create your group</Link>
              </Button>
              {/* The one-click demo, for a visitor who just wants to look around
                  (a recruiter, a client). Secondary: one filled button per screen. */}
              <Button asChild variant="secondary" className="w-full lg:h-[60px] lg:w-fit lg:px-6">
                <Link href="/demo">Subukan ang demo</Link>
              </Button>
            </div>
            <p className="-mt-1 text-small text-ube-soft lg:-mt-2">
              Titingin-tingin lang? Sa demo, ikaw na ang buong grupo: 2 minuto, walang kailangang kasama.
            </p>

            {/* Returning visitors: their groups, right under the main action.
                It appears only after hydration (localStorage), so it sits
                below the button to keep it from shifting. */}
            <YourGroups className="w-full lg:max-w-[440px]" />

            <Listahan title="Paano 'to?" titleId="how-it-works" className="w-full lg:max-w-[440px]">
              <ol aria-labelledby="how-it-works">
                {STEPS.phone.map((step, i) => (
                  <LstStarRow key={step}>
                    <span className="lg:hidden">{step}</span>
                    <span className="hidden lg:inline">{STEPS.laptop[i]}</span>
                  </LstStarRow>
                ))}
              </ol>
            </Listahan>
          </div>
        </div>
      </main>
    </>
  );
}
