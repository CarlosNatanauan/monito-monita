import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CopyLink } from "@/components/copy-link";
import { joinStates, Lights } from "@/components/lights";
import { RememberGroup } from "@/components/remember-group";
import { RoleSwitch } from "@/components/role-switch";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatJoinedAt, joinedCount } from "@/lib/format";
import { mostHaveOpened } from "@/lib/reminder";
import { getThemeStatus } from "@/lib/theme-status";
import { formatShortDate, todayIn } from "@/lib/theme-weeks";
import { cn } from "@/lib/utils";
import { getCurrentMember, getCurrentOrganizer, isValidSlug } from "@/server/auth";
import type { GroupStatus } from "@/server/db/schema";
import { checkDrawFeasibility } from "@/server/draw-check";
import { countAssignments, countSlipsOpened, hasOpenedOwnSlip } from "@/server/draw-service";
import { getDrawSetup, toExclusions } from "@/server/exclusions";
import { getOrganizerView } from "@/server/members";
import { Eyebrow, pageClass } from "@/components/page";
import { GroupFacts, PageFallback } from "../group-facts";
import { DrawSection } from "./draw-section";
import { ExclusionsSection } from "./exclusions-section";
import { MemberList } from "./member-list";
import { ReminderCard } from "./reminder-card";

export const metadata: Metadata = {
  title: "Organizer · Monito Monita",
};

const STATUS_LABEL: Record<GroupStatus, string> = {
  OPEN: "Open: tumatanggap pa ng members",
  DRAWN: "Na-draw na ang names",
  REVEALING: "Nagre-reveal na",
  REVEALED: "Reveal na!",
};

export default function OrganizerPage({ params }: PageProps<"/g/[slug]/admin">) {
  return (
    <main className={cn(pageClass, "pt-5 md:max-w-2xl")}>
      <Suspense fallback={<PageFallback />}>
        <OrganizerContent params={params} />
      </Suspense>
    </main>
  );
}

