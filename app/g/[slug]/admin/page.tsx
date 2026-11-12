import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CopyLink } from "@/components/copy-link";
import { RememberGroup } from "@/components/remember-group";
import { RoleSwitch } from "@/components/role-switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatJoinedAt, joinedCount } from "@/lib/format";
import { mostHaveOpened } from "@/lib/reminder";
import { getThemeStatus } from "@/lib/theme-status";
import { formatShortDate, todayIn } from "@/lib/theme-weeks";
import { getCurrentMember, getCurrentOrganizer, isValidSlug } from "@/server/auth";
import type { GroupStatus } from "@/server/db/schema";
import { checkDrawFeasibility } from "@/server/draw-check";
import { countAssignments, countSlipsOpened, hasOpenedOwnSlip } from "@/server/draw-service";
import { getDrawSetup, toExclusions } from "@/server/exclusions";
import { getOrganizerView } from "@/server/members";
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
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-8 px-4 py-10 md:max-w-2xl">
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
        <Card>
        <CardHeader>
          <CardTitle>Para sa organizer lang ang page na &apos;to.</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Kung ikaw ang organizer, buksan ang organizer link mo (yung binigay nang ginawa mo ang group). Kung member
          ka, gamitin ang personal link mo.
          </CardContent>
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
  // Right after the draw (until most have opened their slip), lead with
  // "announce it in the GC" and the organizer's own slip.
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
        <p className="text-caption text-muted-foreground">Are you joining too? Sali ka rin para makabunot ka.</p>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link href={`/g/${slug}`}>Join as a member</Link>
        </Button>
      </CardContent>
    </Card>
  );

  const shareLink = (
    <Card>
      <CardHeader>
        <CardTitle>Share link (para sa GC)</CardTitle>
        <p className="text-caption text-muted-foreground">
          {isOpen
            ? "I-paste sa group chat para makasali ang lahat."
            : "Sarado na ang sali, pero dadalhin nito ang members sa slip nila."}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isOpen && <p className="text-title font-extrabold">{joinedCount(memberCount)}</p>}
        <CopyLink path={`/g/${slug}`} label="Copy link" variant={isOpen ? "default" : "outline"} />
      </CardContent>
    </Card>
  );

  const bunutan = (
    <Card>
      <CardHeader>
        <CardTitle>Bunutan</CardTitle>
      </CardHeader>
      <CardContent>
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
                : "Ayusin muna ang mga bawal sa baba."
          }
        />
      </CardContent>
    </Card>
  );

  const nextSteps = justDrawn && (
    <Card className="ring-2 ring-parol-gold">
      <CardHeader>
        <CardTitle>Na-draw na! I-announce sa GC</CardTitle>
        <p className="text-caption text-muted-foreground">I-copy at i-paste sa group chat para buksan ng lahat ang slip nila.</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <ReminderCard {...reminderData} defaultKind="drawn" />
        {ownSlipWaiting && (
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <p className="font-semibold">Kasali ka rin, kaya may slip ka.</p>
            <Button asChild className="self-start">
              <Link href={`/g/${slug}/me`}>Buksan ang slip mo</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const reminder = (
    <Card>
      <CardHeader>
        <CardTitle>Reminder para sa GC</CardTitle>
        <p className="text-caption text-muted-foreground">I-copy at i-paste sa group chat.</p>
      </CardHeader>
      <CardContent>
        <ReminderCard {...reminderData} defaultKind="theme" />
      </CardContent>
    </Card>
  );

  const membersCard = (
    <Card>
      <CardHeader>
        <CardTitle>Members</CardTitle>
        <p className="text-caption text-muted-foreground">{joinedCount(memberCount)}</p>
      </CardHeader>
      <CardContent>
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
          }))}
        />
      </CardContent>
    </Card>
  );

  const exclusions = (
    <Card>
      <CardHeader>
        <CardTitle>Bawal magkabunot</CardTitle>
        <p className="text-caption text-muted-foreground">Can&apos;t draw each other, halimbawa mag-asawa o magkapatid.</p>
      </CardHeader>
      <CardContent>
        <ExclusionsSection
          slug={slug}
          members={setup.members}
          pairs={setup.pairs.map((p) => ({ id: p.id, memberAName: p.memberAName, memberBName: p.memberBName }))}
          editable={isOpen}
          warning={isOpen && feasibility.status === "impossible" ? feasibility.message : null}
        />
      </CardContent>
    </Card>
  );

  // The party reveal (plain for now). Links only: no pairs on this page.
  const reveal = !isOpen && (
    <Card>
      <CardHeader>
        <CardTitle>Party reveal</CardTitle>
        <p className="text-caption text-muted-foreground">
          {group.status === "DRAWN" &&
            "Sa party: buksan sa laptop o TV at isa-isang ipakita kung sino ang nagbigay kanino."}
          {group.status === "REVEALING" && "Ongoing ang reveal. Ituloy kung saan ka huminto."}
          {group.status === "REVEALED" && "Tapos na! Makikita na ng lahat kung sino ang nagbigay sa kanila."}
        </p>
      </CardHeader>
      <CardContent>
        <Button asChild variant={group.status === "REVEALING" ? "default" : "outline"}>
          <Link href={`/g/${slug}/reveal`}>
            {group.status === "DRAWN" && "Open the reveal screen"}
            {group.status === "REVEALING" && "Continue the reveal"}
            {group.status === "REVEALED" && "See all pairs"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );

  const themeWeeks = themes.length > 0 && (
    <Card>
      <CardHeader>
        <CardTitle>Theme weeks</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-2">
          {themes.map((theme) => (
            <li key={`${theme.startDate}-${theme.title}`} className="flex justify-between gap-3">
              <span>{theme.title}</span>
              <span className="shrink-0 text-caption text-muted-foreground">{formatShortDate(theme.startDate)}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );

  return (
    <>
      <RememberGroup slug={slug} name={group.name} role="organizer" />
      {member && <RoleSwitch slug={slug} current="organizer" />}
      <header className="flex flex-col gap-4">
        <p className="text-caption font-semibold text-muted-foreground">Organizer</p>
        <h1 className="text-heading">{group.name}</h1>
        <GroupFacts partyDate={group.partyDate} budget={group.budget} memberCount={memberCount} />
        <p className="text-caption font-semibold">{STATUS_LABEL[group.status]}</p>
      </header>

      {isOpen ? (
        // Before the draw: get everyone in, then draw.
        <>
          {joinAsMember}
          {shareLink}
          {bunutan}
          {exclusions}
          {membersCard}
          {reminder}
          {themeWeeks}
        </>
      ) : (
        // After the draw: announce it, track slips, then the rest.
        <>
          {group.status === "REVEALING" && reveal}
          {nextSteps}
          {bunutan}
          {group.status !== "REVEALING" && reveal}
          {!justDrawn && reminder}
          {membersCard}
          {shareLink}
          {exclusions}
          {themeWeeks}
        </>
      )}
    </>
  );
}
