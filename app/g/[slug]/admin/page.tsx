import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CopyLink } from "@/components/copy-link";
import { DemoGuide } from "@/components/demo/demo-guide";
import { joinStates, Lights } from "@/components/lights";
import { Brand } from "@/components/brand";
import { Narrow, pageClass } from "@/components/page";
import { RememberGroup } from "@/components/remember-group";
import { RoleSwitch } from "@/components/role-switch";
import { Button } from "@/components/ui/button";
import { Capiz, Listahan, SectionTitle } from "@/components/ui/paper";
import { formatJoinedAt, joinedCount } from "@/lib/format";
import { mostHaveOpened } from "@/lib/reminder";
import { daysBetween, getThemeStatus } from "@/lib/theme-status";
import { formatShortDate, THEME_WEEK_TAG, themeWeekStates, todayIn } from "@/lib/theme-weeks";
import { cn } from "@/lib/utils";
import { getCurrentMember, getCurrentOrganizer, hasGroupCookie, isValidSlug } from "@/server/auth";
import type { GroupStatus } from "@/server/db/schema";
import { checkDrawFeasibility } from "@/server/draw-check";
import { countAssignments, countSlipsOpened, hasOpenedOwnSlip } from "@/server/draw-service";
import { getDrawSetup, toExclusions } from "@/server/exclusions";
import { editableDetails, getGroupPreview } from "@/server/groups";
import { getOrganizerView } from "@/server/members";
import { AdminFallback } from "@/components/loading-shapes";
import { GoneGroupNotice, GroupFacts } from "../group-facts";
import { DrawSection } from "./draw-section";
import { EditDetails } from "./edit-details";
import { ExclusionsSection } from "./exclusions-section";
import { MemberList } from "./member-list";
import { ReminderCard } from "./reminder-card";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = {
  title: "Organizer · Monito Monita",
};

const STATUS_LABEL: Record<GroupStatus, string> = {
  OPEN: "Open: tumatanggap pa ng members",
  DRAWN: "Na-draw na ang names",
  REVEALING: "Nagre-reveal na",
  REVEALED: "Reveal na!",
};

/** From 840px the organizer page gets two columns, so it needs the wide frame earlier than other pages. */
const organizerPageClass = cn(pageClass, "pt-[22px] min-[840px]:max-w-[calc(1120px+4rem)] min-[840px]:px-8 lg:pt-[42px]");

export default function OrganizerPage({ params }: PageProps<"/g/[slug]/admin">) {
  return (
    <PageTransition>
    <Suspense
      fallback={
        <main className={organizerPageClass}>
          <AdminFallback />
        </main>
      }
    >
      <OrganizerContent params={params} />
    </Suspense>
    </PageTransition>
  );
}

/**
 * The header line (docs/design/12–14): the wordmark, and for someone who
 * is also a member the folder tabs, on a 1.5px ube line. Phones with tabs
 * show only the tabs.
 */
function HeaderLine({ slug, tabs }: { slug: string; tabs: boolean }) {
  return (
    <div className="border-b-[1.5px] border-ube">
      <div className="mx-auto flex items-end justify-between gap-4 px-5 pt-3.5 min-[600px]:max-w-[600px] min-[840px]:max-w-[calc(1120px+4rem)] min-[840px]:px-8 lg:pt-4">
        <Brand className={cn("mb-3", tabs && "hidden lg:block")} />
        {tabs && <RoleSwitch slug={slug} current="organizer" />}
      </div>
    </div>
  );
}

