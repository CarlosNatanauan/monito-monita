import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PrivateLink } from "@/components/copy-link";
import { colClass, colsClass, LightString, Name, Narrow, pageClass, stickyClass } from "@/components/page";
import { RememberGroup } from "@/components/remember-group";
import { RoleSwitch } from "@/components/role-switch";
import { BunutanSlip } from "@/components/slip/bunutan-slip";
import { Button } from "@/components/ui/button";
import { Capiz, Listahan, SecretCard, SectionTitle, ThemeSheet } from "@/components/ui/paper";
import { WishlistView } from "@/components/wish-item";
import { formatPeso } from "@/lib/format";
import { getThemeStatus, themeCard } from "@/lib/theme-status";
import { todayIn } from "@/lib/theme-weeks";
import { cn } from "@/lib/utils";
import {
  getCurrentOrganizer,
  getMemberSession,
  getOwnToken,
  getPendingSwitch,
  isValidSlug,
  personalLinkPath,
} from "@/server/auth";
import { getOwnReceiver } from "@/server/draw-service";
import { getThemeWeeks } from "@/server/groups";
import { getGroupSummary } from "@/server/members";
import { getOwnGiver } from "@/server/reveal";
import { getReceiverWishlist, listWishlist } from "@/server/wishlists";
import { GroupFacts, PageFallback, RemovedNotice } from "../group-facts";
import { MonitoReveal, MonitoSlip, WhenOpened } from "./monito-reveal";
import { MonitoUpdatedNotice } from "./monito-updated";
import { CleanWelcomeParam } from "./rare-cards";
import { SetPinCard } from "./set-pin-card";
import { SwitchConfirm } from "./switch-confirm";
import { WishlistEditor } from "./wishlist-editor";

export const metadata: Metadata = {
  title: "My monito · Monito Monita",
};

