import Link from "next/link";
import { DemoVideo } from "@/components/landing/demo-video";
import { TryBunutan } from "@/components/landing/try-bunutan";
import { Button } from "@/components/ui/button";
import { Listahan, LstStarRow } from "@/components/ui/paper";
import { Brand } from "@/components/brand";
import { LightString } from "@/components/page";
import { YourGroups } from "./your-groups";
import { PageTransition } from "@/components/page-transition";

const FOOTER_LINK = "inline-flex min-h-11 items-center rounded-paper font-bold text-ube underline underline-offset-3 focus-ring";

const STEPS = {
  phone: ["Gumawa ng group, i-share sa GC.", "Sali ang lahat, tapos draw names.", "Buksan ang slip mo. Sikreto muna!"],
  laptop: [
    "Gumawa ng group, i-share ang link sa GC.",
    "Sumali ang lahat, tapos draw names.",
    "Buksan ang slip mo. Sikreto hanggang party.",
  ],
};

/**
 * The landing page, direction 1a "Poster first" (docs/design/landing-video):
 * the demo video's poster is the hero picture, next to the headline, and
 * "Create your group" stays in the same first screen; the bowl ("Try a
 * bunutan", signature moment #1) moves below into its own smaller sky panel,
 * beside "Paano 'to?". Static: rendered at build time, no database.
 *
 * The DOM is the phone order (wordmark, headline, poster, buttons, helper,
 * "Your groups", "Paano 'to?", the bowl, the footer); tablets read it in a
 * centred 560px column; laptops place it on a 440 + 632px grid (48px gap):
 * text left, poster right aligned with the headline, the lists and the bowl
 * in the second row. Fold targets (e2e/landing.spec.ts): the poster and
 * "Create your group" fully visible at 1366×657 and 390×664.
 */
export default function Home() {
  return (
    <>
      <LightString controller />
      <PageTransition>
        <div className="mx-auto flex w-full flex-1 flex-col px-5 pt-3 pb-8 min-[600px]:max-w-[600px] lg:max-w-[calc(1120px+4rem)] lg:px-8 lg:pt-[52px] lg:pb-10">
          <main className="flex flex-col lg:grid lg:grid-cols-[minmax(0,440fr)_minmax(0,632fr)] lg:items-start lg:gap-x-12">
            <div className="flex flex-col lg:col-start-1 lg:row-start-1">
              <Brand />
              <h1 className="mt-3.5 font-head text-display text-pretty lg:mt-5.5 lg:text-display-lg lg:leading-[1.1]">
                Isang link lang para sa buong bunutan.
              </h1>
              <p className="mt-4.5 hidden max-w-[440px] text-body-lg lg:block">
                Sali ang lahat sa isang link, draw names, wishlists, weekly themes, at reveal sa party.
              </p>
            </div>

            {/* The video: poster first (no video bytes until it's pressed). */}
            <div className="mt-4.5 flex flex-col lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-12">
              <DemoVideo />
              <p className="mt-3.5 hidden text-small leading-[1.45] text-ube-soft lg:block">
                Mula sa GC hanggang sa reveal sa party, sa loob ng isang minuto.
              </p>
            </div>

            <div className="mt-4.5 flex flex-col lg:col-start-1 lg:row-start-2 lg:mt-6.5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <Button asChild className="w-full shrink-0 whitespace-nowrap lg:w-fit lg:px-6">
                  <Link href="/new">Create your group</Link>
                </Button>
                {/* The one-click demo, for a visitor who just wants to look around
                    (a recruiter, a client). Secondary: one filled button per screen. */}
                <Button asChild variant="secondary" className="w-full shrink-0 whitespace-nowrap lg:h-[60px] lg:w-fit lg:px-5">
                  <Link href="/demo">Subukan ang demo</Link>
                </Button>
              </div>
              <p className="mt-3 text-small leading-[1.45] text-ube-soft">
                Titingin-tingin lang? Sa demo, ikaw na ang buong grupo: 2 minuto, walang kailangang kasama.
              </p>

              {/* Returning visitors: their groups, right under the main action.
                  It appears only after hydration (localStorage), so it sits
                  below the button to keep it from shifting. */}
              <YourGroups className="mt-5.5 w-full lg:mt-6.5 lg:max-w-[440px]" />
            </div>

            <Listahan title="Paano 'to?" titleId="how-it-works" className="mt-4.5 w-full lg:col-start-1 lg:row-start-3 lg:mt-14 lg:max-w-[440px]">
              <ol aria-labelledby="how-it-works">
                {STEPS.phone.map((step, i) => (
                  <LstStarRow key={step}>
                    {/* The longer laptop lines need the full 440px column (a window of 1184px or more); one line per row. */}
                    <span className="min-[1184px]:hidden">{step}</span>
                    <span className="hidden min-[1184px]:inline">{STEPS.laptop[i]}</span>
                  </LstStarRow>
                ))}
              </ol>
            </Listahan>

            <TryBunutan className="mt-4.5 lg:col-start-2 lg:row-start-3 lg:mt-14" />
          </main>

          {/* Landing only: who made it, quietly. Phones: the name, then the links. */}
          <footer className="mt-8 flex flex-wrap items-center gap-x-4.5 border-t border-ube-line pt-4 text-small leading-[1.4] text-ube-soft lg:mt-12 lg:gap-x-5 lg:pt-3.5">
            <p className="w-full py-1 lg:w-auto lg:py-3">Made by Carlos Natanauan</p>
            <a href="https://github.com/CarlosNatanauan/monito-monita" className={FOOTER_LINK}>
              GitHub
            </a>
            <a href="https://kuyacarlos.is-a.dev" className={FOOTER_LINK}>
              kuyacarlos.is-a.dev
            </a>
          </footer>
        </div>
      </PageTransition>
    </>
  );
}
