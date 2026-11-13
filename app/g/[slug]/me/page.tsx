import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HeaderLights } from "@/components/lights";
import { Slip } from "@/components/slip";
import { ThemeCard } from "@/components/theme-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { RememberGroup } from "@/components/remember-group";
import { RoleSwitch } from "@/components/role-switch";
import { ShareLink } from "@/components/share-link";
import {
  getCurrentOrganizer,
  getMemberSession,
  getOwnToken,
  getPendingSwitch,
  isValidSlug,
  personalLinkPath,
} from "@/server/auth";
import { getOwnReceiver } from "@/server/draw-service";
import { getGroupSummary } from "@/server/members";
import { getOwnGiver } from "@/server/reveal";
import { getThemeWeeks } from "@/server/groups";
import { getThemeStatus, themeCard } from "@/lib/theme-status";
import { todayIn } from "@/lib/theme-weeks";
import { getReceiverWishlist, listWishlist } from "@/server/wishlists";
import { WishlistView } from "@/components/wish-item";
import { CleanWelcomeParam } from "./clean-welcome";
import { MonitoReveal } from "./monito-reveal";
import { MonitoUpdatedNotice } from "./monito-updated";
import { SetPinCard } from "./set-pin-card";
import { SwitchConfirm } from "./switch-confirm";
import { WishlistEditor } from "./wishlist-editor";
import { Eyebrow, pageClass } from "@/components/page";
import { GroupFacts, PageFallback, RemovedNotice } from "../group-facts";

export const metadata: Metadata = {
  title: "My monito · Monito Monita",
};

