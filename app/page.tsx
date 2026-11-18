import Link from "next/link";
import { DemoVideo } from "@/components/landing/demo-video";
import { TryBunutan } from "@/components/landing/try-bunutan";
import { Button } from "@/components/ui/button";
import { Listahan, LstStarRow } from "@/components/ui/paper";
import { Brand } from "@/components/brand";
import { colClass, colsClass, LightString, pageClass } from "@/components/page";
import { cn } from "@/lib/utils";
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
 * The landing page (docs/design/01-landing-*.png): the light string, the
 * headline, the evening sky with the bowl ("Try a bunutan", signature
 * moment #1), "Create your group", then "Paano 'to?" on a listahan.
 * Static: rendered at build time, no database.
 *
 * Phones: one column in that order. Laptops: the text, the button and
 * the lists on the left, the sky on the right. Asymmetric, never centred.
 * From 600px wide the hero fills the window under the light string, its
 * content centred top to bottom. Below it, "See how it works": the demo
 * video behind a click-to-load poster (no YouTube until it's played), then
 * a small footer, on the landing only.
 */
export default function Home() {
  return (
    <>
      <LightString controller />
      <PageTransition>
        <main className={cn(pageClass, "pt-1.5 lg:pt-3")}>
          {/* From 600px: the window under the 44px string and the page's top padding, content centred. */}
          <section
            aria-labelledby="hero-title"
            className="flex flex-col min-[600px]:min-h-[calc(100svh-50px)] min-[600px]:justify-center min-[600px]:py-6 lg:min-h-[calc(100svh-56px)] lg:py-8"
          >
            <div className={colsClass}>
              <div className={cn(colClass, "lg:col-start-1 lg:row-start-1")}>
                <Brand />
                <h1 id="hero-title" className="font-head text-display text-pretty lg:text-display-lg">Isang link lang para sa buong bunutan.</h1>
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
          </section>

          <section
            aria-labelledby="see-how"
            className="flex flex-col gap-[18px] pt-8 lg:grid lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-center lg:gap-x-12 lg:pt-4"
          >
            <div className="flex flex-col gap-2.5 lg:gap-3">
              <h2 id="see-how" className="font-head text-title text-pretty lg:text-title-lg">
                See how it works
              </h2>
              <p className="max-w-[440px] lg:text-[19px]">Mula sa GC hanggang sa reveal sa party, sa loob ng isang minuto.</p>
            </div>
            <DemoVideo />
          </section>
        </main>

        {/* Landing only: who made it, quietly. */}
        <footer className="mx-auto w-full px-5 pb-6 min-[600px]:max-w-[600px] lg:max-w-[calc(1120px+4rem)] lg:px-8 lg:pb-8">
          <div className="flex flex-wrap items-center gap-x-5 border-t-[1.5px] border-ube-line pt-2 text-small text-ube-soft">
            <p className="py-3">Made by Carlos Natanauan</p>
            <a href="https://github.com/CarlosNatanauan/monito-monita" className={FOOTER_LINK}>
              GitHub
            </a>
            <a href="https://kuyacarlos.is-a.dev" className={FOOTER_LINK}>
              kuyacarlos.is-a.dev
            </a>
          </div>
        </footer>
      </PageTransition>
    </>
  );
}
