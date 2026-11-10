import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMemberSession, isValidSlug } from "@/server/auth";
import { getGroupSummary, MAX_MEMBERS } from "@/server/members";
import { GroupFacts, PageFallback, RemovedNotice } from "./group-facts";
import { JoinForm } from "./join-form";

export const metadata: Metadata = {
  title: "Sali ka! · Monito Monita",
};

export default function JoinPage({ params }: PageProps<"/g/[slug]">) {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-8 px-4 py-10">
      <Suspense fallback={<PageFallback />}>
        <JoinContent params={params} />
      </Suspense>
    </main>
  );
}

async function JoinContent({ params }: Pick<PageProps<"/g/[slug]">, "params">) {
  const { slug } = await params;
  if (!isValidSlug(slug)) notFound();

  const [group, session] = await Promise.all([getGroupSummary(slug), getMemberSession(slug)]);
  if (!group) notFound();
  // Already joined on this device: go straight to their page.
  if (session.kind === "member") redirect(`/g/${slug}/me`);

  const isOpen = group.status === "OPEN";
  const isFull = group.memberCount >= MAX_MEMBERS;

  return (
    <>
      <header className="flex flex-col gap-4">
        <p className="text-caption font-semibold text-muted-foreground">Exchange gift</p>
        <h1 className="text-heading">{group.name}</h1>
        <GroupFacts partyDate={group.partyDate} budget={group.budget} memberCount={group.memberCount} />
      </header>

      {session.kind === "removed" ? (
        <RemovedNotice />
      ) : !isOpen ? (
        <Card>
          <CardHeader>
            <CardTitle>Sarado na ang sali.</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Na-draw na ang names para sa group na &apos;to. Kung kasali ka, buksan ang personal link mo.
          </CardContent>
        </Card>
      ) : isFull ? (
        <Card>
          <CardHeader>
            <CardTitle>Puno na ang group.</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Umabot na sa {MAX_MEMBERS} members. Kausapin ang organizer kung may dapat tanggalin.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Sali ka!</CardTitle>
            <p className="text-caption text-muted-foreground">Walang sign-up. Pangalan mo lang.</p>
          </CardHeader>
          <CardContent>
            <JoinForm slug={slug} />
          </CardContent>
        </Card>
      )}
    </>
  );
}
