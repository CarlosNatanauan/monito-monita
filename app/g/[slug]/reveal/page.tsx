import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RevealScreen } from "@/components/reveal/reveal-screen";
import "@/components/reveal/reveal.css";
import { getCurrentOrganizer, getOwnToken, isValidSlug, personalLinkPath } from "@/server/auth";
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
    <Suspense fallback={<Plain>Sandali lang…</Plain>}>
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

  const [view, ownToken] = await Promise.all([getRevealView(organizer.groupId), getOwnToken("organizer", slug)]);
  if (!view) notFound();
  // "Gawing remote ang phone mo": the organizer's own link, from their cookie.
  const remotePath = ownToken ? personalLinkPath("organizer", slug, ownToken) : undefined;
  const backHref = `/g/${slug}/admin`;

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

  return (
    <>
      {view.status !== "REVEALED" && <RevealAutoRefresh />}
      <RevealScreen
        data={view}
        backHref={backHref}
        startExtra={view.status === "DRAWN" && remotePath ? <PhoneRemote remotePath={remotePath} /> : undefined}
        controls={
          view.status === "DRAWN" ? (
            <StartReveal slug={slug} />
          ) : view.status === "REVEALING" ? (
            <RevealControls slug={slug} step={view.step} total={view.total} />
          ) : undefined
        }
      />
    </>
  );
}
