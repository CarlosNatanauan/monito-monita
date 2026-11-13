"use client";

import { Plus, X } from "lucide-react";
import { useActionState, useId, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { Input } from "@/components/ui/input";
import { submitWithoutReset } from "@/lib/forms";
import {
  formatShortDate,
  isIsoDate,
  MAX_THEMES,
  SAMPLE_THEMES,
  themeStartDates,
  todayIn,
} from "@/lib/theme-weeks";
import { createGroupAction, type CreateGroupState } from "./actions";
import { GroupCreated } from "./group-created";

const initialState: CreateGroupState = { status: "idle" };

interface ThemeDraft {
  key: number;
  title: string;
}

const noopSubscribe = () => () => {};
const NO_KEYS: ReadonlySet<string> = new Set();

/** Today in Manila, computed in the browser (the page shell is static). */
function useToday(): string | undefined {
  return useSyncExternalStore(noopSubscribe, () => todayIn(), () => undefined);
}

/** False in the server-rendered HTML, true once React has hydrated. */
function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
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
  // These fields are controlled; submitting before hydration would bypass
  // React (and its validation display), so wait until it's ready.
  const hydrated = useHydrated();

  // A field error hides as soon as that field is edited, until the next
  // submit. Cleared keys are tied to the result that produced them.
  const [cleared, setCleared] = useState<{ result: CreateGroupState; keys: ReadonlySet<string> }>({
    result: state,
    keys: new Set(),
  });
  const clearedKeys = cleared.result === state ? cleared.keys : NO_KEYS;
  const allErrors = state.status === "error" ? state.fieldErrors : {};
  const errors = Object.fromEntries(Object.entries(allErrors).filter(([key]) => !clearedKeys.has(key)));
  const clearErrors = (match: (key: string) => boolean) => {
    const toClear = Object.keys(allErrors).filter((key) => match(key) && !clearedKeys.has(key));
    if (toClear.length > 0) setCleared({ result: state, keys: new Set([...clearedKeys, ...toClear]) });
  };
  // Keep the summary banner while field errors remain (or for non-field errors).
  const showBanner =
    state.status === "error" &&
    Boolean(state.message) &&
    (Object.keys(allErrors).length === 0 || Object.keys(errors).length > 0);
  const startDates = isIsoDate(partyDate) ? themeStartDates(partyDate, themes.length) : [];

  const updateTheme = (key: number, index: number, title: string) => {
    setThemes((list) => list.map((t) => (t.key === key ? { ...t, title } : t)));
    clearErrors((k) => k === `themes.${index}` || k === "themes");
  };
  const removeTheme = (key: number) => {
    setThemes((list) => list.filter((t) => t.key !== key));
    // Positions shift, so per-theme errors no longer line up.
    clearErrors((k) => k.startsWith("themes"));
  };
  const addTheme = () => {
    setThemes((list) => [...list, { key: nextKey, title: "" }]);
    setNextKey((k) => k + 1);
    clearErrors((k) => k === "themes");
  };

  return (
    <>
      <header className="flex flex-col gap-3 pb-2">
        <h1 className="font-display text-heading-lg">Create your group</h1>
        <p>Ilang details lang, tapos share mo na sa GC.</p>
      </header>

      <form onSubmit={submitWithoutReset(formAction)} className="flex flex-col gap-6" noValidate>
        {showBanner && state.status === "error" && <ErrorMessage>{state.message}</ErrorMessage>}

        <Field label="Group name" error={errors.name}>
          {(props) => (
            <Input
              {...props}
              name="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearErrors((k) => k === "name");
              }}
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
              <span aria-hidden className="pointer-events-none absolute inset-y-0 left-[18px] flex items-center font-bold text-ube-soft">
                ₱
              </span>
              <Input
                {...props}
                name="budget"
                value={budget}
                onChange={(e) => {
                  setBudget(e.target.value.replace(/[^\d]/g, ""));
                  clearErrors((k) => k === "budget");
                }}
                inputMode="numeric"
                placeholder="500"
                className="pl-10"
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
              onChange={(e) => {
                setPartyDate(e.target.value);
                clearErrors((k) => k === "partyDate");
              }}
              required
            />
          )}
        </Field>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 px-1.5 font-bold">Theme weeks</legend>
          <p className="-mt-1 px-1.5 text-small font-medium text-ube-soft">
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
                      onChange={(e) => updateTheme(theme.key, index, e.target.value)}
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
                  <p className="px-1.5 text-small font-medium text-ube-soft">
                    {startDates[index] ? `Starts ${formatShortDate(startDates[index])}` : "Starts once you pick the party date"}
                  </p>
                  {error && <ErrorMessage id={errorId} alert={false}>{error}</ErrorMessage>}
                </li>
              );
            })}
          </ol>

          {themes.length === 0 && (
            <p className="px-1.5 text-small font-medium text-ube-soft">Walang theme? Okay lang, puwede rin.</p>
          )}
          {errors.themes && <ErrorMessage alert={false}>{errors.themes}</ErrorMessage>}

          {themes.length < MAX_THEMES && (
            <Button type="button" variant="secondary" size="sm" className="self-start" onClick={addTheme}>
              <Plus /> Add a theme
            </Button>
          )}
        </fieldset>

        <Button type="submit" className="w-full" disabled={pending || !hydrated}>
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
      <label htmlFor={id} className="px-1.5 font-bold">
        {label}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": error ? errorId : undefined })}
      {error && <ErrorMessage id={errorId} alert={false}>{error}</ErrorMessage>}
    </div>
  );
}
