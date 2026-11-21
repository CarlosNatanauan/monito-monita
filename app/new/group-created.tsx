"use client";

import Link from "next/link";
import { Art } from "@/components/art/symbols";
import { CopyButton, LinkBox, PrivateLink, useCanShare } from "@/components/copy-link";
import { colClass, colsClass } from "@/components/page";
import { RememberGroup } from "@/components/remember-group";
import { Button } from "@/components/ui/button";
import { Bubble, Capiz, SecretCard, SectionTitle } from "@/components/ui/paper";
import { buildGcReminder } from "@/lib/reminder";
import { siteOrigin } from "@/lib/site-url";
import { cn } from "@/lib/utils";

/**
 * "Ready na ang group mo!" (docs/design/03-group-ready-*.png): the group
 * link on a capiz card with the GC message, the organizer link on the
 * pink private-link card (masked until "Ipakita"), then the way into the
 * organizer page. Laptops: the share card left, the organizer link right.
 */
export function GroupCreated({
  groupName,
  slug,
  organizerToken,
  budget,
  partyDate,
}: {
  groupName: string;
  slug: string;
  organizerToken: string;
  budget: number;
  partyDate: string;
}) {
  // Only rendered in the browser after the action succeeds.
  const origin = siteOrigin(window.location.origin);
  const shareUrl = `${origin}/g/${slug}`;
  const organizerUrl = `${origin}/g/${slug}/admin?t=${organizerToken}`;
  const canShare = useCanShare();
  const message = buildGcReminder({
    groupName,
    status: "OPEN",
    shareUrl,
    memberCount: 0,
    partyDate,
    budget,
    theme: { kind: "none", partyDate, daysToParty: 0 },
  });

  const share = async () => {
    try {
      await navigator.share({ title: groupName, text: `Sali ka sa ${groupName} exchange gift! 🎁`, url: shareUrl });
    } catch {
      // Closing the share sheet throws; nothing to do.
    }
  };

  return (
    <div className={colsClass}>
      <RememberGroup slug={slug} name={groupName} role="organizer" />
      <div className={cn(colClass, "lg:col-start-1 lg:row-start-1")}>
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-head text-display lg:text-display-lg">Ready na ang group mo!</h1>
            <p className="mt-2">I-share ang link sa GC para makasali ang lahat.</p>
          </div>
          <Art name="parol" className="-mt-5 h-[108px] w-[76px] shrink-0 lg:-mt-10 lg:h-[170px] lg:w-[120px]" />
        </header>

        <Capiz aria-labelledby="group-link-title">
          <SectionTitle id="group-link-title">Link ng group</SectionTitle>
          <LinkBox url={shareUrl} />
          <div className="flex flex-wrap gap-2.5">
            <CopyButton text={shareUrl} label="Copy link" className="w-full lg:w-fit" />
            {canShare && (
              <Button type="button" variant="secondary" onClick={share} className="lg:min-h-[60px]">
                Share
              </Button>
            )}
          </div>
          <Bubble aria-label="GC message">{message}</Bubble>
          <CopyButton text={message} label="Copy message" variant="secondary" className="self-start" />
        </Capiz>
      </div>

      <div className={cn(colClass, "lg:col-start-2 lg:row-start-1 lg:mt-[56px]")}>
        <SecretCard aria-labelledby="organizer-link-title">
          <SectionTitle id="organizer-link-title">Organizer link mo</SectionTitle>
          <p className="text-small">Sa&apos;yo lang &apos;to. Huwag i-share sa GC.</p>
          {/* Masked like the personal link on /me: people screenshot this screen. */}
          <PrivateLink
            url={organizerUrl}
            maskedLabel="Organizer link (nakatago). Gamitin ang Ipakita o Copy."
            copyAriaLabel="Copy organizer link"
          />
          <p className="text-small text-ube-soft">I-save o i-bookmark. Ito ang daan pabalik sa Manage group.</p>
        </SecretCard>
        <Button asChild variant="secondary" className="min-h-[58px] w-full font-head text-button font-normal lg:min-h-[60px]">
          <Link href={`/g/${slug}/admin`}>Pumunta sa group ko</Link>
        </Button>
      </div>
    </div>
  );
}
