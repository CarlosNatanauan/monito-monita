import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { HeaderLights } from "@/components/lights";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getMemberSession, isValidSlug } from "@/server/auth";
import { getGroupSummary, MAX_MEMBERS } from "@/server/members";
import { ComeBackForm } from "./come-back-form";
import { Eyebrow, pageClass } from "@/components/page";
import { GroupFacts, PageFallback, RemovedNotice } from "./group-facts";
import { JoinForm } from "./join-form";

export const metadata: Metadata = {
  title: "Sali ka! · Monito Monita",
};

export default function JoinPage({ params, searchParams }: PageProps<"/g/[slug]">) {
  return (
    <>
      <HeaderLights />
      <main className={cn(pageClass, "pt-4")}>
        <Suspense fallback={<PageFallback />}>
          <JoinContent params={params} searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

/** Opens the come-back form (name + PIN). A plain link, so it works before hydration. */
function ComeBackLink({ slug, className }: { slug: string; className?: string }) {
  return (
    <Link href={`/g/${slug}?bumalik=1`} className={cn(buttonVariants({ variant: "link", size: "inline" }), className)}>
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
  const comingBack = query.bumalik !== undefined && session.kind !== "removed";

  if (comingBack) {
    return (
      <>
        <header className="flex flex-col gap-2 pt-4">
          <Eyebrow>{group.name}</Eyebrow>
          <h1 className="font-display text-heading-lg">Welcome back!</h1>
          <p className="mt-2">Ilagay ang pangalan at PIN mo para makita ang slip mo.</p>
        </header>
        <div className="pt-2">
          <ComeBackForm slug={slug} newHref={isOpen && !isFull ? `/g/${slug}` : undefined} />
        </div>
      </>
    );
  }

  return (
    <>
      <Card className="gap-6 pt-7">
        <header className="flex flex-col gap-3">
          <p className="font-medium text-ube-soft">Inimbitahan ka sa bunutan ng</p>
          <h1 className="font-display text-heading-lg break-words">{group.name}</h1>
        </header>
        <GroupFacts partyDate={group.partyDate} budget={group.budget} memberCount={group.memberCount} />
      </Card>

      {session.kind === "removed" ? (
        <RemovedNotice />
      ) : !isOpen ? (
        <Card>
          <CardTitle>Sarado na ang sali.</CardTitle>
          <CardContent>
            <CardDescription>
              Na-draw na ang names para sa group na &apos;to. Kung kasali ka, bumalik gamit ang pangalan at PIN mo.
            </CardDescription>
            <ComeBackLink slug={slug} className="self-start" />
          </CardContent>
        </Card>
      ) : isFull ? (
        <Card>
          <CardTitle>Puno na ang group.</CardTitle>
          <CardContent>
            <CardDescription>
              Umabot na sa {MAX_MEMBERS} members. Kausapin ang organizer kung may dapat tanggalin.
            </CardDescription>
            <ComeBackLink slug={slug} className="self-start" />
          </CardContent>
        </Card>
      ) : (
        <div className="pt-4">
          <JoinForm slug={slug} footer={<ComeBackLink slug={slug} className="self-center" />} />
        </div>
      )}
    </>
  );
}
