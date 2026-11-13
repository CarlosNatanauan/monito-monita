import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCurrentOrganizer, isValidSlug } from "@/server/auth";
import { getRevealView } from "@/server/reveal";
import { RevealAutoRefresh } from "./auto-refresh";
import { RevealControls, StartReveal } from "./reveal-controls";

export const metadata: Metadata = {
  title: "Reveal · Monito Monita",
  robots: { index: false, follow: false },
};

// Gabi with a soft green centre and faint leaf veins (docs/DESIGN.md, "Reveal screen").
const NIGHT = {
  backgroundColor: "var(--color-gabi)",
  backgroundImage:
    "repeating-linear-gradient(115deg, rgb(255 255 255 / 0.035) 0 1px, transparent 1px 16px), radial-gradient(ellipse at center, #18432f 0%, transparent 70%)",
};

/**
 * The party reveal (organizer only), plain version: one pair at a time
 * along the loop. The step is stored on the server, so refreshing or
 * opening this on another device resumes at the same pair. Until the
 * reveal is done, the screen re-fetches every 2 seconds, so a laptop on
 * the projector follows Next taps from the organizer's phone.
 * The animated ring of slips and lights comes in Phase 3 of the redesign.
 */
export default function RevealPage({ params }: PageProps<"/g/[slug]/reveal">) {
  return (
    <div className="flex flex-1 flex-col text-white" style={NIGHT}>
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-8 px-5 py-10 md:max-w-3xl">
        <Suspense fallback={<p className="text-gabi-mist">Sandali lang…</p>}>
          <RevealContent params={params} />
        </Suspense>
      </main>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2 rounded-3xl bg-gabi-leaf p-5 text-gabi-mist">{children}</div>;
}

async function RevealContent({ params }: Pick<PageProps<"/g/[slug]/reveal">, "params">) {
  const { slug } = await params;
  if (!isValidSlug(slug)) notFound();

  const organizer = await getCurrentOrganizer(slug);
  if (!organizer) {
    return (
      <Panel>
        <p className="text-title font-extrabold text-white">Para sa organizer lang ang page na &apos;to.</p>
        <p>Ang organizer ang magpapakita ng reveal sa party. Abangan mo na lang!</p>
      </Panel>
    );
  }

  const view = await getRevealView(organizer.groupId);
  if (!view) notFound();

  const back = (
    <Link
      href={`/g/${slug}/admin`}
      className="flex min-h-11 items-center self-start rounded-sm font-bold text-gabi-mist underline underline-offset-4 focus-ring"
    >
      Back to organizer page
    </Link>
  );

  if (view.status === "OPEN") {
    return (
      <>
        {back}
        <h1 className="font-display text-heading-lg">Party reveal</h1>
        <p className="text-gabi-mist">Mag-draw muna ng names bago ang reveal.</p>
      </>
    );
  }

  if (view.status === "DRAWN") {
    return (
      <>
        <RevealAutoRefresh />
        {back}
        <h1 className="font-display text-heading-lg">Party reveal</h1>
        <p className="text-title font-bold text-margarine">{view.total} slips. Handa na?</p>
        <p className="text-gabi-mist">
          Isa-isa nating ipapakita kung sino ang nagbigay kanino, sunod-sunod sa bunutan. I-project mo &apos;to sa
          party.
        </p>
        <StartReveal slug={slug} />
      </>
    );
  }

  if (view.status === "REVEALING") {
    const { pair, step, total } = view;
    return (
      <>
        <RevealAutoRefresh />
        {back}
        <section aria-label="Reveal" className="flex flex-col items-center gap-6 py-6 text-center">
          <p className="font-bold text-gabi-mist">
            {step} of {total}
          </p>
          <p className="font-display text-heading-lg">
            Si <span className="font-hand not-italic">{pair.giverCodename}</span> ay si…
          </p>
          <p className="font-hand text-hand-xl break-words text-margarine">{pair.giverName}!</p>
          <p className="text-title font-bold">→ para kay {pair.receiverName}</p>
        </section>
        <RevealControls slug={slug} step={step} total={total} />
      </>
    );
  }

  return (
    <>
      {back}
      <h1 className="font-display text-heading-lg">Tapos na ang reveal! 🎉</h1>
      <p className="text-gabi-mist">Makikita na ng lahat kung sino ang nagbigay sa kanila.</p>
      <ol aria-label="All pairs" className="flex flex-col gap-3">
        {view.pairs.map((p) => (
          <li
            key={`${p.giverName}-${p.receiverName}`}
            className="flex flex-wrap items-baseline gap-x-3 rounded-2xl bg-niyog px-5 py-3 text-ube"
          >
            <span className="font-hand text-hand-lg">{p.giverName}</span>{" "}
            <span className="text-title font-bold">→ {p.receiverName}</span>
          </li>
        ))}
      </ol>
    </>
  );
}