async function OrganizerContent({ params }: Pick<PageProps<"/g/[slug]/admin">, "params">) {
  const { slug } = await params;
  if (!isValidSlug(slug)) notFound();

  const organizer = await getCurrentOrganizer(slug);
  if (!organizer) {
    return (
      <>
        {/* This device's organizer link no longer works: drop it from "Your groups". */}
        <RememberGroup slug={slug} name="" role="organizer" forget />
        <Card className="mt-6">
          <CardTitle>Para sa organizer lang ang page na &apos;to.</CardTitle>
          <CardDescription>
            Kung ikaw ang organizer, buksan ang organizer link mo (yung binigay nang ginawa mo ang group). Kung member
            ka, gamitin ang personal link mo.
          </CardDescription>
        </Card>
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
  // reminder defaults to "Na-draw na!" and the organizer's own slip is offered.
  const justDrawn = group.status === "DRAWN" && !mostHaveOpened(slipsOpened);
  const ownSlipWaiting = Boolean(member) && justDrawn && !(await hasOpenedOwnSlip(member!.id));
  // Same algorithm as the real draw, so the warning always matches.
  const feasibility = checkDrawFeasibility(setup.members, toExclusions(setup.pairs));
  // "Today" in the group's timezone, not the server's (UTC on Vercel).
  const themeStatus = getThemeStatus(themes, group.partyDate, todayIn(group.timezone));
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
    <Card>
      <CardHeader>
        <CardTitle>Kasali ka rin ba?</CardTitle>
        <CardDescription>Are you joining too? Sali ka rin para makabunot ka.</CardDescription>
      </CardHeader>
      <Button asChild variant="secondary">
        <Link href={`/g/${slug}`}>Join as a member</Link>
      </Button>
    </Card>
  );

  // Before the draw: the join count with one bulb per member (newest glows).
  const shareLink = isOpen ? (
    <Card>
      <Lights plan={joinStates(memberCount)} label={<CardTitle>{joinedCount(memberCount)}</CardTitle>} />
      <p>I-paste sa GC para makasali ang lahat.</p>
      <CopyLink path={`/g/${slug}`} label="Copy link" variant="secondary" />
    </Card>
  ) : (
    <Card>
      <CardHeader>
        <CardTitle>Share link (para sa GC)</CardTitle>
        <CardDescription>Sarado na ang sali, pero dadalhin nito ang members sa slip nila.</CardDescription>
      </CardHeader>
      <CopyLink path={`/g/${slug}`} label="Copy link" variant="secondary" />
    </Card>
  );

  const bunutan = (
    <Card>
      {isOpen && <CardTitle>Bunutan</CardTitle>}
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
              : "Ayusin muna ang mga bawal sa itaas."
        }
      />
    </Card>
  );

  const reminder = (
    <Card>
      <CardTitle>Paalala para sa GC</CardTitle>
      <ReminderCard
        {...reminderData}
        defaultKind={justDrawn ? "drawn" : "theme"}
        prominent={group.status === "DRAWN"}
      />
    </Card>
  );

  const ownSlip = ownSlipWaiting && (
    <Card>
      <CardHeader>
        <CardTitle>Kasali ka rin, kaya may slip ka.</CardTitle>
        <CardDescription>Buksan mo na rin ang sa&apos;yo.</CardDescription>
      </CardHeader>
      <Button asChild variant="secondary">
        <Link href={`/g/${slug}/me`}>Buksan ang slip mo</Link>
      </Button>
    </Card>
  );

  const membersCard = (
    <Card>
      <CardTitle>Members ({memberCount})</CardTitle>
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
          slipOpened: m.slipOpened,
        }))}
      />
    </Card>
  );

  const exclusions = (
    <Card>
      <CardHeader>
        <CardTitle>Bawal magkabunot</CardTitle>
        <p>Can&apos;t draw each other, halimbawa mag-asawa o magkapatid.</p>
      </CardHeader>
      <ExclusionsSection
        slug={slug}
        members={setup.members}
        pairs={setup.pairs.map((p) => ({ id: p.id, memberAName: p.memberAName, memberBName: p.memberBName }))}
        editable={isOpen}
        warning={isOpen && feasibility.status === "impossible" ? feasibility.message : null}
      />
    </Card>
  );

  // The party reveal (plain for now). Links only: no pairs on this page.
  const reveal = !isOpen && (
    <Card>
      <CardHeader>
        <CardTitle>Party reveal</CardTitle>
        <CardDescription>
          {group.status === "DRAWN" &&
            "Sa party: buksan sa laptop o TV at isa-isang ipakita kung sino ang nagbigay kanino."}
          {group.status === "REVEALING" && "Ongoing ang reveal. Ituloy kung saan ka huminto."}
          {group.status === "REVEALED" && "Tapos na! Makikita na ng lahat kung sino ang nagbigay sa kanila."}
        </CardDescription>
      </CardHeader>
      <Button asChild variant={group.status === "REVEALING" ? "default" : "secondary"}>
        <Link href={`/g/${slug}/reveal`}>
          {group.status === "DRAWN" && "Open the reveal screen"}
          {group.status === "REVEALING" && "Continue the reveal"}
          {group.status === "REVEALED" && "See all pairs"}
        </Link>
      </Button>
    </Card>
  );

  const details = (
    <Card>
      <GroupFacts partyDate={group.partyDate} budget={group.budget} />
    </Card>
  );

  const themeWeeks = themes.length > 0 && (
    <Card>
      <CardTitle>Theme weeks</CardTitle>
      <ol className="flex flex-col rows-dashed">
        {themes.map((theme) => (
          <li
            key={`${theme.startDate}-${theme.title}`}
            className="flex justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <span>{theme.title}</span>
            <span className="shrink-0 text-small font-medium text-ube-soft">{formatShortDate(theme.startDate)}</span>
          </li>
        ))}
      </ol>
    </Card>
  );

  return (
    <>
      <RememberGroup slug={slug} name={group.name} role="organizer" />
      {member && <RoleSwitch slug={slug} current="organizer" />}
      <header className="flex flex-col gap-2 pt-5 pb-3">
        <Eyebrow>Organizer</Eyebrow>
        <h1 className="font-display text-heading-lg break-words">{group.name}</h1>
        <p className="mt-2 font-bold text-dahon">{STATUS_LABEL[group.status]}</p>
      </header>

      {isOpen ? (
        // Before the draw: get everyone in, set the bawal pairs, then draw.
        <>
          {shareLink}
          {joinAsMember}
          {exclusions}
          {bunutan}
          {membersCard}
          {reminder}
          {themeWeeks}
          {details}
        </>
      ) : (
        // After the draw: track slips, remind the GC, then the rest.
        <>
          {group.status === "REVEALING" && reveal}
          {bunutan}
          {reminder}
          {ownSlip}
          {membersCard}
          {group.status !== "REVEALING" && reveal}
          {shareLink}
          {exclusions}
          {themeWeeks}
          {details}
        </>
      )}
    </>
  );
}
