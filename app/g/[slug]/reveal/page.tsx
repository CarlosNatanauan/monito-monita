import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { DemoRevealLinks, DemoRevealTag } from "@/components/demo/demo-guide";
import { RevealScreen } from "@/components/reveal/reveal-screen";
import "@/components/reveal/reveal.css";
import { qrPath } from "@/lib/qr";
import { requestOrigin } from "@/lib/request-origin";
import { getCurrentOrganizer, getOwnToken, hasGroupCookie, isValidSlug, personalLinkPath } from "@/server/auth";
import { getGroupPreview, isDemoGroup } from "@/server/groups";
import { RevealFallback } from "@/components/loading-shapes";
import { getRevealView } from "@/server/reveal";
import { RevealAutoRefresh } from "./auto-refresh";
import { PhoneRemote, RevealControls, StartReveal } from "./reveal-controls";

export const metadata: Metadata = {
  title: "Reveal · Monito Monita",
  robots: { index: false, follow: false },
};


/**
 * The party reveal (organizer only, signature moment 4): a ring of slips
 * in loop order with a string of bulbs, one pair at a time. The step is
 * stored on the server, so refreshing or opening this on another device
 * resumes at the same pair. Until the reveal is done, the screen
 * re-fetches every 2 seconds, so a laptop on the projector follows Next
 * taps from the organizer's phone, and plays each step's animation.
 */
export default function RevealPage({ params }: PageProps<"/g/[slug]/reveal">) {
  return (
    <Suspense fallback={<RevealFallback />}>
      <RevealContent params={params} />
    </Suspense>
  );
}

function Plain({ children }: { children: React.ReactNode }) {
  return (
    <div className="rv-screen flex flex-1 flex-col text-white">
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-6 px-5 py-10 md:max-w-3xl">{children}</main>
    </div>
  );
}

async function RevealContent({ params }: Pick<PageProps<"/g/[slug]/reveal">, "params">) {
  const { slug } = await params;
  if (!isValidSlug(slug)) notFound();

  const organizer = await getCurrentOrganizer(slug);
  if (!organizer && !(await getGroupPreview(slug))) {
    // An expired demo: the organizer page says so (and where to go next).
    if (await hasGroupCookie(slug)) redirect(`/g/${slug}/admin`);
    notFound();
  }
  if (!organizer) {
    return (
      <Plain>
        <div className="flex flex-col gap-2 rounded-paper border-[1.5px] border-gabi-line bg-gabi p-5 text-gabi-text">
          <p className="font-head text-section text-white">Para sa organizer lang ang page na &apos;to.</p>
          <p>Ang organizer ang magpapakita ng reveal sa party. Abangan mo na lang!</p>
        </div>
      </Plain>
    );
  }

  const [view, ownToken, isDemo, requestHeaders] = await Promise.all([
    getRevealView(organizer.groupId),
    getOwnToken("organizer", slug),
    isDemoGroup(organizer.groupId),
    headers(),
  ]);
  if (!view) notFound();
  // "Gawing remote ang phone mo": the organizer's own link, from their cookie.
  const remotePath = ownToken ? personalLinkPath("organizer", slug, ownToken) : undefined;
  const backHref = `/g/${slug}/admin`;
  // Its QR code, encoded here on the server: only this organizer's own
  // screen (verified by their cookie above) ever gets it, and only before
  // the start.
  const remoteQr =
    view.status === "DRAWN" && remotePath ? qrPath(`${requestOrigin(requestHeaders)}${remotePath}`) : undefined;

  if (view.status === "OPEN") {
    return (
      <Plain>
        <Link
          href={backHref}
          className="flex min-h-11 items-center self-start rounded-paper font-bold text-gabi-text underline decoration-[1.5px] underline-offset-[3px] focus-ring"
        >
          Back to organizer page
        </Link>
        <h1 className="font-head text-display">Party reveal</h1>
        <p className="text-gabi-text">Mag-draw muna ng names bago ang reveal.</p>
      </Plain>
    );
  }

  // Every element handed to the client screen has a key: with the QR's
  // object prop, React (dev) can deliver these elements late and then
  // checks them like list children ("unique key" warning on WebKit).
  return (
    <>
      {view.status !== "REVEALED" && <RevealAutoRefresh />}
      <RevealScreen
        data={view}
        backHref={backHref}
        demoTag={isDemo ? <DemoRevealTag key="demo-tag" /> : undefined}
        demoTools={isDemo ? <DemoRevealLinks key="demo-links" slug={slug} /> : undefined}
        startExtra={view.status === "DRAWN" && remotePath ? <PhoneRemote key="remote" remotePath={remotePath} qr={remoteQr} /> : undefined}
        controls={
          view.status === "DRAWN" ? (
            <StartReveal key="start" slug={slug} />
          ) : view.status === "REVEALING" ? (
            <RevealControls key="controls" slug={slug} step={view.step} total={view.total} />
          ) : undefined
        }
      />
    </>
  );
}
