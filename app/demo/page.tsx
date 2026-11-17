import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Brand } from "@/components/brand";
import { colClass, colsClass, LightString, pageClass } from "@/components/page";
import { buttonVariants } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { Listahan, LstStarRow } from "@/components/ui/paper";
import { cn } from "@/lib/utils";
import { WithParol } from "../g/[slug]/group-facts";
import { NameLine } from "../g/[slug]/name-line";
import { startDemoAction, type DemoError } from "./actions";
import { StartDemoButton } from "./start-button";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = {
  title: "Subukan ang demo · Monito Monita",
  description: "Subukan ang buong bunutan nang mag-isa: buksan ang slip, ang organizer page, at ang party reveal.",
  robots: { index: false, follow: false },
};

const ERRORS: Record<DemoError, string> = {
  limit: "Ang dami nang demo mula sa network na 'to. Subukan ulit in a few minutes.",
  full: "Ang daming nagde-demo ngayon. Subukan ulit in a few minutes, o gumawa na ng totoong group.",
  name: "Hanggang 40 characters lang ang pangalan.",
  failed: "Hindi nagawa ang demo. Subukan ulit in a bit.",
};

/** What's waiting in the demo, as a listahan with stars (never numbered steps). */
const INSIDE = [
  "8 kasali, na-draw na ang names",
  "Ikaw ang organizer at isa sa members",
  "Wishlists, theme weeks, at bawal pair",
  "Party reveal hanggang sa finale",
];

/**
 * /demo (linked from the landing page and from a portfolio): a visitor
 * types their name (or keeps "Bisita") and gets their own demo group. A
 * plain form posting to a Server Action, so it works before hydration.
 */
export default function DemoPage({ searchParams }: PageProps<"/demo">) {
  return (
    <>
      <LightString />
      <PageTransition>
        <main className={cn(pageClass, "pt-1.5 lg:pt-3")}>
          <Brand />
          <div className={cn(colsClass, "lg:pt-2.5")}>
            <div className={cn(colClass, "lg:col-start-1 lg:row-start-1")}>
              <WithParol>
                <p className="font-bold">Titingin-tingin lang?</p>
                <h1 className="mt-1 font-head text-display lg:text-display-lg">Subukan ang demo</h1>
              </WithParol>
              <p className="max-w-[440px] lg:text-[19px]">
                Isang buong bunutan na para sa&apos;yo lang. Mga 2 minuto, walang kailangang kasama.
              </p>
              <Listahan title="Nasa loob" titleId="demo-inside" className="w-full lg:max-w-[440px]">
                <ul aria-labelledby="demo-inside">
                  {INSIDE.map((line) => (
                    <LstStarRow key={line}>{line}</LstStarRow>
                  ))}
                </ul>
              </Listahan>
            </div>

            <div className={cn(colClass, "lg:col-start-2 lg:row-start-1")}>
              <form action={startDemoAction} className="flex flex-col gap-[18px] lg:gap-[22px]" aria-label="Simulan ang demo">
                <div className="listahan">
                  <p className="lst-row font-bold">Anong itatawag namin sa&apos;yo?</p>
                  <NameLine id="demo-name" name="name" placeholder="Bisita" maxLength={40} autoComplete="given-name" />
                  <p className="lst-row text-small text-ube-soft">Optional. Mabubura ang demo after 24 hours.</p>
                </div>
                <Suspense>
                  <DemoErrorMessage searchParams={searchParams} />
                </Suspense>
                <StartDemoButton />
              </form>
              <Link href="/new" className={cn(buttonVariants({ variant: "link" }), "w-fit px-0 text-body")}>
                Gagawa na ng totoong group? Dito
              </Link>
            </div>
          </div>
        </main>
      </PageTransition>
    </>
  );
}

async function DemoErrorMessage({ searchParams }: Pick<PageProps<"/demo">, "searchParams">) {
  const { e } = await searchParams;
  const message = typeof e === "string" && e in ERRORS ? ERRORS[e as DemoError] : null;
  return <ErrorMessage>{message}</ErrorMessage>;
}
