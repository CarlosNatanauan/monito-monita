"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { Input } from "@/components/ui/input";
import { submitWithoutReset } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { comeBackAction, type ComeBackState } from "./actions";
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
}: {
  slug: string;
  presetName?: string;
  intro?: string;
  /** "Bago ka?": back to the join form (in place). */
  onNew?: () => void;
  /** "Bago ka?": back to the join form (as a link). */
  newHref?: string;
}) {
  const [state, formAction, pending] = useActionState(comeBackAction, initialState);
  // The error hides as soon as a field is edited, until the next submit.
  const [editedAfter, setEditedAfter] = useState<ComeBackState | null>(null);
  const error = state.status === "error" && editedAfter !== state ? state : null;
  const edited = () => {
    if (editedAfter !== state) setEditedAfter(state);
  };
  const linkClass = cn(buttonVariants({ variant: "link", size: "inline" }), "self-center");

  return (
    <div className="flex flex-col gap-4">
      {intro && <p>{intro}</p>}
      <form
        action={formAction}
        onSubmit={submitWithoutReset(formAction)}
        className="flex flex-col gap-6"
        aria-label="Bumalik"
        noValidate
      >
        <input type="hidden" name="slug" value={slug} />
        {presetName !== undefined ? (
          <input type="hidden" name="displayName" value={presetName} />
        ) : (
          <div className="flex flex-col gap-2">
            <label htmlFor="comeback-name" className="px-1.5 font-bold">
              Pangalan mo
            </label>
            <Input
              id="comeback-name"
              name="displayName"
              hand
              placeholder="Hal. Joy"
              maxLength={40}
              autoComplete="username"
              onChange={edited}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "comeback-error" : undefined}
              required
            />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <PinField
            id="comeback-pin"
            label="4-digit PIN"
            autoComplete="current-password"
            autoFocus={presetName !== undefined}
            invalid={Boolean(error)}
            describedBy={error ? "comeback-error" : "comeback-hint"}
            onChange={edited}
          />
          {error ? (
            <ErrorMessage id="comeback-error">{error.message}</ErrorMessage>
          ) : (
            <p id="comeback-hint" className="px-1.5 text-small font-medium text-ube-soft">
              Nakalimutan ang PIN? Hingin sa organizer ang bagong link mo.
            </p>
          )}
        </div>
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
        <Link href={newHref} className={linkClass}>
          {NEW_LABEL}
        </Link>
      )}
    </div>
  );
}
