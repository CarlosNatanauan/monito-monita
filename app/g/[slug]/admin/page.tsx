import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CopyLink } from "@/components/copy-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatJoinedAt, joinedCount } from "@/lib/format";
import { formatShortDate } from "@/lib/theme-weeks";
import { getCurrentMember, getCurrentOrganizer, isValidSlug } from "@/server/auth";
import type { GroupStatus } from "@/server/db/schema";
import { getOrganizerView } from "@/server/members";
import { GroupFacts, PageFallback } from "../group-facts";
import { MemberList } from "./member-list";

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

  const [view, member] = await Promise.all([getOrganizerView(organizer.groupId), getCurrentMember(slug)]);
  if (!view) notFound();
  const { group, themes } = view;
  const isOpen = group.status === "OPEN";

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
          <CardTitle>Members</CardTitle>
          <p className="text-caption text-muted-foreground">{joinedCount(view.members.length)}</p>
        </CardHeader>
        <CardContent>
          <MemberList
            slug={slug}
            canRemove={isOpen}
            members={view.members.map((m) => ({
              id: m.id,
              displayName: m.displayName,
              joinedLabel: formatJoinedAt(m.joinedAt, group.timezone),
            }))}
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
