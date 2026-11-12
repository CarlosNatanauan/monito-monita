import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentOrganizer, isValidSlug } from "@/server/auth";
import { getRevealView } from "@/server/reveal";
import { PageFallback } from "../group-facts";
import { RevealControls, StartReveal } from "./reveal-controls";

export const metadata: Metadata = {
  title: "Reveal · Monito Monita",
  robots: { index: false, follow: false },
};

/**
 * The party reveal (organizer only), plain version: one pair at a time
 * along the loop. The step is stored on the server, so refreshing or
 * opening this on another device resumes at the same pair.
 * The animated parol version comes after the redesign.
 */
export default function RevealPage({ params }: PageProps<"/g/[slug]/reveal">) {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-8 px-4 py-10 md:max-w-3xl">
      <Suspense fallback={<PageFallback />}>
        <RevealContent params={params} />
      </Suspense>
    </main>
  );
}

async function RevealContent({ params }: Pick<PageProps<"/g/[slug]/reveal">, "params">) {
  const { slug } = await params;
  if (!isValidSlug(slug)) notFound();

  const organizer = await getCurrentOrganizer(slug);
  if (!organizer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Para sa organizer lang ang page na &apos;to.</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Ang organizer ang magpapakita ng reveal sa party. Abangan mo na lang!
        </CardContent>
      </Card>
    );
  }

  const view = await getRevealView(organizer.groupId);
  if (!view) notFound();

  const back = (
    <Link href={`/g/${slug}/admin`} className="self-start text-caption font-semibold text-muted-foreground underline">
      Back to organizer page
    </Link>
  );

  if (view.status === "OPEN") {
    return (
      <>
        {back}
        <h1 className="text-heading">Party reveal</h1>
        <p className="text-muted-foreground">Mag-draw muna ng names bago ang reveal.</p>
      </>
    );
  }

  if (view.status === "DRAWN") {
    return (
      <>
        {back}
        <h1 className="text-heading">Party reveal</h1>
        <p className="text-title">{view.total} slips. Handa na?</p>
        <p className="text-muted-foreground">
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
        {back}
        <section aria-label="Reveal" className="flex flex-col gap-6 py-6">
          <p className="text-caption font-semibold text-muted-foreground">
            {step} of {total}
          </p>
          <p className="text-heading">
            <span className="font-hand">{pair.giverCodename}</span> ay si…
          </p>
          <p className="text-display font-extrabold">{pair.giverName}!</p>
          <p className="text-heading">→ para kay {pair.receiverName}</p>
        </section>
        <RevealControls slug={slug} step={step} total={total} />
      </>
    );
  }

  return (
    <>
      {back}
      <h1 className="text-heading">Tapos na ang reveal! 🎉</h1>
      <p className="text-muted-foreground">Makikita na ng lahat kung sino ang nagbigay sa kanila.</p>
      <ol aria-label="All pairs" className="flex flex-col gap-3">
        {view.pairs.map((p) => (
          <li key={`${p.giverName}-${p.receiverName}`} className="text-title">
            {p.giverName} <span className="text-muted-foreground">→</span> {p.receiverName}
          </li>
        ))}
      </ol>
    </>
  );
}
