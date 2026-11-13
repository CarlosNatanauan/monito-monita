import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Slip } from "@/components/slip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { joinedCount } from "@/lib/format";
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
import { describeThemeStatus, getThemeStatus } from "@/lib/theme-status";
import { todayIn } from "@/lib/theme-weeks";
import { getReceiverWishlist, listWishlist } from "@/server/wishlists";
import { WishlistView } from "@/components/wish-item";
import { CleanWelcomeParam } from "./clean-welcome";
import { MonitoReveal } from "./monito-reveal";
import { MonitoUpdatedNotice } from "./monito-updated";
import { SetPinCard } from "./set-pin-card";
import { SwitchConfirm } from "./switch-confirm";
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
        <h1 className="text-heading">{group.name}</h1>
        <RemovedNotice />
      </>
    );
  }

  if (session.kind === "none") {
    return (
      <>
        <RememberGroup slug={slug} name={group.name} role="member" forget />
        <h1 className="text-heading">{group.name}</h1>
        <Card>
          <CardHeader>
            <CardTitle>Hindi ka pa namin kilala sa device na &apos;to.</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-ube-soft">
            <p>Kung kasali ka na, bumalik gamit ang pangalan at PIN mo, o buksan ang personal link mo.</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="self-start">
                <Link href={`/g/${slug}?bumalik=1`}>Bumalik gamit ang PIN</Link>
              </Button>
              {group.status === "OPEN" && (
                <Button asChild variant="secondary" className="self-start">
                  <Link href={`/g/${slug}`}>Join the group</Link>
                </Button>
              )}
            </div>
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
        <h1 className="text-heading">{group.name}</h1>
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
  const theme = describeThemeStatus(
    getThemeStatus(themeWeeks, group.partyDate, todayIn(group.timezone)),
    group.budget,
  );

  // The personal link. Right after joining it's the first thing on the
  // page, with "Send to yourself" as the main button; later it sits at the
  // bottom.
  const personalLink = token && (
    <Card className={cn(welcome && "ring-2 ring-margarine")}>
      <CardHeader>
        <CardTitle>{welcome ? "Save this link!" : "Your personal link"}</CardTitle>
        <p className="text-small text-ube-soft">
          Ito ang susi mo para makabalik dito. I-send sa sarili mo (Messenger o Notes), o gamitin ang pangalan at PIN
          mo. Huwag i-share sa GC.
        </p>
      </CardHeader>
      <CardContent>
        <ShareLink
          path={personalLinkPath("member", slug, token)}
          shareText={`Personal link ko sa ${group.name} (huwag i-share)`}
          prominent={welcome}
        />
      </CardContent>
    </Card>
  );

  return (
    <>
      <RememberGroup slug={slug} name={group.name} role="member" />
      {welcome && <CleanWelcomeParam />}
      {organizer && <RoleSwitch slug={slug} current="member" />}
      <header className="flex flex-col gap-2">
        <p className="text-small font-semibold text-ube-soft">{group.name}</p>
        <h1 className="text-heading">Hi, {member.displayName}!</h1>
      </header>

      {welcome && personalLink}

      {drawn ? (
        <div className="flex flex-col items-center gap-3">
          {receiver?.changedAt && <MonitoUpdatedNotice slug={slug} />}
          {receiver ? (
            // Signature moment #3: the full unfold plays once; later visits
            // show the slip already open (docs/DESIGN.md).
            <MonitoReveal slug={slug} receiverName={receiver.displayName} alreadyOpened={receiver.slipOpenedAt !== null}>
              <Card className="w-full">
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
            </MonitoReveal>
          ) : (
            <>
              <p className="text-title font-extrabold">Ang monito mo ay…</p>
              <p className="text-ube-soft">Inaayos pa ng organizer ang bunutan. Balik ka in a bit.</p>
            </>
          )}
          <p className="text-small text-ube-soft">
            Codename mo: <span className="font-hand text-body text-ube">{member.codename}</span>
          </p>
        </div>
      ) : (
        <section className="flex flex-col items-center gap-3" aria-label="Your codename">
          <p className="text-small text-ube-soft">Ang codename mo:</p>
          <Slip>{member.codename}</Slip>
        </section>
      )}

      {giver && (
        <Card>
          <CardHeader>
            <CardTitle>Ang nagbigay sa&apos;yo ay…</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <p className="text-heading">{giver.displayName}!</p>
            <p className="text-small text-ube-soft">
              Siya pala si <span className="font-hand text-body text-ube">{giver.codename}</span>.
            </p>
          </CardContent>
        </Card>
      )}

      {!member.hasPin && <SetPinCard slug={slug} />}

      <Card>
        <CardHeader>
          <CardTitle>
            {group.status === "OPEN" ? "Waiting for the bunutan…" : "Na-draw na ang names!"}
          </CardTitle>
          <p className="text-small text-ube-soft">
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
            <p className="text-small text-ube-soft">{theme.english}</p>
          </CardHeader>
          <CardContent>
            <p>{theme.detail}</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Wishlist mo</CardTitle>
          <p className="text-small text-ube-soft">Makikita ito ng nakabunot sa&apos;yo, at wala nang iba.</p>
        </CardHeader>
        <CardContent>
          <WishlistEditor slug={slug} items={myWishlist} />
        </CardContent>
      </Card>

      {!welcome && personalLink}
    </>
  );
}
