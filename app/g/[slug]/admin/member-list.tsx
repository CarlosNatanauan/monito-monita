"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { removeMemberAction } from "./actions";

export interface MemberRow {
  id: string;
  displayName: string;
  joinedLabel: string;
}

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
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  // Set when removing would break an exclusion: offer remove + redraw.
  const [needsRedrawId, setNeedsRedrawId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (members.length === 0) {
    return <p className="text-muted-foreground">Wala pang sumali. I-share ang link sa GC!</p>;
  }

  const close = () => {
    setConfirmingId(null);
    setNeedsRedrawId(null);
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

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="rounded-xl bg-destructive/8 px-4 py-3 text-caption font-semibold text-destructive">
          {error}
        </p>
      )}
      <ul className="flex flex-col divide-y divide-border" aria-label="Members">
        {members.map((member) => (
          <li key={member.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{member.displayName}</p>
                <p className="text-caption text-muted-foreground">Joined {member.joinedLabel}</p>
              </div>
              {canRemove && confirmingId !== member.id && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setError(null);
                    setNeedsRedrawId(null);
                    setConfirmingId(member.id);
                  }}
                  aria-label={`Remove ${member.displayName}`}
                >
                  Remove
                </Button>
              )}
            </div>

            {confirmingId === member.id && needsRedrawId !== member.id && (
              <div className="flex flex-col gap-2 rounded-xl bg-muted p-3" role="group" aria-label={`Confirm removing ${member.displayName}`}>
                <p className="text-caption">
                  Tanggalin si <strong>{member.displayName}</strong> sa group?{" "}
                  {drawn
                    ? "Ang nakabunot sa kanya ay bibigyan ng bagong monito; walang ibang magbabago."
                    : "Hindi na gagana ang personal link niya."}
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={() => remove(member.id)}>
                    {pending ? "Tinatanggal…" : "Oo, tanggalin"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={close}>
                    Huwag
                  </Button>
                </div>
              </div>
            )}

            {needsRedrawId === member.id && (
              <div className="flex flex-col gap-2 rounded-xl bg-destructive/8 p-3" role="group" aria-label={`Remove ${member.displayName} and redraw`}>
                <p className="text-caption font-semibold text-destructive">Magbabago ang monito ng lahat.</p>
                <p className="text-caption">
                  Puwede mong tanggalin si <strong>{member.displayName}</strong> at i-redraw ang lahat. Everyone&apos;s
                  monito will change.
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={() => remove(member.id, true)}>
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
        ))}
      </ul>
    </div>
  );
}
