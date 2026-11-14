"use client";

import { KeyRound, Share2 } from "lucide-react";
import { useSyncExternalStore } from "react";
import { CopyButton, LinkBox } from "@/components/copy-link";
import { RememberGroup } from "@/components/remember-group";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { siteOrigin } from "@/lib/site-url";

const noopSubscribe = () => () => {};

function useCanShare(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );
}

export function GroupCreated({
  groupName,
  slug,
  organizerToken,
}: {
  groupName: string;
  slug: string;
  organizerToken: string;
}) {
  // Only rendered in the browser after the action succeeds.
  const origin = siteOrigin(window.location.origin);
  const shareUrl = `${origin}/g/${slug}`;
  const organizerUrl = `${origin}/g/${slug}/admin?t=${organizerToken}`;
  const canShare = useCanShare();

  const share = async () => {
    try {
      await navigator.share({
        title: groupName,
        text: `Sali ka sa ${groupName} exchange gift! 🎁`,
        url: shareUrl,
      });
    } catch {
      // Closing the share sheet throws; nothing to do.
    }
  };

  return (
    <>
      <RememberGroup slug={slug} name={groupName} role="organizer" />
      <header className="flex flex-col gap-3 pb-2">
        <h1 className="font-display text-heading-lg">Ready na ang group mo!</h1>
        <p>
          <span className="font-bold">{groupName}</span> is set. Dalawang link ang kailangan mo:
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Share link (para sa GC)</CardTitle>
          <CardDescription>I-paste sa group chat para makasali ang lahat.</CardDescription>
        </CardHeader>
        <div className="flex flex-col gap-3">
          <LinkBox url={shareUrl} />
          <div className="flex gap-2">
            <CopyButton text={shareUrl} label="Copy link" className="flex-1 px-4" />
            {canShare && (
              <Button type="button" variant="secondary" onClick={share} className="h-[58px] flex-1">
                <Share2 /> Share
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-5 shrink-0" aria-hidden />
            Ito ang susi mo bilang organizer.
          </CardTitle>
          <CardDescription>This is your key as the organizer.</CardDescription>
        </CardHeader>
        <div className="flex flex-col gap-3">
          <p className="text-small font-medium">
            I-save mo &apos;to (bookmark o send sa sarili mo). <strong>Huwag i-share sa GC:</strong> kung sino ang may
            hawak nito, siya ang organizer.
          </p>
          {/* Masked like the personal link on /me: people screenshot this screen. */}
          <LinkBox url={organizerUrl} masked maskedLabel="Organizer link (nakatago). Gamitin ang Copy organizer link." />
          <CopyButton text={organizerUrl} label="Copy organizer link" variant="secondary" />
        </div>
      </Card>

      <p className="px-1.5 text-small font-medium text-ube-soft">
        Naka-remember na rin ang device na &apos;to bilang organizer ng group.
      </p>
    </>
  );
}
