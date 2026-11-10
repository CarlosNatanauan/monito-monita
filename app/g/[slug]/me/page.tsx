import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CopyLink } from "@/components/copy-link";
import { Slip } from "@/components/slip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { joinedCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getMemberSession, getOwnToken, isValidSlug, personalLinkPath } from "@/server/auth";
import { getOwnReceiver } from "@/server/draw-service";
import { getGroupSummary } from "@/server/members";
import { getThemeWeeks } from "@/server/groups";
import { describeThemeStatus, getThemeStatus } from "@/lib/theme-status";
import { todayIn } from "@/lib/theme-weeks";
import { getReceiverWishlist, listWishlist } from "@/server/wishlists";
import { WishlistView } from "@/components/wish-item";
import { WishlistEditor } from "./wishlist-editor";
import { GroupFacts, PageFallback, RemovedNotice } from "../group-facts";

export const metadata: Metadata = {
  title: "My monito · Monito Monita",
};

export default function MemberHomePage({ params, searchParams }: PageProps<"/g/[slug]/me">) {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-8 px-4 py-10">
      <Suspense fallback={<PageFallback />}>
        <MemberHome params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function MemberHome({ params, searchParams }: PageProps<"/g/[slug]/me">) {
  const { slug } = await params;
  if (!isValidSlug(slug)) notFound();

  const [group, session, token, query] = await Promise.all([
    getGroupSummary(slug),
    getMemberSession(slug),
    getOwnToken("member", slug),
    searchParams,
  ]);
  if (!group) notFound();

  if (session.kind === "removed") {
    return (
      <>
        <h1 className="text-heading">{group.name}</h1>
        <RemovedNotice />
      </>
    );
  }

  if (session.kind === "none") {
    return (
      <>
        <h1 className="text-heading">{group.name}</h1>
        <Card>
          <CardHeader>
            <CardTitle>Hindi ka pa namin kilala sa device na &apos;to.</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-muted-foreground">
            <p>Kung kasali ka na, buksan ang personal link mo. Kung hindi pa, sali ka muna.</p>
            {group.status === "OPEN" && (
              <Button asChild variant="outline" className="self-start">
                <Link href={`/g/${slug}`}>Join the group</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </>
    );
  }

  const { member } = session;
  const welcome = query.welcome === "1";
  const drawn = group.status !== "OPEN";
  // Only this member's own receiver, looked up by the id from their cookie.
  const [receiver, receiverWishlist, myWishlist, themeWeeks] = await Promise.all([
    drawn ? getOwnReceiver(member.id) : null,
    drawn ? getReceiverWishlist(member.id) : [],
    listWishlist(member.id),
    getThemeWeeks(group.id),
  ]);
  // "Today" in the group's timezone (Asia/Manila), never the server's (UTC on Vercel).
  const theme = describeThemeStatus(
    getThemeStatus(themeWeeks, group.partyDate, todayIn(group.timezone)),
    group.budget,
  );

  return (
    <>
      <header className="flex flex-col gap-2">
        <p className="text-caption font-semibold text-muted-foreground">{group.name}</p>
        <h1 className="text-heading">Hi, {member.displayName}!</h1>
      </header>

      {drawn ? (
        // Temporary, plain result. The slip unfold replaces this in Week 2.
        <section className="flex flex-col items-center gap-3" aria-label="Your monito">
          <p className="text-title font-extrabold">Ang monito mo ay…</p>
          {receiver ? (
            <>
              <Slip>{receiver.displayName}</Slip>
              <Card className="mt-3 w-full">
                <CardHeader>
                  <CardTitle>Wishlist ni {receiver.displayName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <WishlistView
                    items={receiverWishlist}
                    emptyText={`Wala pang wishlist si ${receiver.displayName}. Balikan mo mamaya!`}
                  />
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="text-muted-foreground">Inaayos pa ng organizer ang bunutan. Balik ka in a bit.</p>
          )}
          <p className="text-caption text-muted-foreground">
            Codename mo: <span className="font-hand text-body text-foreground">{member.codename}</span>
          </p>
        </section>
      ) : (
        <section className="flex flex-col items-center gap-3" aria-label="Your codename">
          <p className="text-caption text-muted-foreground">Ang codename mo:</p>
          <Slip>{member.codename}</Slip>
        </section>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {group.status === "OPEN" ? "Waiting for the bunutan…" : "Na-draw na ang names!"}
          </CardTitle>
          <p className="text-caption text-muted-foreground">
            {group.status === "OPEN"
              ? `Hintayin si organizer na mag-draw ng names. ${joinedCount(group.memberCount)}.`
              : "Sikreto lang 'to. Simulan mo nang mag-isip ng regalo!"}
          </p>
        </CardHeader>
        <CardContent>
          <GroupFacts partyDate={group.partyDate} budget={group.budget} />
        </CardContent>
      </Card>

      <section aria-label="Theme this week">
        <Card>
          <CardHeader>
            <CardTitle>{theme.headline}</CardTitle>
            <p className="text-caption text-muted-foreground">{theme.english}</p>
          </CardHeader>
          <CardContent>
            <p>{theme.detail}</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Wishlist mo</CardTitle>
          <p className="text-caption text-muted-foreground">Makikita ito ng nakabunot sa&apos;yo, at wala nang iba.</p>
        </CardHeader>
        <CardContent>
          <WishlistEditor slug={slug} items={myWishlist} />
        </CardContent>
      </Card>

      {token && (
        <Card className={cn(welcome && "ring-2 ring-parol-gold")}>
          <CardHeader>
            <CardTitle>{welcome ? "Save this link!" : "Your personal link"}</CardTitle>
            <p className="text-caption text-muted-foreground">
              Ito ang susi mo para makabalik dito, kahit sa ibang phone. I-bookmark o i-send sa sarili mo.
              Huwag i-share sa GC.
            </p>
          </CardHeader>
          <CardContent>
            <CopyLink path={personalLinkPath("member", slug, token)} label="Copy my link" variant={welcome ? "default" : "outline"} />
          </CardContent>
        </Card>
      )}
    </>
  );
}
