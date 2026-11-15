"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { submitWithoutReset } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { comeBackAction, type ComeBackState } from "./actions";
import { NameLine } from "./name-line";
import { PinField } from "./pin-field";

const initialState: ComeBackState = { status: "idle" };

const NEW_LABEL = "Bago ka? Sumali dito";

/**
 * Name + PIN, to come back on another device.
 *
 * - With `presetName` (after a taken name in the join form) only the PIN
 *   is asked; the name rides along hidden and is never shown back.
 * - Every failure shows the same "Mali ang pangalan o PIN". The hint
 *   below is always there, so it says nothing about a particular name.
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
  // The error hides as soon as a field is edited, until the next submit.
  const [editedAfter, setEditedAfter] = useState<ComeBackState | null>(null);
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
              <p className="h-10 truncate font-hand text-[30px] leading-[38px]">{presetName}</p>
            </>
          ) : (
            <NameLine
              id="comeback-name"
              name="displayName"
              placeholder="Hal. Joy"
              maxLength={40}
              autoComplete="username"
              onChange={edited}
              invalid={Boolean(error)}
              aria-describedby={error ? "comeback-error" : undefined}
              required
            />
          )}
          <PinField
            id="comeback-pin"
            label="4-digit PIN"
            labelClassName="lst-label block"
            rowClassName="lst-row2"
            autoComplete="current-password"
            autoFocus={presetName !== undefined}
            invalid={Boolean(error)}
            describedBy={error ? "comeback-error" : "comeback-hint"}
            onChange={edited}
          />
          {!error && (
            <p id="comeback-hint" className="lst-row text-small text-ube-soft">
              Nakalimutan ang PIN? Hingin sa organizer.
            </p>
          )}
        </div>
        {error && <ErrorMessage id="comeback-error">{error.message}</ErrorMessage>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Sandali…" : "Buksan ang slip ko"}
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
