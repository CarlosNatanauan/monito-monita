"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitWithoutReset } from "@/lib/forms";
import { comeBackAction, type ComeBackState } from "./actions";
import { PinField } from "./pin-field";

const initialState: ComeBackState = { status: "idle" };

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
  /** "Bago ako": back to the join form (in place). */
  onNew?: () => void;
  /** "Bago ako": back to the join form (as a link). */
  newHref?: string;
}) {
  const [state, formAction, pending] = useActionState(comeBackAction, initialState);
  // The error hides as soon as a field is edited, until the next submit.
  const [editedAfter, setEditedAfter] = useState<ComeBackState | null>(null);
  const error = state.status === "error" && editedAfter !== state ? state : null;
  const edited = () => {
    if (editedAfter !== state) setEditedAfter(state);
  };

  return (
    <div className="flex flex-col gap-4">
      {intro && <p className="text-ube-soft">{intro}</p>}
      <form
        action={formAction}
        onSubmit={submitWithoutReset(formAction)}
        className="flex flex-col gap-4"
        aria-label="Bumalik"
        noValidate
      >
        <input type="hidden" name="slug" value={slug} />
        {presetName !== undefined ? (
          <input type="hidden" name="displayName" value={presetName} />
        ) : (
          <div className="flex flex-col gap-2">
            <label htmlFor="comeback-name" className="font-bold">
              Pangalan mo
            </label>
            <Input
              id="comeback-name"
              name="displayName"
              placeholder="Joy"
              maxLength={40}
              autoComplete="username"
              onChange={edited}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "comeback-error" : undefined}
              required
            />
          </div>
        )}
        <PinField
          id="comeback-pin"
          label="PIN mo"
          autoComplete="current-password"
          autoFocus={presetName !== undefined}
          invalid={Boolean(error)}
          describedBy={error ? "comeback-error" : "comeback-hint"}
          onChange={edited}
        />
        {error ? (
          <p id="comeback-error" role="alert" className="text-small font-semibold text-sili">
            {error.message}
          </p>
        ) : (
          <p id="comeback-hint" className="text-small text-ube-soft">
            Nakalimutan ang PIN? Hingin sa organizer ang bagong link mo.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Sandali…" : "Bumalik"}
          </Button>
          {onNew && (
            <Button type="button" variant="ghost" onClick={onNew} disabled={pending}>
              Bago ako
            </Button>
          )}
          {newHref && (
            <Button asChild variant="ghost">
              <Link href={newHref}>Bago ako</Link>
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
