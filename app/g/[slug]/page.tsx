import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Capiz, SectionTitle } from "@/components/ui/paper";
import { cn } from "@/lib/utils";
import { getMemberSession, hasGroupCookie, isValidSlug } from "@/server/auth";
import { getGroupSummary, MAX_MEMBERS } from "@/server/members";
import { getGroupPreview } from "@/server/groups";
import { formatPartyDate } from "@/lib/format";
import { OG_SIZE } from "@/components/og/share-card";
import { ComeBackForm } from "./come-back-form";
import { Brand } from "@/components/brand";
import { colClass, colsClass, LightString, pageClass } from "@/components/page";
import { JoinFallback } from "@/components/loading-shapes";
import { GoneGroupNotice, GroupFacts, RemovedNotice, WithParol } from "./group-facts";
import { JoinForm } from "./join-form";
import { PageTransition } from "@/components/page-transition";

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
      <LightString />
      <PageTransition>
        <main className={cn(pageClass, "pt-1.5 lg:pt-3")}>
          <Brand />
          <Suspense fallback={<JoinFallback />}>
            <JoinContent params={params} searchParams={searchParams} />
          </Suspense>
        </main>
      </PageTransition>
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
    <Link href={`/g/${slug}?bumalik=1`} className={cn(buttonVariants({ variant: "link" }), "w-fit px-0 text-body", className)}>
      Kasali ka na? Bumalik dito
    </Link>
  );
}

/**
 * The join, come-back and closed layout (docs/design/04–07): phones stack
 * the left part over the right; laptops put the group (or the greeting)
 * left and the listahan form right, starting a little lower.
 */
function JoinLayout({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className={cn(colsClass, "lg:pt-2.5")}>
      <div className={cn(colClass, "lg:col-start-1 lg:row-start-1")}>{left}</div>
      <div className={cn(colClass, "lg:col-start-2 lg:row-start-1")}>{right}</div>
    </div>
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
  if (!group) {
    // Gone, but this browser was in it: a demo that expired or was reset.
    if (await hasGroupCookie(slug)) {
      return (
        <div className="flex flex-col gap-[18px] lg:max-w-[560px] lg:pt-2.5">
          <GoneGroupNotice />
        </div>
      );
    }
    notFound();
  }
  // Already joined on this device: go straight to their page. Except while
  // rendering the join action's result (the cookie it sets re-renders this
  // page): then the form plays the slip drop and moves on by itself.
  if (session.kind === "member" && !isActionRender(requestHeaders)) redirect(`/g/${slug}/me`);

  // A demo is one visitor's sandbox, already drawn: a shared link can't
  // join it (or come back to it). Point them to a demo of their own.
  if (group.isDemo) {
    return (
      <JoinLayout
        left={
          <header className="flex flex-col gap-2">
            <h1 className="font-head text-display lg:text-display-lg">Demo group &apos;to</h1>
            <p>
              Para sa isang bisita lang ang <strong>{group.name}</strong>, kaya sarado ang pagsali.
            </p>
          </header>
        }
        right={
          <Capiz aria-labelledby="demo-closed-title">
            <SectionTitle id="demo-closed-title">Gusto mong subukan?</SectionTitle>
            <p>Gagawan ka namin ng sarili mong demo. Mabubura after 24 hours.</p>
            <Button asChild className="w-full lg:w-fit">
              <Link href="/demo">Subukan ang demo</Link>
            </Button>
          </Capiz>
        }
      />
    );
  }

  const isOpen = group.status === "OPEN";
  const isFull = group.memberCount >= MAX_MEMBERS;
  const comingBack = query.bumalik !== undefined && session.kind !== "removed";

  if (comingBack) {
    const newHref = isOpen && !isFull ? `/g/${slug}` : undefined;
    return (
      <JoinLayout
        left={
          <>
            <header>
              <h1 className="font-head text-display lg:text-display-lg">Welcome back!</h1>
              <p className="mt-1 text-ube-soft">{group.name}</p>
            </header>
            <p className="lg:mt-4">Ilagay ang pangalan at PIN mo para makita ang slip mo.</p>
            {newHref && (
              <Link href={newHref} className={cn(buttonVariants({ variant: "link" }), "hidden w-fit px-0 text-body lg:mt-4 lg:inline-flex")}>
                Bago ka? Sumali dito
              </Link>
            )}
          </>
        }
        right={<ComeBackForm slug={slug} newHref={newHref} showNewLink="phone" />}
      />
    );
  }

  if (session.kind === "removed") {
    return (
      <JoinLayout
        left={<h1 className="font-head text-display break-words lg:text-display-lg">{group.name}</h1>}
        right={<RemovedNotice />}
      />
    );
  }

  if (!isOpen || isFull) {
    return (
      <JoinLayout
        left={
          <>
            <header className="flex flex-col gap-2">
              <h1 className="font-head text-display lg:text-display-lg">
                {isOpen ? "Puno na ang group" : "Tapos na ang bunutan"}
              </h1>
              <p>
                {isOpen ? (
                  <>
                    Umabot na sa {MAX_MEMBERS} members ang <strong>{group.name}</strong>.
                  </>
                ) : (
                  <>
                    Nabunot na ang names sa <strong>{group.name}</strong>, kaya sarado na ang pagsali.
                  </>
                )}
              </p>
            </header>
            <GroupFacts partyDate={group.partyDate} budget={group.budget} memberCount={group.memberCount} memberSuffix="" />
          </>
        }
        right={
          <>
            <Capiz aria-labelledby="closed-title">
              <SectionTitle id="closed-title">Kasali ka na?</SectionTitle>
              <p>Buksan ang slip mo gamit ang pangalan at PIN mo.</p>
              <Button asChild className="w-full lg:w-fit">
                <Link href={`/g/${slug}?bumalik=1`}>Bumalik sa slip ko</Link>
              </Button>
            </Capiz>
            <p className="text-ube-soft">
              {isOpen
                ? "Kausapin ang organizer kung may dapat tanggalin."
                : "Hindi ka nakasali? I-message ang organizer ng group."}
            </p>
          </>
        }
      />
    );
  }

  return (
    <JoinLayout
      left={
        <>
          <WithParol>
            <p className="font-bold">Sali na sa bunutan ng</p>
            <h1 className="mt-1 font-head text-display break-words lg:text-display-lg">{group.name}</h1>
          </WithParol>
          <GroupFacts partyDate={group.partyDate} budget={group.budget} memberCount={group.memberCount} />
          <ComeBackLink slug={slug} className="hidden lg:mt-4 lg:inline-flex" />
        </>
      }
      right={<JoinForm slug={slug} footer={<ComeBackLink slug={slug} className="lg:hidden" />} />}
    />
  );
}
