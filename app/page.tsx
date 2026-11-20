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
  wide: [
    "Gumawa ng group, i-share ang link sa GC.",
    "Sumali ang lahat, tapos draw names.",
    "Buksan ang slip mo. Sikreto hanggang party.",
  ],
};

/**
 * The landing page (docs/DESIGN.md §5): the demo video's poster is the one
 * hero picture, and "Create your group" stays in the same first screen.
 * Static: rendered at build time, no database.
 *
 * The DOM is the phone order (wordmark, headline, poster, buttons, helper,
 * "Your groups", "Paano 'to?" with the small bowl on its corner, the footer), read in one centred column up
 * to 1180px (640px wide from 600px, the buttons side by side). From 1180px
 * (`wide:`) one row of two columns inside the 1120px container (440fr and
 * 632fr, 48px gap): the text, buttons and "Your groups" left; the poster,
 * its caption and "Paano 'to?" right, the poster's top level with the
 * headline. The grid's three rows let each column stack on its own: the
 * left blocks take rows 1 and 2–3, the right ones rows 1–2 and 3.
 * Fold targets (e2e/landing.spec.ts): the poster and "Create your group"
 * fully visible at 1366×657 and 390×664.
 */
export default function Home() {
  return (
    <>
      <LightString controller />
      <PageTransition>
        <div className="mx-auto flex w-full flex-1 flex-col px-5 pt-3 pb-8 min-[600px]:max-w-[calc(640px+2.5rem)] min-[600px]:pt-8 wide:max-w-[calc(1120px+4rem)] wide:px-8 wide:pt-[52px] wide:pb-10">
          <main className="flex flex-col wide:grid wide:grid-cols-[minmax(0,440fr)_minmax(0,632fr)] wide:grid-rows-[auto_auto_1fr] wide:items-start wide:gap-x-12">
            <div className="flex flex-col wide:col-start-1 wide:row-start-1">
              <Brand />
              <h1 className="mt-3.5 font-head text-display text-pretty min-[600px]:text-display-lg lg:mt-5.5 lg:leading-[1.1]">
                Isang link lang para sa buong bunutan.
              </h1>
              <p className="mt-4.5 hidden max-w-[440px] text-body-lg wide:block">
                Sali ang lahat sa isang link, draw names, wishlists, weekly themes, at reveal sa party.
              </p>
            </div>

            {/* The video: poster first (no video bytes until it's pressed). */}
            <div className="mt-4.5 flex flex-col min-[600px]:mt-6 wide:col-start-2 wide:row-span-2 wide:row-start-1 wide:mt-12">
              <DemoVideo />
              <p className="mt-3.5 hidden text-small leading-[1.45] text-ube-soft wide:block">
                Mula sa GC hanggang sa reveal sa party, sa loob ng isang minuto.
              </p>
            </div>

            <div className="mt-4.5 flex flex-col min-[600px]:mt-6 wide:col-start-1 wide:row-span-2 wide:row-start-2 wide:mt-6.5">
              <div className="flex flex-col gap-3 min-[600px]:flex-row min-[600px]:flex-wrap min-[600px]:items-center">
                <Button asChild className="w-full shrink-0 whitespace-nowrap min-[600px]:w-fit min-[600px]:px-6 lg:px-6">
                  <Link href="/new">Create your group</Link>
                </Button>
                {/* The one-click demo, for a visitor who just wants to look around
                    (a recruiter, a client). Secondary: one filled button per screen. */}
                <Button
                  asChild
                  variant="secondary"
                  className="w-full shrink-0 whitespace-nowrap min-[600px]:h-[58px] min-[600px]:w-fit min-[600px]:px-5 lg:h-[60px] lg:px-5"
                >
                  <Link href="/demo">Subukan ang demo</Link>
                </Button>
              </div>
              <p className="mt-3 text-small leading-[1.45] text-ube-soft">
                Titingin-tingin lang? Sa demo, ikaw na ang buong grupo: 2 minuto, walang kailangang kasama.
              </p>

              {/* Returning visitors: their groups, right under the main action.
                  It appears only after hydration (localStorage), so it sits
                  below the button to keep it from shifting. */}
              <YourGroups className="mt-5.5 w-full wide:mt-6.5" />
            </div>

            {/* "Paano 'to?" with the small bowl on its top-right corner (signature moment #1).
                The space above the list is the bowl's overhang (36px) and a little air. */}
            <TryBunutan className="mt-10 min-[600px]:mt-12 wide:col-start-2 wide:row-start-3 wide:mt-8">
              <Listahan title="Paano 'to?" titleId="how-it-works" className="w-full">
                <ol aria-labelledby="how-it-works">
                  {STEPS.phone.map((step, i) => (
                    <LstStarRow key={step}>
                      {/* The longer lines once the list is 640px wide; one line per row, clear of the drawn slip. */}
                      <span className="min-[680px]:hidden">{step}</span>
                      <span className="hidden min-[680px]:inline">{STEPS.wide[i]}</span>
                    </LstStarRow>
                  ))}
                </ol>
              </Listahan>
            </TryBunutan>
          </main>

          {/* Landing only: who made it, quietly. Phones: the name, then the links. */}
          <footer className="mt-8 flex flex-wrap items-center gap-x-4.5 border-t border-ube-line pt-4 text-small leading-[1.4] text-ube-soft lg:mt-12 lg:gap-x-5 lg:pt-3.5">
            <p className="w-full py-1 min-[600px]:w-auto min-[600px]:py-3">Made by Carlos Natanauan</p>
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
