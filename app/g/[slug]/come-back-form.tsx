"use client";

import { usePendingLabel } from "@/lib/use-pending-label";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { submitWithoutReset } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { comeBackAction, type ComeBackState } from "./actions";
import { NameLine } from "./name-line";
import { PinField } from "./pin-field";

const initialState: ComeBackState = { status: "idle" };

const NEW_LABEL = "Bago ka? Sumali dito";

/** Failures in this browser before the "ask the organizer" hint grows. */
export const LOUD_HINT_AFTER = 3;

/**
 * Name + PIN, to come back on another device.
 *
 * - With `presetName` (after a taken name in the join form) only the PIN
 *   is asked; the name rides along hidden and is never shown back.
 * - Every failure shows the same "Mali ang pangalan o PIN". The hints
 *   below are always there, so they say nothing about a particular name.
 *   After 3 failures in this browser (a count kept here, never sent) the
 *   "ask the organizer" hint grows: by then they may be locked out for
 *   15 minutes, and more tries won't help.
 * - Submits without React's form reset once hydrated (keeps the name);
 *   before hydration it still works as a plain form post.
 */
export function ComeBackForm({
  slug,
  presetName,
  intro,
  onNew,
  newHref,
  showNewLink = "always",
}: {
  slug: string;
  presetName?: string;
  intro?: string;
  /** "Bago ka?": back to the join form (in place). */
  onNew?: () => void;
  /** "Bago ka?": back to the join form (as a link). */
  newHref?: string;
  /** "phone": the link shows here only on phones (laptops show it in the left column). */
  showNewLink?: "always" | "phone";
}) {
  const [state, formAction, pending] = useActionState(comeBackAction, initialState);
  const openLabel = usePendingLabel(pending, "Buksan ang slip ko", "Binubuksan ang slip mo…");
  // The error hides as soon as a field is edited, until the next submit.
  const [editedAfter, setEditedAfter] = useState<ComeBackState | null>(null);
  // Failed tries in this browser (each result counted once).
  const [counted, setCounted] = useState<ComeBackState>(state);
  const [failures, setFailures] = useState(state.status === "error" ? 1 : 0);
  if (counted !== state) {
    setCounted(state);
    if (state.status === "error") setFailures((n) => n + 1);
  }
  const loud = failures >= LOUD_HINT_AFTER;
  // After "Mali ang pangalan o PIN": the cursor goes back to the PIN (the name stays).
  useEffect(() => {
    if (state.status === "error") document.getElementById("comeback-pin")?.focus();
  }, [state]);
  const error = state.status === "error" && editedAfter !== state ? state : null;
  const edited = () => {
    if (editedAfter !== state) setEditedAfter(state);
  };
  const linkClass = cn(buttonVariants({ variant: "link" }), "w-fit px-0 text-body");

  return (
    <>
      {intro && <p>{intro}</p>}
      <form
        action={formAction}
        onSubmit={submitWithoutReset(formAction)}
        className="flex flex-col gap-[18px] lg:gap-[22px]"
        aria-label="Bumalik"
        noValidate
      >
        <input type="hidden" name="slug" value={slug} />
        <div className="listahan">
          <p className="lst-row font-bold">Hanapin ang pangalan mo</p>
          {presetName !== undefined ? (
            <>
              <input type="hidden" name="displayName" value={presetName} />
              <p className="lst-label">Pangalan mo</p>
              <p className="lst-wrap font-hand text-[30px]">{presetName}</p>
            </>
          ) : (
            <NameLine
              readOnly={pending}
              id="comeback-name"
              name="displayName"
              placeholder="Hal. Joy"
              maxLength={40}
              autoComplete="username"
              onChange={edited}
              invalid={Boolean(error)}
              aria-describedby={error ? "comeback-error comeback-name-hint" : "comeback-name-hint"}
              required
            />
          )}
          <PinField
            readOnly={pending}
            id="comeback-pin"
            label="4-digit PIN"
            labelClassName="lst-label block"
            rowClassName="lst-row2"
            autoComplete="current-password"
            autoFocus={presetName !== undefined}
            invalid={Boolean(error)}
            describedBy={error ? "comeback-error comeback-hint" : "comeback-hint"}
            onChange={edited}
          />
        </div>
        {error && <ErrorMessage id="comeback-error">{error.message}</ErrorMessage>}
        <div className="flex flex-col gap-1.5 text-small text-ube-soft">
          {presetName === undefined && (
            <p id="comeback-name-hint">
              Isulat ang pangalan na ginamit mo noong sumali (kasama ang Kuya, Ate, Tita kung meron).
            </p>
          )}
          {loud ? (
            <p
              id="comeback-hint"
              role="status"
              className="rounded-paper border-[1.5px] border-ube bg-ilaw-lit px-3 py-2.5 text-ube"
            >
              <strong>Huminto muna.</strong> Pagkatapos ng ilang maling PIN, naka-lock ito nang 15 minuto, kahit tama
              na ang PIN. I-message ang organizer, bibigyan ka niya ng bagong link.
            </p>
          ) : (
            <p id="comeback-hint">Nakalimutan ang PIN? I-message ang organizer, bibigyan ka niya ng bagong link.</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {openLabel}
        </Button>
      </form>
      {onNew && (
        <button type="button" onClick={onNew} disabled={pending} className={cn(linkClass, "cursor-pointer")}>
          {NEW_LABEL}
        </button>
      )}
      {newHref && (
        <Link href={newHref} className={cn(linkClass, showNewLink === "phone" && "lg:hidden")}>
          {NEW_LABEL}
        </Link>
      )}
    </>
  );
}
