import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMemberSession, isValidSlug } from "@/server/auth";
import { getGroupSummary, MAX_MEMBERS } from "@/server/members";
import { ComeBackForm } from "./come-back-form";
import { GroupFacts, PageFallback, RemovedNotice } from "./group-facts";
import { JoinForm } from "./join-form";

export const metadata: Metadata = {
  title: "Sali ka! · Monito Monita",
};

export default function JoinPage({ params, searchParams }: PageProps<"/g/[slug]">) {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-8 px-4 py-10">
      <Suspense fallback={<PageFallback />}>
        <JoinContent params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/** Opens the come-back form (name + PIN). A plain link, so it works before hydration. */
function ComeBackLink({ slug }: { slug: string }) {
  return (
    <Link
      href={`/g/${slug}?bumalik=1`}
      className="self-start font-semibold text-foreground underline underline-offset-4"
    >
      Kasali ka na? Bumalik dito
    </Link>
  );
}

/**
 * The share link's page. Never lists member names: only the group's facts
 * and a count. Joining closes at the draw; coming back never does.
 */
async function JoinContent({ params, searchParams }: PageProps<"/g/[slug]">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  if (!isValidSlug(slug)) notFound();

  const [group, session] = await Promise.all([getGroupSummary(slug), getMemberSession(slug)]);
  if (!group) notFound();
  // Already joined on this device: go straight to their page.
  if (session.kind === "member") redirect(`/g/${slug}/me`);

  const isOpen = group.status === "OPEN";
  const isFull = group.memberCount >= MAX_MEMBERS;
  const comingBack = query.bumalik !== undefined;

  return (
    <>
      <header className="flex flex-col gap-4">
        <p className="text-caption font-semibold text-muted-foreground">Exchange gift</p>
        <h1 className="text-heading">{group.name}</h1>
        <GroupFacts partyDate={group.partyDate} budget={group.budget} memberCount={group.memberCount} />
      </header>

      {session.kind === "removed" ? (
        <RemovedNotice />
      ) : comingBack ? (
        <Card>
          <CardHeader>
            <CardTitle>Bumalik sa group</CardTitle>
            <p className="text-caption text-muted-foreground">Ilagay ang pangalan at PIN na ginamit mo nang sumali.</p>
          </CardHeader>
          <CardContent>
            <ComeBackForm slug={slug} newHref={isOpen && !isFull ? `/g/${slug}` : undefined} />
          </CardContent>
        </Card>
      ) : !isOpen ? (
        <Card>
          <CardHeader>
            <CardTitle>Sarado na ang sali.</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-muted-foreground">
            <p>Na-draw na ang names para sa group na &apos;to. Kung kasali ka, bumalik gamit ang pangalan at PIN mo.</p>
            <ComeBackLink slug={slug} />
          </CardContent>
        </Card>
      ) : isFull ? (
        <Card>
          <CardHeader>
            <CardTitle>Puno na ang group.</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-muted-foreground">
            <p>Umabot na sa {MAX_MEMBERS} members. Kausapin ang organizer kung may dapat tanggalin.</p>
            <ComeBackLink slug={slug} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Sali ka!</CardTitle>
            <p className="text-caption text-muted-foreground">Walang sign-up. Pangalan at PIN lang.</p>
          </CardHeader>
          <CardContent>
            <JoinForm slug={slug} footer={<ComeBackLink slug={slug} />} />
          </CardContent>
        </Card>
      )}
    </>
  );
}
