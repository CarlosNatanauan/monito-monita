import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { HeaderLights } from "@/components/lights";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getMemberSession, isValidSlug } from "@/server/auth";
import { getGroupSummary, MAX_MEMBERS } from "@/server/members";
import { getGroupPreview } from "@/server/groups";
import { formatPartyDate } from "@/lib/format";
import { OG_SIZE } from "@/components/og/share-card";
import { ComeBackForm } from "./come-back-form";
import { Eyebrow, widePageClass } from "@/components/page";
import { GroupFacts, PageFallback, RemovedNotice, SplitCard, splitHalfClass } from "./group-facts";
import { JoinForm } from "./join-form";

/**
 * The join link's share preview (Messenger, Facebook): the group's name and
 * party date only. Personal links (/me) and the organizer page keep the
 * generic preview from the root layout.
 */
export async function generateMetadata({ params }: PageProps<"/g/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const group = await getGroupPreview(slug).catch(() => null);
  if (!group) return { title: "Sali ka! · Monito Monita" };
  const title = `Sali na sa bunutan ng ${group.name}`;
  const description = `Party: ${formatPartyDate(group.partyDate)}. Bunutan, wishlists, and the big reveal. Isang link lang.`;
  const image = { url: `/g/${slug}/og`, width: OG_SIZE.width, height: OG_SIZE.height, alt: title };
  return {
    title,
    description,
    openGraph: { title, description, images: [image], siteName: "Monito Monita", type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function JoinPage({ params, searchParams }: PageProps<"/g/[slug]">) {
  return (
    <>
      <HeaderLights />
      <main className={cn(widePageClass, "pt-3")}>
        <Suspense fallback={<PageFallback />}>
          <JoinContent params={params} searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

/**
 * True when this render answers a Server Action: from the client router
 * (`next-action` header) or a form posted before hydration (form body).
 * Page loads are GETs and never carry either.
 */
function isActionRender(h: Headers): boolean {
  if (h.has("next-action")) return true;
  const type = h.get("content-type") ?? "";
  return type.startsWith("multipart/form-data") || type.startsWith("application/x-www-form-urlencoded");
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

  const [group, session, requestHeaders] = await Promise.all([
    getGroupSummary(slug),
    getMemberSession(slug),
    headers(),
  ]);
  if (!group) notFound();
  // Already joined on this device: go straight to their page. Except while
  // rendering the join action's result (the cookie it sets re-renders this
  // page): then the form plays the slip drop and moves on by itself.
  if (session.kind === "member" && !isActionRender(requestHeaders)) redirect(`/g/${slug}/me`);

  const isOpen = group.status === "OPEN";
  const isFull = group.memberCount >= MAX_MEMBERS;
  const comingBack = query.bumalik !== undefined && session.kind !== "removed";

  if (comingBack) {
    return (
      <SplitCard
        info={
          <header className="flex flex-col gap-2 pt-2 md:pt-0">
            <Eyebrow>{group.name}</Eyebrow>
            <h1 className="font-display text-heading-lg break-words">Welcome back!</h1>
            <p className="mt-2">Ilagay ang pangalan at PIN mo para makita ang slip mo.</p>
          </header>
        }
      >
        <ComeBackForm slug={slug} newHref={isOpen && !isFull ? `/g/${slug}` : undefined} />
      </SplitCard>
    );
  }

  return (
    <SplitCard
      info={
        <Card className={cn("gap-6 pt-7", splitHalfClass)}>
          <header className="flex flex-col gap-3">
            <p className="font-medium text-ube-soft">Inimbitahan ka sa bunutan ng</p>
            <h1 className="font-display text-heading-lg break-words">{group.name}</h1>
          </header>
          <GroupFacts partyDate={group.partyDate} budget={group.budget} memberCount={group.memberCount} />
        </Card>
      }
    >
      {session.kind === "removed" ? (
        <RemovedNotice className={splitHalfClass} />
      ) : !isOpen ? (
        <Card className={splitHalfClass}>
          <CardTitle>Sarado na ang sali.</CardTitle>
          <CardContent>
            <CardDescription>
              Na-draw na ang names para sa group na &apos;to. Kung kasali ka, bumalik gamit ang pangalan at PIN mo.
            </CardDescription>
            <ComeBackLink slug={slug} className="self-start" />
          </CardContent>
        </Card>
      ) : isFull ? (
        <Card className={splitHalfClass}>
          <CardTitle>Puno na ang group.</CardTitle>
          <CardContent>
            <CardDescription>
              Umabot na sa {MAX_MEMBERS} members. Kausapin ang organizer kung may dapat tanggalin.
            </CardDescription>
            <ComeBackLink slug={slug} className="self-start" />
          </CardContent>
        </Card>
      ) : (
        <div className="pt-2 md:pt-0">
          <JoinForm slug={slug} footer={<ComeBackLink slug={slug} className="self-center" />} />
        </div>
      )}
    </SplitCard>
  );
}
