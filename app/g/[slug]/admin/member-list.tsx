"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { PrivateLink } from "@/components/copy-link";
import { Name } from "@/components/page";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { Listahan } from "@/components/ui/paper";
import { ConfirmBox } from "./draw-section";
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
  /** 5 wrong PINs: locked for 15 minutes right now. */
  pinTempLocked: boolean;
  /** Has opened their own slip. Never who they drew. */
  slipOpened: boolean;
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

const LINK_STATUS: Record<Exclude<LinkStatus, "none">, string> = {
  "new-unopened": "New link · not opened yet",
  "new-opened": "New link · opened",
};

type Confirming = { id: string; kind: "remove" | "link" } | null;

/** From this many members the list gets a "Hanapin" filter. */
export const SEARCH_FROM = 16;
/** Rows the laptop's scroll box shows before it scrolls. */
const ROWS_IN_BOX = 14;

/** Case-, space- and accent-insensitive, for "Hanapin". */
function searchKey(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

const REMOVED_LINE: Record<"removed" | "patched" | "redrawn", (name: string) => string> = {
  removed: (name) => `Natanggal si ${name}.`,
  patched: (name) => `Natanggal si ${name}. May bagong monito na ang nakabunot sa kanya.`,
  redrawn: (name) => `Natanggal si ${name}, at na-redraw ang lahat.`,
};

export function MemberList({
  slug,
  members,
  canRemove,
  drawn,
}: {
  slug: string;
  members: MemberRow[];
  canRemove: boolean;
  /** After the draw: shows Opened / Hindi pa bukas; removing patches the loop (or needs a redraw). */
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
  // "Natanggal si …": until the next action.
  const [done, setDone] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // The laptop box: scrolled to the end (hides the "Scroll" cue).
  const [atEnd, setAtEnd] = useState(false);
  const [pending, startTransition] = useTransition();

  const title = `Members (${members.length})`;
  if (members.length === 0) {
    return (
      <Listahan title={title} titleId="members-title">
        <p className="lst-row text-ube-soft">Wala pang sumali.</p>
        <p className="lst-row text-ube-soft">I-share ang link sa GC!</p>
      </Listahan>
    );
  }

  const close = () => {
    setConfirming(null);
    setNeedsRedrawId(null);
  };

  const toggle = (id: string) => {
    close();
    setError(null);
    setDone(null);
    setOpenId((current) => (current === id ? null : id));
  };

  const start = (id: string, kind: "remove" | "link", options: { resetPin?: boolean } = {}) => {
    setError(null);
    setDone(null);
    setNeedsRedrawId(null);
    setNewLink(null);
    setResetPin(options.resetPin ?? false);
    // From the lock row the row may be closed: open it to show the confirm.
    setOpenId(id);
    setConfirming({ id, kind });
  };

  const remove = (memberId: string, redraw = false) => {
    setError(null);
    const name = members.find((m) => m.id === memberId)?.displayName ?? "";
    startTransition(async () => {
      const result = await removeMemberAction({ slug, memberId, redraw });
      if (result.ok) {
        setOpenId(null);
        setDone(REMOVED_LINE[result.removed ?? "removed"](name));
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

  const searchable = members.length >= SEARCH_FROM;
  const key = searchKey(query);
  const shown = searchable && key ? members.filter((m) => searchKey(m.displayName).includes(key)) : members;
  const scrolls = shown.length > ROWS_IN_BOX;

  return (
    <Listahan title={title} titleId="members-title">
      {done && (
        <p role="status" className="my-2 rounded-paper border-[1.5px] border-dahon bg-papel px-3 py-2.5 text-small font-bold text-dahon">
          {done}
        </p>
      )}
      {error && <ErrorMessage className="my-2">{error}</ErrorMessage>}
      {searchable && (
        <div className="lst-row2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Hanapin ang member</span>
            <Input
              size="row"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Hanapin (${members.length})`}
              autoComplete="off"
              enterKeyHint="search"
            />
          </label>
        </div>
      )}
      {searchable && key && shown.length === 0 && (
        <p className="lst-row text-ube-soft">Walang member na “{query.trim()}”.</p>
      )}
      {/* Laptops: scrolls inside the card past 14 rows, so a big group
          doesn't push the page down. The rules scroll with the rows; a fade
          and "Scroll para sa lahat" say there's more, until the end. */}
      <div
        className="relative lg:max-h-[560px] lg:overflow-y-auto lg:bg-[repeating-linear-gradient(#fff_0_39px,var(--color-rule-blue)_39px_40px)] lg:[background-attachment:local]"
        onScroll={(event) => {
          const box = event.currentTarget;
          setAtEnd(box.scrollTop + box.clientHeight >= box.scrollHeight - 4);
        }}
      >
      <ul aria-label="Members">
        {shown.map((member) => {
          const isOpen = openId === member.id;
          const isConfirming = confirming?.id === member.id;
          const statusId = `member-${member.id}-status`;
          return (
            <li key={member.id}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-label={`Manage ${member.displayName}`}
                aria-describedby={drawn ? statusId : undefined}
                onClick={() => toggle(member.id)}
                className="lst-row w-full cursor-pointer rounded-paper text-left focus-ring [-webkit-tap-highlight-color:transparent]"
              >
                <Name className="min-w-0 truncate text-list">{member.displayName}</Name>
                <span className="flex shrink-0 items-center gap-1.5">
                  {drawn ? (
                    <span id={statusId} className={member.slipOpened ? "font-bold text-dahon" : "text-ube-soft"}>
                      {member.slipOpened ? "✓ Opened" : "Hindi pa bukas"}
                    </span>
                  ) : (
                    <span className="text-ube-soft">Sumali na</span>
                  )}
                  <ChevronDownIcon className={cn("size-4 text-ube-soft transition-transform duration-150", isOpen && "rotate-180")} />
                </span>
              </button>

              {isOpen && <p className="lst-row text-small text-ube-soft">Joined {member.joinedLabel}</p>}
              {member.linkStatus !== "none" && (
                <p className="lst-row text-small font-bold">{LINK_STATUS[member.linkStatus]}</p>
              )}

              {member.pinLocked && (
                <div className="lst-row" role="group" aria-label={`PIN lock for ${member.displayName}`}>
                  <p className="min-w-0 truncate text-small font-bold text-sili">Na-lock ang PIN ni {member.displayName}</p>
                  <Button type="button" variant="link" className="-mr-1.5" disabled={pending} onClick={() => unlock(member.id)}>
                    Unlock
                  </Button>
                </div>
              )}

              {member.pinTempLocked && !isConfirming && newLink?.id !== member.id && (
                <div className="lst-row" role="group" aria-label={`Maling PIN ni ${member.displayName}`}>
                  {/* Under their own row, so the name isn't repeated (it would be cut on a phone). */}
                  <p className="min-w-0 truncate text-small font-bold text-sili">Maraming maling PIN kanina</p>
                  <Button
                    type="button"
                    variant="link"
                    className="-mr-1.5"
                    disabled={pending}
                    onClick={() => start(member.id, "link", { resetPin: true })}
                    aria-label={`Get new link for ${member.displayName} (locked)`}
                  >
                    Get new link
                  </Button>
                </div>
              )}

              {isOpen && !isConfirming && (
                <div className="lst-row justify-start gap-3">
                  <Button
                    type="button"
                    variant="link"
                    className="-ml-1.5"
                    onClick={() => start(member.id, "link")}
                    aria-label={`Get new link for ${member.displayName}`}
                  >
                    Get new link
                  </Button>
                  {canRemove && (
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => start(member.id, "remove")}
                      aria-label={`Remove ${member.displayName}`}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              )}

              {isConfirming && confirming.kind === "link" && (
                <div className="my-2">
                  <ConfirmBox label={`Confirm new link for ${member.displayName}`}>
                    <p className="text-small">
                      Gawan ng bagong personal link si <Name>{member.displayName}</Name>? Hindi na gagana ang luma niyang
                      link, pati sa phone niya.
                    </p>
                    <label className="flex items-start gap-2 text-small">
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
                    <div className="flex flex-wrap gap-2.5">
                      <Button type="button" variant="secondary" disabled={pending} onClick={() => reissue(member.id)}>
                        {pending ? "Gumagawa…" : "Oo, gumawa ng bago"}
                      </Button>
                      <Button type="button" variant="link" disabled={pending} onClick={close}>
                        Huwag
                      </Button>
                    </div>
                  </ConfirmBox>
                </div>
              )}

              {newLink?.id === member.id && (
                <div className="my-2">
                  <ConfirmBox label={`New link for ${member.displayName}`}>
                    <p className="text-small">
                      Bagong link ni <Name>{member.displayName}</Name>. I-send sa kanya nang private (huwag sa GC, at huwag
                      buksan sa phone mo).
                      {newLink.pinReset && " Na-reset ang PIN niya: magse-set siya ng bago pagbukas ng link."}
                    </p>
                    <PrivateLink
                      path={newLink.path}
                      copyLabel="Copy link"
                      maskedLabel={`Bagong link ni ${member.displayName} (nakatago). Gamitin ang Copy link.`}
                      shareText="Bagong personal link mo sa Monito Monita (sa'yo lang, huwag i-share)"
                      shareLabel={`I-send kay ${member.displayName}`}
                    />
                  </ConfirmBox>
                </div>
              )}

              {isConfirming && confirming.kind === "remove" && needsRedrawId !== member.id && (
                <div className="my-2">
                  <ConfirmBox label={`Confirm removing ${member.displayName}`}>
                    <p className="text-small">
                      Tanggalin si <Name>{member.displayName}</Name> sa group?{" "}
                      {drawn
                        ? "Ang nakabunot sa kanya ay bibigyan ng bagong monito; walang ibang magbabago."
                        : "Hindi na gagana ang personal link niya."}
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      <Button type="button" variant="secondary" disabled={pending} onClick={() => remove(member.id)}>
                        {pending ? "Tinatanggal…" : "Oo, tanggalin"}
                      </Button>
                      <Button type="button" variant="link" disabled={pending} onClick={close}>
                        Huwag
                      </Button>
                    </div>
                  </ConfirmBox>
                </div>
              )}

              {needsRedrawId === member.id && (
                <div className="my-2">
                  <ConfirmBox label={`Remove ${member.displayName} and redraw`}>
                    <p className="text-small font-bold">Magbabago ang monito ng lahat.</p>
                    <p className="text-small">
                      Puwede mong tanggalin si <Name>{member.displayName}</Name> at i-redraw ang lahat. Everyone&apos;s
                      monito will change.
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      <Button type="button" variant="secondary" disabled={pending} onClick={() => remove(member.id, true)}>
                        {pending ? "Sandali…" : "Tanggalin at i-redraw"}
                      </Button>
                      <Button
                        type="button"
                        variant="link"
                        disabled={pending}
                        onClick={() => {
                          close();
                          setError(null);
                        }}
                      >
                        Huwag
                      </Button>
                    </div>
                  </ConfirmBox>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {scrolls && !atEnd && (
        <p
          aria-hidden
          data-scroll-cue
          className="pointer-events-none sticky bottom-0 -mt-20 hidden h-20 items-end justify-center bg-linear-to-b from-transparent to-white to-60% pb-2 text-small font-bold text-ube-soft lg:flex"
        >
          Scroll para sa lahat ({shown.length}) ↓
        </p>
      )}
      </div>
    </Listahan>
  );
}
