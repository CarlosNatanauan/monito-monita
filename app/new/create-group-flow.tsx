"use client";

import { Plus, X } from "lucide-react";
import { useActionState, useId, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatShortDate,
  isIsoDate,
  MAX_THEMES,
  SAMPLE_THEMES,
  themeStartDates,
  todayIn,
} from "@/lib/theme-weeks";
import { cn } from "@/lib/utils";
import { createGroupAction, type CreateGroupState } from "./actions";
import { GroupCreated } from "./group-created";

const initialState: CreateGroupState = { status: "idle" };

interface ThemeDraft {
  key: number;
  title: string;
}

const noopSubscribe = () => () => {};

/** Today in Manila, computed in the browser (the page shell is static). */
function useToday(): string | undefined {
  return useSyncExternalStore(noopSubscribe, () => todayIn(), () => undefined);
}

export function CreateGroupFlow() {
  const [state, formAction, pending] = useActionState(createGroupAction, initialState);

  if (state.status === "success") {
    return <GroupCreated groupName={state.groupName} slug={state.slug} organizerToken={state.organizerToken} />;
  }

  return <CreateGroupForm state={state} formAction={formAction} pending={pending} />;
}

function CreateGroupForm({
  state,
  formAction,
  pending,
}: {
  state: CreateGroupState;
  formAction: (formData: FormData) => void;
  pending: boolean;
}) {
  // Controlled fields so values survive a failed submit.
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [partyDate, setPartyDate] = useState("");
  const [themes, setThemes] = useState<ThemeDraft[]>(() =>
    SAMPLE_THEMES.map((title, key) => ({ key, title })),
  );
  const [nextKey, setNextKey] = useState<number>(SAMPLE_THEMES.length);
  const today = useToday();

  const errors = state.status === "error" ? state.fieldErrors : {};
  const startDates = isIsoDate(partyDate) ? themeStartDates(partyDate, themes.length) : [];

  const updateTheme = (key: number, title: string) =>
    setThemes((list) => list.map((t) => (t.key === key ? { ...t, title } : t)));
  const removeTheme = (key: number) => setThemes((list) => list.filter((t) => t.key !== key));
  const addTheme = () => {
    setThemes((list) => [...list, { key: nextKey, title: "" }]);
    setNextKey((k) => k + 1);
  };

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-heading">Create your group</h1>
        <p className="text-muted-foreground">Ilang details lang, tapos share mo na sa GC.</p>
      </header>

      <form action={formAction} className="flex flex-col gap-6" noValidate>
        {state.status === "error" && state.message && (
          <p role="alert" className="rounded-xl bg-destructive/8 px-4 py-3 text-caption font-semibold text-destructive">
            {state.message}
          </p>
        )}

        <Field label="Group name" error={errors.name}>
          {(props) => (
            <Input
              {...props}
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Barkada Christmas Party"
              maxLength={60}
              autoComplete="off"
              required
            />
          )}
        </Field>

        <Field label="Budget per gift" error={errors.budget}>
          {(props) => (
            <div className="relative">
              <span aria-hidden className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-semibold text-muted-foreground">
                ₱
              </span>
              <Input
                {...props}
                name="budget"
                value={budget}
                onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                placeholder="500"
                className="pl-9"
                required
              />
            </div>
          )}
        </Field>

        <Field label="Party date" error={errors.partyDate}>
          {(props) => (
            <Input
              {...props}
              type="date"
              name="partyDate"
              value={partyDate}
              min={today}
              onChange={(e) => setPartyDate(e.target.value)}
              required
            />
          )}
        </Field>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 font-bold">Theme weeks</legend>
          <p className="-mt-1 text-caption text-muted-foreground">
            Isang theme kada linggo bago ang party. Palitan o tanggalin as you like.
          </p>

          <ol className="flex flex-col gap-3">
            {themes.map((theme, index) => {
              const error = errors[`themes.${index}`];
              const errorId = `theme-${theme.key}-error`;
              return (
                <li key={theme.key} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Input
                      name="theme"
                      value={theme.title}
                      onChange={(e) => updateTheme(theme.key, e.target.value)}
                      aria-label={`Theme ${index + 1}`}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? errorId : undefined}
                      placeholder="Something…"
                      maxLength={60}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTheme(theme.key)}
                      aria-label={`Remove theme ${index + 1}`}
                    >
                      <X />
                    </Button>
                  </div>
                  <p className="pl-1 text-caption text-muted-foreground">
                    {startDates[index] ? `Starts ${formatShortDate(startDates[index])}` : "Starts once you pick the party date"}
                  </p>
                  {error && (
                    <p id={errorId} className="pl-1 text-caption font-semibold text-destructive">
                      {error}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>

          {themes.length === 0 && (
            <p className="text-caption text-muted-foreground">Walang theme? Okay lang, puwede rin.</p>
          )}
          {errors.themes && <p className="text-caption font-semibold text-destructive">{errors.themes}</p>}

          {themes.length < MAX_THEMES && (
            <Button type="button" variant="ghost" size="sm" className="self-start" onClick={addTheme}>
              <Plus /> Add a theme
            </Button>
          )}
        </fieldset>

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Ginagawa na…" : "Create group"}
        </Button>
      </form>
    </>
  );
}

interface FieldControlProps {
  id: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: (props: FieldControlProps) => React.ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-bold">
        {label}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": error ? errorId : undefined })}
      {error && (
        <p id={errorId} className={cn("text-caption font-semibold text-destructive")}>
          {error}
        </p>
      )}
    </div>
  );
}