export default function MemberHomePage({ params, searchParams }: PageProps<"/g/[slug]/me">) {
  return (
    <>
      <HeaderLights />
      <main className={cn(pageClass, "pt-4")}>
        <Suspense fallback={<PageFallback />}>
          <MemberHome params={params} searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

function PageTitle({ eyebrow, children }: { eyebrow?: string; children: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-2 pt-4 pb-3">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h1 className="font-display text-heading-lg break-words">{children}</h1>
    </header>
  );
}

async function MemberHome({ params, searchParams }: PageProps<"/g/[slug]/me">) {
  const { slug } = await params;
  if (!isValidSlug(slug)) notFound();

  const [group, session, token, query, organizer, pendingSwitch] = await Promise.all([
    getGroupSummary(slug),
    getMemberSession(slug),
    getOwnToken("member", slug),
    searchParams,
    getCurrentOrganizer(slug),
    getPendingSwitch(slug),
  ]);
  if (!group) notFound();

  if (session.kind === "removed") {
    return (
      <>
        <RememberGroup slug={slug} name={group.name} role="member" forget />
        <PageTitle>{group.name}</PageTitle>
        <RemovedNotice />
      </>
    );
  }

  if (session.kind === "none") {
    return (
      <>
        <RememberGroup slug={slug} name={group.name} role="member" forget />
        <PageTitle>{group.name}</PageTitle>
        <Card>
          <CardTitle>Hindi ka pa namin kilala sa device na &apos;to.</CardTitle>
          <CardContent>
            <CardDescription>
              Kung kasali ka na, bumalik gamit ang pangalan at PIN mo, o buksan ang personal link mo.
            </CardDescription>
            <Button asChild className="w-full">
              <Link href={`/g/${slug}?bumalik=1`}>Bumalik gamit ang PIN</Link>
            </Button>
            {group.status === "OPEN" && (
              <Button asChild variant="secondary" className="w-full">
                <Link href={`/g/${slug}`}>Join the group</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </>
    );
  }

  const { member } = session;

  // Another member's link was opened on this device: confirm before switching.
  if (pendingSwitch) {
    return (
      <>
        <PageTitle>{group.name}</PageTitle>
        <SwitchConfirm
          slug={slug}
          current={pendingSwitch.current.displayName}
          other={pendingSwitch.other.displayName}
        />
      </>
    );
  }
  const welcome = query.welcome === "1";
  const drawn = group.status !== "OPEN";
  // Only this member's own receiver, looked up by the id from their cookie.
  // Who gave to them: only after the reveal (getOwnGiver checks too).
  const [receiver, receiverWishlist, myWishlist, themeWeeks, giver] = await Promise.all([
    drawn ? getOwnReceiver(member.id) : null,
    drawn ? getReceiverWishlist(member.id) : [],
    listWishlist(member.id),
    getThemeWeeks(group.id),
    group.status === "REVEALED" ? getOwnGiver(member.id) : null,
  ]);
  // "Today" in the group's timezone (Asia/Manila), never the server's (UTC on Vercel).
  const theme = themeCard(getThemeStatus(themeWeeks, group.partyDate, todayIn(group.timezone)), themeWeeks, group.budget);

  // The personal link. Right after joining it's the first thing on the
  // page, with "Send to yourself" as the main button; later it sits at the
  // bottom.
  const personalLink = token && (
    <Card>
      <CardHeader>
        <CardTitle>{welcome ? "Save this link!" : "Your personal link"}</CardTitle>
        <CardDescription>
          Ito ang susi mo para makabalik dito. I-send sa sarili mo (Messenger o Notes), o gamitin ang pangalan at PIN
          mo. Huwag i-share sa GC.
        </CardDescription>
      </CardHeader>
      <ShareLink
        path={personalLinkPath("member", slug, token)}
        shareText={`Personal link ko sa ${group.name} (huwag i-share)`}
        prominent={welcome}
      />
    </Card>
  );

  const codename = (
    <p className="py-2 text-center font-medium text-ube-soft">
      Codename mo: <span className="font-hand text-hand text-ube">{member.codename}</span>
    </p>
  );

  return (
    <>
      <RememberGroup slug={slug} name={group.name} role="member" />
      {welcome && <CleanWelcomeParam />}
      {organizer && <RoleSwitch slug={slug} current="member" />}
      <PageTitle eyebrow={group.name}>Hi, {member.displayName}!</PageTitle>

      {welcome && personalLink}

      {drawn ? (
        <>
          {receiver?.changedAt && <MonitoUpdatedNotice slug={slug} />}
          {receiver ? (
            // Signature moment #3: the full unfold plays once; later visits
            // show the slip already open (docs/DESIGN.md).
            <div className="flex flex-col gap-4">
              <MonitoReveal
                slug={slug}
                receiverName={receiver.displayName}
                alreadyOpened={receiver.slipOpenedAt !== null}
                codename={codename}
              >
                <Card>
                  <CardTitle>Wishlist ni {receiver.displayName}</CardTitle>
                  <WishlistView
                    items={receiverWishlist}
                    emptyText={`Wala pang wishlist si ${receiver.displayName}. Balikan mo mamaya!`}
                  />
                </Card>
              </MonitoReveal>
            </div>
          ) : (
            <>
              <Card>
                <CardTitle>Ang monito mo ay…</CardTitle>
                <CardDescription>Inaayos pa ng organizer ang bunutan. Balik ka in a bit.</CardDescription>
              </Card>
              {codename}
            </>
          )}
        </>
      ) : (
        <>
          <section className="flex flex-col items-center gap-4 py-4" aria-label="Your codename">
            <p className="font-medium text-ube-soft">Ang codename mo:</p>
            <Slip>{member.codename}</Slip>
          </section>
          <Card>
            <CardHeader>
              <CardTitle>Waiting for the bunutan…</CardTitle>
              <CardDescription>Hintayin si organizer na mag-draw ng names.</CardDescription>
            </CardHeader>
            <GroupFacts partyDate={group.partyDate} budget={group.budget} memberCount={group.memberCount} />
          </Card>
        </>
      )}

      {giver && (
        <Card>
          <CardTitle>Ang nagbigay sa&apos;yo ay…</CardTitle>
          <p className="font-hand text-hand-lg">{giver.displayName}!</p>
          <CardDescription>
            Siya pala si <span className="font-hand text-hand-sm text-ube">{giver.codename}</span>.
          </CardDescription>
        </Card>
      )}

      {!member.hasPin && <SetPinCard slug={slug} />}

      <ThemeCard aria-label="Theme this week" label={theme.label} title={theme.title} detail={theme.detail} />

      {drawn && (
        <Card>
          <GroupFacts partyDate={group.partyDate} budget={group.budget} />
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Wishlist mo</CardTitle>
          <p className="text-small font-medium text-ube-soft">Makikita ito ng nakabunot sa&apos;yo, at wala nang iba.</p>
        </CardHeader>
        <WishlistEditor slug={slug} items={myWishlist} />
      </Card>

      {!welcome && personalLink}
    </>
  );
}
