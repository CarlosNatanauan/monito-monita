"use client";

import { KeyRound, Share2 } from "lucide-react";
import { useSyncExternalStore } from "react";
import { CopyButton, LinkBox } from "@/components/copy-link";
import { RememberGroup } from "@/components/remember-group";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const origin = window.location.origin;
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
      <header className="flex flex-col gap-2">
        <h1 className="text-heading">Ready na ang group mo!</h1>
        <p className="text-ube-soft">
          <span className="font-semibold text-ube">{groupName}</span> is set. Dalawang link ang kailangan mo:
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Share link (para sa GC)</CardTitle>
          <p className="text-small text-ube-soft">I-paste sa group chat para makasali ang lahat.</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <LinkBox url={shareUrl} />
          <div className="flex gap-2">
            <CopyButton text={shareUrl} label="Copy link" className="flex-1" />
            {canShare && (
              <Button type="button" variant="secondary" onClick={share} className="flex-1">
                <Share2 /> Share
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="ring-2 ring-margarine">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-5 shrink-0" aria-hidden />
            Ito ang susi mo bilang organizer.
          </CardTitle>
          <p className="text-small text-ube-soft">This is your key as the organizer.</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-small">
            I-save mo &apos;to (bookmark o send sa sarili mo). <strong>Huwag i-share sa GC:</strong> kung sino ang may
            hawak nito, siya ang organizer.
          </p>
          <LinkBox url={organizerUrl} />
          <CopyButton text={organizerUrl} label="Copy organizer link" variant="secondary" />
        </CardContent>
      </Card>

      <p className="text-small text-ube-soft">
        Naka-remember na rin ang device na &apos;to bilang organizer ng group.
      </p>
    </>
  );
}
