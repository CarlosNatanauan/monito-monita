"use client";

import { useState, useTransition } from "react";
import { CopyLink } from "@/components/copy-link";
import { Button } from "@/components/ui/button";
import { reissueMemberLinkAction, removeMemberAction } from "./actions";

export interface MemberRow {
  id: string;
  displayName: string;
  joinedLabel: string;
}

type Confirming = { id: string; kind: "remove" | "link" } | null;

export function MemberList({
  slug,
  members,
  canRemove,
  drawn,
}: {
  slug: string;
  members: MemberRow[];
  canRemove: boolean;
  /** After the draw, removing patches the loop (or needs a redraw). */
  drawn: boolean;
}) {
  const [confirming, setConfirming] = useState<Confirming>(null);
  // Set when removing would break an exclusion: offer remove + redraw.
  const [needsRedrawId, setNeedsRedrawId] = useState<string | null>(null);
  // The new personal link from "Get new link", shown until another action.
  const [newLink, setNewLink] = useState<{ id: string; path: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (members.length === 0) {
    return <p className="text-muted-foreground">Wala pang sumali. I-share ang link sa GC!</p>;
  }

  const close = () => {
    setConfirming(null);
    setNeedsRedrawId(null);
  };

  const start = (id: string, kind: "remove" | "link") => {
    setError(null);
    setNeedsRedrawId(null);
    setNewLink(null);
    setConfirming({ id, kind });
  };

  const remove = (memberId: string, redraw = false) => {
    setError(null);
    startTransition(async () => {
      const result = await removeMemberAction({ slug, memberId, redraw });
      if (result.ok) return close();
      setError(result.message);
      if (result.needsRedraw) setNeedsRedrawId(memberId);
    });
  };

  const reissue = (memberId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await reissueMemberLinkAction({ slug, memberId });
      if (!result.ok) return setError(result.message);
      close();
      setNewLink({ id: memberId, path: result.path });
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="rounded-xl bg-destructive/8 px-4 py-3 text-caption font-semibold text-destructive">
          {error}
        </p>
      )}
      <ul className="flex flex-col divide-y divide-border" aria-label="Members">
        {members.map((member) => {
          const isConfirming = confirming?.id === member.id;
          return (
            <li key={member.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{member.displayName}</p>
                  <p className="text-caption text-muted-foreground">Joined {member.joinedLabel}</p>
                </div>
                {!isConfirming && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => start(member.id, "link")}
                      aria-label={`Get new link for ${member.displayName}`}
                    >
                      Get new link
                    </Button>
                    {canRemove && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => start(member.id, "remove")}
                        aria-label={`Remove ${member.displayName}`}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {isConfirming && confirming.kind === "link" && (
                <div
                  className="flex flex-col gap-2 rounded-xl bg-muted p-3"
                  role="group"
                  aria-label={`Confirm new link for ${member.displayName}`}
                >
                  <p className="text-caption">
                    Gawan ng bagong personal link si <strong>{member.displayName}</strong>? Hindi na gagana ang luma
                    niyang link, pati sa phone niya.
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" disabled={pending} onClick={() => reissue(member.id)}>
                      {pending ? "Gumagawa…" : "Oo, gumawa ng bago"}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={close}>
                      Huwag
                    </Button>
                  </div>
                </div>
              )}

              {newLink?.id === member.id && (
                <div
                  className="flex flex-col gap-2 rounded-xl bg-muted p-3"
                  role="group"
                  aria-label={`New link for ${member.displayName}`}
                >
                  <p className="text-caption">
                    Bagong link ni <strong>{member.displayName}</strong>. I-send sa kanya nang private (huwag sa GC, at
                    huwag buksan sa phone mo).
                  </p>
                  <CopyLink path={newLink.path} label="Copy link" variant="outline" />
                </div>
              )}

              {isConfirming && confirming.kind === "remove" && needsRedrawId !== member.id && (
                <div
                  className="flex flex-col gap-2 rounded-xl bg-muted p-3"
                  role="group"
                  aria-label={`Confirm removing ${member.displayName}`}
                >
                  <p className="text-caption">
                    Tanggalin si <strong>{member.displayName}</strong> sa group?{" "}
                    {drawn
                      ? "Ang nakabunot sa kanya ay bibigyan ng bagong monito; walang ibang magbabago."
                      : "Hindi na gagana ang personal link niya."}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={pending}
                      onClick={() => remove(member.id)}
                    >
                      {pending ? "Tinatanggal…" : "Oo, tanggalin"}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={close}>
                      Huwag
                    </Button>
                  </div>
                </div>
              )}

              {needsRedrawId === member.id && (
                <div
                  className="flex flex-col gap-2 rounded-xl bg-destructive/8 p-3"
                  role="group"
                  aria-label={`Remove ${member.displayName} and redraw`}
                >
                  <p className="text-caption font-semibold text-destructive">Magbabago ang monito ng lahat.</p>
                  <p className="text-caption">
                    Puwede mong tanggalin si <strong>{member.displayName}</strong> at i-redraw ang lahat. Everyone&apos;s
                    monito will change.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={pending}
                      onClick={() => remove(member.id, true)}
                    >
                      {pending ? "Sandali…" : "Tanggalin at i-redraw"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        close();
                        setError(null);
                      }}
                    >
                      Huwag
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
