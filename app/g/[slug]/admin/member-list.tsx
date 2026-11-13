"use client";

import { ChevronDown } from "lucide-react";
import { useState, useTransition } from "react";
import { CopyLink } from "@/components/copy-link";
import { Button } from "@/components/ui/button";
import { EmptyState, Inset } from "@/components/ui/card";
import { ErrorMessage } from "@/components/ui/error-message";
import { cn } from "@/lib/utils";
import type { LinkStatus } from "@/server/members";
import { reissueMemberLinkAction, removeMemberAction, unlockPinAction } from "./actions";

export interface MemberRow {
  id: string;
  displayName: string;
  joinedLabel: string;
  /** After "Get new link": used yet or not. Status only. */
  linkStatus: LinkStatus;
  /** 10 wrong PINs: locked until the organizer unlocks it. */
  pinLocked: boolean;
  /** Has opened their own slip. Never who they drew. */
  slipOpened: boolean;
}

const LINK_STATUS: Record<Exclude<LinkStatus, "none">, string> = {
  "new-unopened": "New link · not opened yet",
  "new-opened": "New link · opened",
};

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
  /** After the draw: shows Opened / Hindi pa; removing patches the loop (or needs a redraw). */
  drawn: boolean;
}) {
  // The row whose actions are showing.
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Confirming>(null);
  // Set when removing would break an exclusion: offer remove + redraw.
  const [needsRedrawId, setNeedsRedrawId] = useState<string | null>(null);
  // The new personal link from "Get new link", shown until another action.
  const [newLink, setNewLink] = useState<{ id: string; path: string; pinReset: boolean } | null>(null);
  // "Reset PIN din" on the "Get new link" confirm.
  const [resetPin, setResetPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (members.length === 0) {
    return <EmptyState>Wala pang sumali. I-share ang link sa GC!</EmptyState>;
  }

  const close = () => {
    setConfirming(null);
    setNeedsRedrawId(null);
  };

  const toggle = (id: string) => {
    close();
    setError(null);
    setOpenId((current) => (current === id ? null : id));
  };

  const start = (id: string, kind: "remove" | "link") => {
    setError(null);
    setNeedsRedrawId(null);
    setNewLink(null);
    setResetPin(false);
    setConfirming({ id, kind });
  };

  const remove = (memberId: string, redraw = false) => {
    setError(null);
    startTransition(async () => {
      const result = await removeMemberAction({ slug, memberId, redraw });
      if (result.ok) {
        setOpenId(null);
        return close();
      }
      setError(result.message);
      if (result.needsRedraw) setNeedsRedrawId(memberId);
    });
  };

  const reissue = (memberId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await reissueMemberLinkAction({ slug, memberId, resetPin });
      if (!result.ok) return setError(result.message);
      close();
      setNewLink({ id: memberId, path: result.path, pinReset: resetPin });
    });
  };

  const unlock = (memberId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await unlockPinAction({ slug, memberId });
      if (!result.ok) setError(result.message);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <ul className="flex flex-col rows-dashed" aria-label="Members">
        {members.map((member) => {
          const isOpen = openId === member.id;
          const isConfirming = confirming?.id === member.id;
          const statusId = `member-${member.id}-status`;
          return (
            <li key={member.id} className="flex flex-col gap-2 py-1 first:pt-0 last:pb-0">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-label={`Manage ${member.displayName}`}
                aria-describedby={drawn ? statusId : undefined}
                onClick={() => toggle(member.id)}
                className="-mx-2 flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-left focus-ring [-webkit-tap-highlight-color:transparent]"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-bold">{member.displayName}</span>
                  {(!drawn || isOpen) && (
                    <span className="text-small font-medium text-ube-soft">Joined {member.joinedLabel}</span>
                  )}
                  {member.linkStatus !== "none" && (
                    <span className="text-small font-bold">{LINK_STATUS[member.linkStatus]}</span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {drawn && (
                    <span
                      id={statusId}
                      className={cn("text-small", member.slipOpened ? "font-bold text-dahon" : "font-medium text-ube-soft")}
                    >
                      {member.slipOpened ? "Opened" : "Hindi pa"}
                    </span>
                  )}
                  <ChevronDown
                    aria-hidden
                    className={cn("size-4 text-ube-soft transition-transform duration-150", isOpen && "rotate-180")}
                  />
                </span>
              </button>

              {member.pinLocked && (
                <Inset
                  className="flex flex-wrap items-center justify-between gap-2 bg-sili-wash px-3 py-2"
                  role="group"
                  aria-label={`PIN lock for ${member.displayName}`}
                >
                  <p className="text-small font-bold text-sili">Na-lock ang PIN ni {member.displayName}</p>
                  <Button type="button" variant="secondary" size="xs" disabled={pending} onClick={() => unlock(member.id)}>
                    Unlock
                  </Button>
                </Inset>
              )}

              {isOpen && !isConfirming && (
                <div className="flex flex-wrap gap-2 pb-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    className="px-4"
                    onClick={() => start(member.id, "link")}
                    aria-label={`Get new link for ${member.displayName}`}
                  >
                    Get new link
                  </Button>
                  {canRemove && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="xs"
                      className="px-4"
                      onClick={() => start(member.id, "remove")}
                      aria-label={`Remove ${member.displayName}`}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              )}

              {isConfirming && confirming.kind === "link" && (
                <Inset
                  className="mb-2 flex flex-col gap-3 p-4"
                  role="group"
                  aria-label={`Confirm new link for ${member.displayName}`}
                >
                  <p className="text-small font-medium">
                    Gawan ng bagong personal link si <strong>{member.displayName}</strong>? Hindi na gagana ang luma
                    niyang link, pati sa phone niya.
                  </p>
                  <label className="flex items-start gap-2 text-small font-medium">
                    <input
                      type="checkbox"
                      checked={resetPin}
                      onChange={(event) => setResetPin(event.target.checked)}
                      className="mt-0.5 size-4 accent-ube"
                    />
                    <span>
                      <strong>Reset PIN</strong> din (kung nakalimutan niya). Magse-set siya ng bago pagbukas ng link.
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" size="xs" className="px-4" disabled={pending} onClick={() => reissue(member.id)}>
                      {pending ? "Gumagawa…" : "Oo, gumawa ng bago"}
                    </Button>
                    <Button type="button" variant="ghost" size="xs" disabled={pending} onClick={close}>
                      Huwag
                    </Button>
                  </div>
                </Inset>
              )}

              {newLink?.id === member.id && (
                <Inset className="mb-2 flex flex-col gap-3 p-4" role="group" aria-label={`New link for ${member.displayName}`}>
                  <p className="text-small font-medium">
                    Bagong link ni <strong>{member.displayName}</strong>. I-send sa kanya nang private (huwag sa GC, at
                    huwag buksan sa phone mo).
                    {newLink.pinReset && " Na-reset ang PIN niya: magse-set siya ng bago pagbukas ng link."}
                  </p>
                  <CopyLink path={newLink.path} label="Copy link" variant="secondary" />
                </Inset>
              )}

              {isConfirming && confirming.kind === "remove" && needsRedrawId !== member.id && (
                <Inset
                  className="mb-2 flex flex-col gap-3 p-4"
                  role="group"
                  aria-label={`Confirm removing ${member.displayName}`}
                >
                  <p className="text-small font-medium">
                    Tanggalin si <strong>{member.displayName}</strong> sa group?{" "}
                    {drawn
                      ? "Ang nakabunot sa kanya ay bibigyan ng bagong monito; walang ibang magbabago."
                      : "Hindi na gagana ang personal link niya."}
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" size="xs" className="px-4" disabled={pending} onClick={() => remove(member.id)}>
                      {pending ? "Tinatanggal…" : "Oo, tanggalin"}
                    </Button>
                    <Button type="button" variant="ghost" size="xs" disabled={pending} onClick={close}>
                      Huwag
                    </Button>
                  </div>
                </Inset>
              )}

              {needsRedrawId === member.id && (
                <Inset
                  className="mb-2 flex flex-col gap-3 p-4"
                  role="group"
                  aria-label={`Remove ${member.displayName} and redraw`}
                >
                  <p className="text-small font-bold">Magbabago ang monito ng lahat.</p>
                  <p className="text-small font-medium">
                    Puwede mong tanggalin si <strong>{member.displayName}</strong> at i-redraw ang lahat. Everyone&apos;s
                    monito will change.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="xs"
                      className="px-4"
                      disabled={pending}
                      onClick={() => remove(member.id, true)}
                    >
                      {pending ? "Sandali…" : "Tanggalin at i-redraw"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      disabled={pending}
                      onClick={() => {
                        close();
                        setError(null);
                      }}
                    >
                      Huwag
                    </Button>
                  </div>
                </Inset>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