async function OrganizerContent({ params }: Pick<PageProps<"/g/[slug]/admin">, "params">) {
  const { slug } = await params;
  if (!isValidSlug(slug)) notFound();

  const organizer = await getCurrentOrganizer(slug);
  if (!organizer && !(await getGroupPreview(slug))) {
    // Gone, but this browser was in it: a demo that expired or was reset.
    if (!(await hasGroupCookie(slug))) notFound();
    return (
      <>
        <HeaderLine slug={slug} tabs={false} />
        <main className={organizerPageClass}>
          <Narrow>
            <RememberGroup slug={slug} name="" role="organizer" forget />
            <GoneGroupNotice />
          </Narrow>
        </main>
      </>
    );
  }
  if (!organizer) {
    return (
      <>
        <HeaderLine slug={slug} tabs={false} />
        <main className={organizerPageClass}>
          <Narrow>
            {/* This device's organizer link no longer works: drop it from "Your groups". */}
            <RememberGroup slug={slug} name="" role="organizer" forget />
            <Capiz aria-labelledby="organizer-only-title">
              <SectionTitle id="organizer-only-title">Para sa organizer lang ang page na &apos;to.</SectionTitle>
              <p className="text-ube-soft">
                Kung ikaw ang organizer, buksan ang organizer link mo (yung binigay nang ginawa mo ang group). Kung member
                ka, gamitin ang personal link mo.
              </p>
              <Button asChild variant="secondary" className="self-start">
                <Link href={`/g/${slug}/me`}>Pumunta sa slip ko</Link>
              </Button>
            </Capiz>
          </Narrow>
        </main>
      </>
    );
  }

  const [view, member, setup, drawnCount, slipsOpened] = await Promise.all([
    getOrganizerView(organizer.groupId),
    getCurrentMember(slug),
    getDrawSetup(organizer.groupId),
    countAssignments(organizer.groupId),
    countSlipsOpened(organizer.groupId),
  ]);
  if (!view) notFound();
  const { group, themes } = view;
  const isOpen = group.status === "OPEN";
  // Right after the draw (until most have opened their slip), the GC
  // message defaults to "Na-draw na!" (inside the Names drawn card) and the
  // organizer's own slip is offered.
  const justDrawn = group.status === "DRAWN" && !mostHaveOpened(slipsOpened);
  const ownSlipWaiting = Boolean(member) && justDrawn && !(await hasOpenedOwnSlip(member!.id));
  // Same algorithm as the real draw, so the warning always matches.
  const feasibility = checkDrawFeasibility(setup.members, toExclusions(setup.pairs));
  // "Today" in the group's timezone, not the server's (UTC on Vercel).
  const today = todayIn(group.timezone);
  const themeStatus = getThemeStatus(themes, group.partyDate, today);
  // Party day is near (or here): the reveal goes to the top of the page,
  // where a phone in the organizer's hand finds it (persona test C7).
  const partyNear = group.status === "DRAWN" && daysBetween(today, group.partyDate) <= 2;
  const memberCount = view.members.length;

  const reminderData = {
    slug,
    groupName: group.name,
    status: group.status,
    memberCount,
    partyDate: group.partyDate,
    budget: group.budget,
    theme: themeStatus,
  };

  // --- Sections, ordered by stage below ------------------------------------

  const joinAsMember = !member && isOpen && (
    <section className="flex flex-col gap-2.5">
      <SectionTitle>Kasali ka rin ba?</SectionTitle>
      <p className="text-ube-soft">Are you joining too? Sali ka rin para makabunot ka.</p>
      <Button asChild variant="secondary" className="self-start">
        <Link href={`/g/${slug}`}>Join as a member</Link>
      </Button>
    </section>
  );

  // Before the draw: the join count with one bulb per member (newest lit
  // pale with rays), on the capiz card with the link.
  const shareLink = isOpen ? (
    <Capiz aria-label="Share link">
      <Lights
        plan={joinStates(memberCount)}
        label={<SectionTitle as="h2">{joinedCount(memberCount)}</SectionTitle>}
        rowClassName="mx-auto h-9 w-full max-w-[420px] lg:h-[52px]"
      />
      <p className="text-small text-ube-soft">I-paste sa GC para makasali ang lahat.</p>
      <CopyLink path={`/g/${slug}`} label="Copy link" />
    </Capiz>
  ) : (
    <section aria-labelledby="share-title" className="flex flex-col gap-2.5">
      <SectionTitle id="share-title">Share link (para sa GC)</SectionTitle>
      <p className="text-small text-ube-soft">Sarado na ang sali, pero dadalhin nito ang members sa slip nila.</p>
      <CopyLink path={`/g/${slug}`} label="Copy link" />
    </section>
  );

  const reminder = (
    <ReminderCard
      // A fresh default ("Na-draw na!") once the names are drawn.
      key={isOpen ? "open" : justDrawn ? "just-drawn" : "drawn"}
      {...reminderData}
      defaultKind={justDrawn ? "drawn" : "theme"}
      prominent={group.status === "DRAWN"}
    />
  );

  const bunutan = (
    <DrawSection
      slug={slug}
      status={group.status}
      drawnCount={drawnCount}
      slipsOpened={slipsOpened}
      blockedReason={
        feasibility.status === "ok"
          ? null
          : feasibility.status === "too_few"
            ? feasibility.message
            : "Ayusin muna ang mga bawal magkabunot."
      }
      announce={justDrawn ? reminder : undefined}
    />
  );

  const ownSlip = ownSlipWaiting && (
    <section className="flex flex-col gap-2.5">
      <SectionTitle>Kasali ka rin, kaya may slip ka.</SectionTitle>
      <p className="text-ube-soft">Buksan mo na rin ang sa&apos;yo.</p>
      <Button asChild variant="secondary" className="self-start">
        <Link href={`/g/${slug}/me`}>Buksan ang slip mo</Link>
      </Button>
    </section>
  );

  const membersCard = (
    <MemberList
      slug={slug}
      canRemove={group.status === "OPEN" || group.status === "DRAWN"}
      drawn={!isOpen}
      members={view.members.map((m) => ({
        id: m.id,
        displayName: m.displayName,
        joinedLabel: formatJoinedAt(m.joinedAt, group.timezone),
        linkStatus: m.linkStatus,
        pinLocked: m.pinLocked,
        pinTempLocked: m.pinTempLocked,
        slipOpened: m.slipOpened,
      }))}
    />
  );

  const exclusions = (
    <ExclusionsSection
      slug={slug}
      members={setup.members}
      pairs={setup.pairs.map((p) => ({ id: p.id, memberAName: p.memberAName, memberBName: p.memberBName }))}
      editable={isOpen}
      warning={isOpen && feasibility.status === "impossible" ? feasibility.message : null}
    />
  );

  // The party reveal. Links only: no pairs on this page.
  const reveal = !isOpen && (
    <section aria-labelledby="reveal-title" className="flex flex-col gap-2.5">
      <SectionTitle id="reveal-title">Party reveal</SectionTitle>
      <p className="text-ube-soft">
        {group.status === "DRAWN" && "Sa party: buksan sa laptop o TV at isa-isang ipakita kung sino ang nagbigay kanino."}
        {group.status === "REVEALING" && "Ongoing ang reveal. Ituloy kung saan ka huminto."}
        {group.status === "REVEALED" && "Tapos na! Makikita na ng lahat kung sino ang nagbigay sa kanila."}
      </p>
      <Button
        asChild
        variant={group.status === "REVEALING" || partyNear ? "default" : "secondary"}
        className={group.status === "REVEALING" || partyNear ? "w-full lg:w-fit" : "self-start"}
      >
        <Link href={`/g/${slug}/reveal`}>
          {group.status === "DRAWN" && "Open the reveal screen"}
          {group.status === "REVEALING" && "Continue the reveal"}
          {group.status === "REVEALED" && "See all pairs"}
        </Link>
      </Button>
    </section>
  );

  // This week tagged, weeks that are over dimmed (as members see it on /me).
  const weekStates = themeWeekStates(
    themes.map((t) => t.startDate),
    today,
  );
  const themeWeeks = themes.length > 0 && (
    <Listahan title="Weekly themes" titleId="themes-title">
      <ol aria-labelledby="themes-title">
        {themes.map((theme, i) => {
          const state = weekStates[i];
          const tag = THEME_WEEK_TAG[state];
          return (
            <li
              key={`${theme.startDate}-${theme.title}`}
              className={cn("lst-row", state === "past" && "text-ube-soft")}
              aria-current={state === "current" ? "date" : undefined}
            >
              <span className="min-w-0 truncate">
                <strong>Week {i + 1}</strong> · {theme.title}
              </span>
              <span className="shrink-0 text-small">
                {tag && <span className={cn("font-bold", state === "current" ? "text-dahon" : "")}>{tag} · </span>}
                <span className="text-ube-soft">{formatShortDate(theme.startDate)}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </Listahan>
  );

  const editable = editableDetails(group.status);
  const details = (
    <div className="flex flex-col gap-[18px]">
      <GroupFacts partyDate={group.partyDate} budget={group.budget} year />
      {editable.any && (
        <EditDetails
          slug={slug}
          all={editable.all}
          details={{ name: group.name, budget: group.budget, partyDate: group.partyDate, themes: themes.map((t) => t.title) }}
        />
      )}
    </div>
  );

  // Demo groups: the banner and what to try, first on the left.
  const demoGuide = group.isDemo && <DemoGuide slug={slug} current="admin" />;

  // Phones: one column, in the order below for each stage. From 840px:
  // the members listahan on the right; everything else, in the same
  // order, on the left.
  const sections: Section[] = isOpen
    ? // Before the draw: get everyone in, set the bawal pairs, then draw.
      [
        { key: "demo", node: demoGuide },
        { key: "share", node: shareLink },
        { key: "join", node: joinAsMember },
        { key: "exclusions", node: exclusions },
        { key: "bunutan", node: bunutan },
        { key: "members", right: true, node: membersCard },
        { key: "reminder", node: reminder },
        { key: "themes", node: themeWeeks },
        { key: "details", node: details },
      ]
    : // After the draw: track slips, remind the GC, then the rest.
      [
        { key: "demo", node: demoGuide },
        { key: "reveal-now", node: (group.status === "REVEALING" || partyNear) && reveal },
        { key: "bunutan", node: bunutan },
        { key: "reminder", node: !justDrawn && reminder },
        { key: "own-slip", node: ownSlip },
        { key: "members", right: true, node: membersCard },
        { key: "reveal", node: group.status !== "REVEALING" && !partyNear && reveal },
        { key: "share", node: shareLink },
        { key: "exclusions", node: exclusions },
        { key: "themes", node: themeWeeks },
        { key: "details", node: details },
      ];

  return (
    <>
      <RememberGroup slug={slug} name={group.name} role="organizer" />
      <HeaderLine slug={slug} tabs={Boolean(member)} />
      <main className={organizerPageClass}>
        <Dashboard
          header={
            <header className="flex flex-col gap-1.5">
              <p className="sr-only">Organizer</p>
              <h1 className="font-head text-title break-words lg:text-title-lg">{group.name}</h1>
              <p className="font-bold text-dahon">{STATUS_LABEL[group.status]}</p>
            </header>
          }
          sections={sections}
        />
      </main>
    </>
  );
}

interface Section {
  key: string;
  /** The members listahan: the right column from 840px. */
  right?: boolean;
  node: ReactNode;
}

/**
 * The organizer page's sections in phone order (the DOM order, so phones
 * and screen readers read them as listed). From 840px the members
 * listahan sits in the right column, spanning every row plus a flexible
 * one so a long list doesn't spread the left cards apart; the rest stack
 * in the left column in the same order.
 */
function Dashboard({ header, sections }: { header: ReactNode; sections: Section[] }) {
  const shown = sections.filter((s) => Boolean(s.node));
  const leftCount = shown.filter((s) => !s.right).length + 1;
  let left = 1;
  return (
    <div
      className="flex flex-col gap-[18px] min-[840px]:grid min-[840px]:grid-cols-[minmax(0,1fr)_340px] min-[840px]:items-start min-[840px]:gap-x-8 min-[840px]:gap-y-[22px] min-[840px]:[grid-template-rows:var(--rows)] lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-x-12"
      style={{ "--rows": `repeat(${leftCount}, auto) 1fr` } as CSSProperties}
    >
      <div className="min-[840px]:col-start-1 min-[840px]:row-start-1">{header}</div>
      {shown.map((s) => {
        const col = s.right ? "2" : "1";
        const row = s.right ? `1 / span ${leftCount + 1}` : String(++left);
        return (
          <div
            key={s.key}
            data-area={s.right ? "right" : "left"}
            className="flex min-w-0 flex-col gap-[18px] min-[840px]:[grid-column:var(--col)] min-[840px]:[grid-row:var(--row)] lg:gap-[22px]"
            style={{ "--col": col, "--row": row } as CSSProperties}
          >
            {s.node}
          </div>
        );
      })}
    </div>
  );
}
