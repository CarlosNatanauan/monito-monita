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
import { getCurrentMember, getOwnToken, isValidSlug, personalLinkPath } from "@/server/auth";
import { getGroupSummary } from "@/server/members";
import { GroupFacts, PageFallback } from "../group-facts";

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

  const [group, member, token, query] = await Promise.all([
    getGroupSummary(slug),
    getCurrentMember(slug),
    getOwnToken("member", slug),
    searchParams,
  ]);
  if (!group) notFound();

  if (!member) {
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

  const welcome = query.welcome === "1";

  return (
    <>
      <header className="flex flex-col gap-2">
        <p className="text-caption font-semibold text-muted-foreground">{group.name}</p>
        <h1 className="text-heading">Hi, {member.displayName}!</h1>
      </header>

      <section className="flex flex-col items-center gap-3" aria-label="Your codename">
        <p className="text-caption text-muted-foreground">Ang codename mo:</p>
        <Slip>{member.codename}</Slip>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>
            {group.status === "OPEN" ? "Waiting for the bunutan…" : "Na-draw na ang names!"}
          </CardTitle>
          <p className="text-caption text-muted-foreground">
            {group.status === "OPEN"
              ? `Hintayin si organizer na mag-draw ng names. ${joinedCount(group.memberCount)}.`
              : "Malapit mo nang ma-open ang slip mo. Balik ka lang dito."}
          </p>
        </CardHeader>
        <CardContent>
          <GroupFacts partyDate={group.partyDate} budget={group.budget} />
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
