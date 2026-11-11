import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CopyLink } from "@/components/copy-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatJoinedAt, joinedCount } from "@/lib/format";
import { getThemeStatus } from "@/lib/theme-status";
import { formatShortDate, todayIn } from "@/lib/theme-weeks";
import { getCurrentMember, getCurrentOrganizer, isValidSlug } from "@/server/auth";
import type { GroupStatus } from "@/server/db/schema";
import { checkDrawFeasibility } from "@/server/draw-check";
import { countAssignments, countSlipsOpened } from "@/server/draw-service";
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
      <Card>
        <CardHeader>
          <CardTitle>Para sa organizer lang ang page na &apos;to.</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Kung ikaw ang organizer, buksan ang organizer link mo (yung binigay nang ginawa mo ang group). Kung member
          ka, gamitin ang personal link mo.
        </CardContent>
      </Card>
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
  // Same algorithm as the real draw, so the warning always matches.
  const feasibility = checkDrawFeasibility(setup.members, toExclusions(setup.pairs));
  // "Today" in the group's timezone, not the server's (UTC on Vercel).
  const themeStatus = getThemeStatus(themes, group.partyDate, todayIn(group.timezone));

  return (
    <>
      <header className="flex flex-col gap-4">
        <p className="text-caption font-semibold text-muted-foreground">Organizer</p>
        <h1 className="text-heading">{group.name}</h1>
        <GroupFacts partyDate={group.partyDate} budget={group.budget} memberCount={view.members.length} />
        <p className="text-caption font-semibold">{STATUS_LABEL[group.status]}</p>
      </header>

      {!member && isOpen && (
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
      )}

      <Card>
        <CardHeader>
          <CardTitle>Share link (para sa GC)</CardTitle>
          <p className="text-caption text-muted-foreground">I-paste sa group chat para makasali ang lahat.</p>
        </CardHeader>
        <CardContent>
          <CopyLink path={`/g/${slug}`} label="Copy link" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reminder para sa GC</CardTitle>
          <p className="text-caption text-muted-foreground">I-copy at i-paste sa group chat.</p>
        </CardHeader>
        <CardContent>
          <ReminderCard
            slug={slug}
            groupName={group.name}
            status={group.status}
            memberCount={view.members.length}
            partyDate={group.partyDate}
            budget={group.budget}
            theme={themeStatus}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <p className="text-caption text-muted-foreground">{joinedCount(view.members.length)}</p>
        </CardHeader>
        <CardContent>
          <MemberList
            slug={slug}
            canRemove={group.status !== "REVEALED"}
            drawn={!isOpen}
            members={view.members.map((m) => ({
              id: m.id,
              displayName: m.displayName,
              joinedLabel: formatJoinedAt(m.joinedAt, group.timezone),
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bawal magkabunot</CardTitle>
          <p className="text-caption text-muted-foreground">
            Can&apos;t draw each other, halimbawa mag-asawa o magkapatid.
          </p>
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
                  : "Ayusin muna ang mga bawal sa itaas."
            }
          />
        </CardContent>
      </Card>

      {themes.length > 0 && (
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
      )}
    </>
  );
}
