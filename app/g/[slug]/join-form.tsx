"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinAction, type JoinState } from "./actions";
import { ComeBackForm } from "./come-back-form";
import { PinField } from "./pin-field";

const initialState: JoinState = { status: "idle" };

/**
 * Name + PIN to join. If the name is already in the group, nothing is
 * created and the come-back form (PIN only) takes its place, with neutral
 * wording; "Bago ako" brings the join form back with the name kept.
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
  // "Bago ako" on the come-back form: back to joining, for this result.
  const [newAfter, setNewAfter] = useState<JoinState | null>(null);

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
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-4" aria-label="Sumali" noValidate>
        <input type="hidden" name="slug" value={slug} />
        <div className="flex flex-col gap-2">
          <label htmlFor="displayName" className="font-bold">
            Pangalan mo
          </label>
          <Input
            id="displayName"
            name="displayName"
            defaultValue={submittedName}
            onChange={edited}
            placeholder="Joy"
            maxLength={40}
            autoComplete="username"
            aria-invalid={error?.field === "displayName" ? true : undefined}
            aria-describedby={error?.field === "displayName" ? "join-error" : "join-hint"}
            required
          />
          {error?.field === "displayName" ? (
            <p id="join-error" role="alert" className="text-small font-semibold text-sili">
              {error.message}
            </p>
          ) : (
            <p id="join-hint" className="text-small text-ube-soft">
              Ito ang makikita ng ibang members.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <PinField
            id="pin"
            label={
              <>
                PIN (4 digits){" "}
                <span className="font-normal text-ube-soft">— para makabalik ka kahit sa ibang phone</span>
              </>
            }
            autoComplete="new-password"
            invalid={error?.field === "pin"}
            describedBy={error?.field === "pin" ? "pin-error" : undefined}
            onChange={edited}
          />
          {error?.field === "pin" && (
            <p id="pin-error" role="alert" className="text-small font-semibold text-sili">
              {error.message}
            </p>
          )}
        </div>
        {error && error.field === null && (
          <p role="alert" className="text-small font-semibold text-sili">
            {error.message}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Sumasali…" : "Join the group"}
        </Button>
      </form>
      {footer}
    </div>
  );
}
