"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinAction, type JoinState } from "./actions";

const initialState: JoinState = { status: "idle" };

/**
 * Uncontrolled on purpose: `<form action>` works even before hydration
 * (slow phones opening links from Messenger), and the action returns the
 * submitted name, which becomes the default value so React's automatic
 * form reset restores it instead of clearing it.
 */
export function JoinForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState(joinAction, initialState);
  // The error hides as soon as the name is edited, until the next submit.
  const [editedAfter, setEditedAfter] = useState<JoinState | null>(null);
  const error = state.status === "error" && editedAfter !== state ? state : null;
  const submittedName = state.status === "error" ? state.displayName : "";

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="slug" value={slug} />
      <div className="flex flex-col gap-2">
        <label htmlFor="displayName" className="font-bold">
          Pangalan mo
        </label>
        <Input
          id="displayName"
          name="displayName"
          defaultValue={submittedName}
          onChange={() => {
            if (editedAfter !== state) setEditedAfter(state);
          }}
          placeholder="Joy"
          maxLength={40}
          autoComplete="given-name"
          aria-invalid={error?.nameError ? true : undefined}
          aria-describedby={error ? "join-error" : "join-hint"}
          required
        />
        {error ? (
          <p id="join-error" role="alert" className="text-caption font-semibold text-destructive">
            {error.message}
          </p>
        ) : (
          <p id="join-hint" className="text-caption text-muted-foreground">
            Ito ang makikita ng ibang members.
          </p>
        )}
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Sumasali…" : "Join the group"}
      </Button>
    </form>
  );
}