export default function MemberHomePage({ params, searchParams }: PageProps<"/g/[slug]/me">) {
  return (
    <>
      <LightString controller />
      <main className={cn(pageClass, "pt-1.5 lg:pt-3")}>
        <Suspense fallback={<PageFallback />}>
          <MemberHome params={params} searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

function GroupTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="font-head text-display break-words lg:text-display-lg">{children}</h1>;
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
      <Narrow>
        <RememberGroup slug={slug} name={group.name} role="member" forget />
        <GroupTitle>{group.name}</GroupTitle>
        <RemovedNotice />
      </Narrow>
    );
  }

  if (session.kind === "none") {
    return (
      <Narrow>
        <RememberGroup slug={slug} name={group.name} role="member" forget />
        <GroupTitle>{group.name}</GroupTitle>
        <Capiz>
          <SectionTitle>Hindi ka pa namin kilala sa device na &apos;to.</SectionTitle>
          <p className="text-ube-soft">
            Kung kasali ka na, bumalik gamit ang pangalan at PIN mo, o buksan ang personal link mo.
          </p>
          <div className="flex flex-col gap-2.5 self-stretch">
            <Button asChild className="w-full">
              <a href={`/g/${slug}?bumalik=1`}>Bumalik gamit ang PIN</a>
            </Button>
            {group.status === "OPEN" && (
              <Button asChild variant="secondary" className="w-full">
                <a href={`/g/${slug}`}>Join the group</a>
              </Button>
            )}
          </div>
        </Capiz>
      </Narrow>
    );
  }

  const { member } = session;

  // Another member's link was opened on this device: confirm before switching.
  if (pendingSwitch) {
    return (
      <Narrow>
        <GroupTitle>{group.name}</GroupTitle>
        <SwitchConfirm slug={slug} current={pendingSwitch.current.displayName} other={pendingSwitch.other.displayName} />
      </Narrow>
    );
  }

  const welcome = query.welcome === "1";
  const drawn = group.status !== "OPEN";
  const revealed = group.status === "REVEALED";
  // Only this member's own receiver, looked up by the id from their cookie.
  // Who gave to them: only after the reveal (getOwnGiver checks too).
  const [receiver, receiverWishlist, myWishlist, themeWeeks, giver] = await Promise.all([
    drawn ? getOwnReceiver(member.id) : null,
    drawn && !revealed ? getReceiverWishlist(member.id) : [],
    revealed ? [] : listWishlist(member.id),
    getThemeWeeks(group.id),
    revealed ? getOwnGiver(member.id) : null,
  ]);
  // "Today" in the group's timezone (Asia/Manila), never the server's (UTC on Vercel).
  const theme = themeCard(getThemeStatus(themeWeeks, group.partyDate, todayIn(group.timezone)), themeWeeks, group.budget);

  const greeting = (
    <header>
      <h1 className="font-head text-display lg:text-display-lg">
        Hi, <Name>{member.displayName}</Name>!
      </h1>
      <p className="mt-1 text-ube-soft">{group.name}</p>
    </header>
  );

  // The personal link on pink paper, masked until "Ipakita". Right after
  // joining it's the first card ("I-save ang link mo!"); later it sits
  // under the slip.
  const personalLink = token && (
    <SecretCard aria-labelledby="personal-link-title">
      <SectionTitle id="personal-link-title">{welcome ? "I-save ang link mo!" : "Personal link mo"}</SectionTitle>
      <p className="text-small">Para makabalik nang walang PIN. Sa&apos;yo lang &apos;to, huwag i-share sa GC.</p>
      <PrivateLink
        path={personalLinkPath("member", slug, token)}
        maskedLabel="Personal link (nakatago). Gamitin ang Ipakita o Copy."
        copyAriaLabel="Copy my link"
        shareText={`Personal link ko sa ${group.name} (huwag i-share)`}
        prominent={welcome}
      />
      <p className="text-small text-ube-soft">Halimbawa: i-send sa sarili mong Messenger o i-save sa Notes.</p>
    </SecretCard>
  );

  const codename = (
    <p className="text-ube-soft">
      Codename mo: <Name className="text-ube">{member.codename}</Name>
    </p>
  );

  // --- After the reveal (docs/design/11): the giver on the slip, the summary, the greeting.
  if (revealed) {
    return (
      <>
        <RememberGroup slug={slug} name={group.name} role="member" />
        {organizer && <TabsBar slug={slug} />}
        <div className={colsClass}>
          <div className={cn(colClass, "lg:col-start-1 lg:row-start-1")}>
            {greeting}
            {giver ? (
              <>
                <BunutanSlip name={giver.displayName} initiallyOpened heading="Ang nagbigay sa'yo ay…" label="Ang nagbigay sa'yo" />
                <p>
                  Si <Name>{giver.codename}</Name> pala si <Name>{giver.displayName}</Name>!
                </p>
              </>
            ) : (
              codename
            )}
          </div>
          <div className={cn(colClass, "lg:col-start-2 lg:row-start-1")}>
            <Capiz aria-labelledby="reveal-done-title">
              <SectionTitle id="reveal-done-title">Tapos na ang reveal</SectionTitle>
              {receiver && (
                <p>
                  Ang monito mo: <Name>{receiver.displayName}</Name>
                </p>
              )}
              {giver && (
                <p>
                  Nagbigay sa&apos;yo: <Name>{giver.displayName}</Name>
                </p>
              )}
            </Capiz>
            <GroupFacts partyDate={group.partyDate} budget={group.budget} year />
            <p className="font-head text-title lg:text-[28px]">
              Maligayang Pasko, <Name>{member.displayName}</Name>!
            </p>
          </div>
        </div>
      </>
    );
  }

  const themeSheet = (className?: string) => (
    <ThemeSheet aria-label="Theme this week" label={theme.label} title={theme.title} detail={theme.detail} className={className} />
  );

  // The slip hero: the bunutan slip after the draw, the codename slip before.
  // After the draw, laptops show the theme sheet under the codename (sticky
  // with the slip) so the two columns end close together; phones keep it in
  // the rest, after the receiver's wishlist. Only one copy is ever displayed.
  const hero = drawn ? (
    <>
      {receiver?.changedAt && <MonitoUpdatedNotice slug={slug} />}
      {receiver ? (
        // Signature moment #3: the full unfold plays once; later visits
        // show the slip already open (docs/DESIGN.md).
        <MonitoSlip />
      ) : (
        <Capiz>
          <SectionTitle>Ang monito mo ay…</SectionTitle>
          <p className="text-ube-soft">Inaayos pa ng organizer ang bunutan. Balik ka in a bit.</p>
        </Capiz>
      )}
      {codename}
      {themeSheet("hidden lg:block")}
    </>
  ) : (
    <>
      <SectionTitle>Hintayin ang bunutan</SectionTitle>
      <BunutanSlip name={member.codename} initiallyOpened heading="Codename mo" label="Your codename" rays={false} />
      <p className="text-ube-soft">Hintayin si organizer na mag-draw ng names. Ang codename mo ang makikita sa reveal.</p>
    </>
  );

  const rest = (
    <>
      {drawn && receiver && (
        <WhenOpened>
          <Listahan
            title={
              <>
                Wishlist ni <Name>{receiver.displayName}</Name>
              </>
            }
            titleId="their-wishlist-title"
          >
            <WishlistView
              items={receiverWishlist}
              empty={[`Wala pang wishlist si ${receiver.displayName}.`, "Balikan mo mamaya!"]}
            />
          </Listahan>
        </WhenOpened>
      )}

      {!member.hasPin && <SetPinCard slug={slug} />}

      {drawn && themeSheet("lg:hidden")}

      <GroupFacts
        partyDate={group.partyDate}
        budget={group.budget}
        memberCount={drawn ? undefined : group.memberCount}
        year
      />

      {!drawn && themeSheet()}

      <WishlistEditor slug={slug} items={myWishlist} budgetLine={`Hanggang ${formatPeso(group.budget)} ang regalo.`} />
    </>
  );

  // Phones: one column (the personal link first right after joining, else
  // last; the slip, then the rest). Laptops: the greeting, slip and personal link on
  // the left, sticky so the slip stays in view; everything else on the
  // right. The DOM keeps the phone order.
  // Each block renders once, in reading order (the DOM is the phone
  // order): the greeting, the personal link right after joining, the slip,
  // the rest, else the personal link last. Laptops: the greeting and the
  // slip on the left, the slip sticky so it stays in view (the left column
  // stretches the full height to give it room); the rest and the personal
  // link on the right.
  const layout = (
    <div className={colsClass}>
      <div className="flex min-w-0 flex-col gap-[18px] lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:gap-[22px] lg:self-stretch">
        {greeting}
        {welcome && personalLink}
        <div className={cn("flex min-w-0 flex-col gap-[18px] lg:gap-[22px]", stickyClass)}>{hero}</div>
      </div>
      <div className={cn(colClass, "lg:col-start-2 lg:row-start-1")}>{rest}</div>
      {!welcome && personalLink && <div className="min-w-0 lg:col-start-2 lg:row-start-2">{personalLink}</div>}
    </div>
  );

  return (
    <>
      <RememberGroup slug={slug} name={group.name} role="member" />
      {welcome && <CleanWelcomeParam />}
      {organizer && <TabsBar slug={slug} />}

      {drawn && receiver ? (
        <MonitoReveal slug={slug} receiverName={receiver.displayName} alreadyOpened={receiver.slipOpenedAt !== null}>
          {layout}
        </MonitoReveal>
      ) : (
        layout
      )}
    </>
  );
}

/** "My slip / Manage group" folder tabs on their line, for someone who is also the organizer. */
function TabsBar({ slug }: { slug: string }) {
  return (
    <div className="-mx-5 border-b-[1.5px] border-ube px-5 lg:mx-0 lg:px-0">
      <RoleSwitch slug={slug} current="member" />
    </div>
  );
}
