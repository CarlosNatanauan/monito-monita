"use client";

import { useActionState, useState, type ReactNode } from "react";
import { JoinDrop, preloadDrop } from "@/components/bowl/join-drop";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { Input } from "@/components/ui/input";
import { joinAction, type JoinState } from "./actions";
import { ComeBackForm } from "./come-back-form";
import { PinField } from "./pin-field";

const initialState: JoinState = { status: "idle" };

/**
 * Name + PIN to join. If the name is already in the group, nothing is
 * created and the come-back form (PIN only) takes its place, with neutral
 * wording; "Bago ka? Sumali dito" brings the join form back with the name kept.
 *
 * Uncontrolled on purpose: `<form action>` works even before hydration
 * (slow phones opening links from Messenger), and the action returns the
 * submitted name, which becomes the default value so React's automatic
 * form reset restores it instead of clearing it. The PIN is never echoed.
 */
export function JoinForm({
  slug,
  footer,
}: {
  slug: string;
  /** Shown under the join form only (not while the come-back form shows). */
  footer?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(joinAction, initialState);
  // The error hides as soon as a field is edited, until the next submit.
  const [editedAfter, setEditedAfter] = useState<JoinState | null>(null);
  // "Bago ka?" on the come-back form: back to joining, for this result.
  const [newAfter, setNewAfter] = useState<JoinState | null>(null);

  // Joined: the slip drops into the bowl, then /me (signature moment 2).
  if (state.status === "joined") return <JoinDrop name={state.displayName} href={state.href} />;

  if (state.status === "taken" && newAfter !== state) {
    return (
      <ComeBackForm
        key="taken"
        slug={slug}
        presetName={state.displayName}
        intro={state.message}
        onNew={() => setNewAfter(state)}
      />
    );
  }

  const error = state.status === "error" && editedAfter !== state ? state : null;
  const submittedName = state.status === "idle" ? "" : state.displayName;
  const edited = () => {
    if (editedAfter !== state) setEditedAfter(state);
  };

  return (
    <div className="flex flex-col gap-4">
      <form
        action={formAction}
        className="flex flex-col gap-6"
        aria-label="Sumali"
        noValidate
        // Fetch the drop animation while they type, so it's ready on submit.
        onFocus={() => void preloadDrop()}
      >
        <input type="hidden" name="slug" value={slug} />
        <div className="flex flex-col gap-2">
          <label htmlFor="displayName" className="px-1.5 font-bold">
            Pangalan mo
          </label>
          <Input
            id="displayName"
            name="displayName"
            hand
            defaultValue={submittedName}
            onChange={edited}
            placeholder="Hal. Joy"
            maxLength={40}
            autoComplete="username"
            aria-invalid={error?.field === "displayName" ? true : undefined}
            aria-describedby={error?.field === "displayName" ? "join-error" : undefined}
            required
          />
          {error?.field === "displayName" && <ErrorMessage id="join-error">{error.message}</ErrorMessage>}
        </div>
        <div className="flex flex-col gap-2">
          <PinField
            id="pin"
            label="4-digit PIN"
            autoComplete="new-password"
            invalid={error?.field === "pin"}
            describedBy={error?.field === "pin" ? "pin-error" : "pin-hint"}
            onChange={edited}
          />
          {error?.field === "pin" ? (
            <ErrorMessage id="pin-error">{error.message}</ErrorMessage>
          ) : (
            <p id="pin-hint" className="px-1.5 text-small font-medium text-ube-soft">
              Tandaan mo &apos;to. Ito ang gamit mo pagbalik, kahit sa ibang phone.
            </p>
          )}
        </div>
        {error && error.field === null && <ErrorMessage>{error.message}</ErrorMessage>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Sumasali…" : "Join the group"}
        </Button>
      </form>
      {footer}
    </div>
  );
}
