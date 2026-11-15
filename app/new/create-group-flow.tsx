"use client";

import { useActionState, useId, useState, useSyncExternalStore } from "react";
import { useOrigin } from "@/components/copy-link";
import { colClass, colsClass } from "@/components/page";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { Input } from "@/components/ui/input";
import { Bubble, Capiz, Listahan, SectionTitle } from "@/components/ui/paper";
import { formatPartyDay, formatPeso } from "@/lib/format";
import { submitWithoutReset } from "@/lib/forms";
import { buildGcReminder } from "@/lib/reminder";
import { cn } from "@/lib/utils";
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
    return (
      <GroupCreated
        groupName={state.groupName}
        slug={state.slug}
        organizerToken={state.organizerToken}
        budget={state.budget}
        partyDate={state.partyDate}
      />
    );
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

  const origin = useOrigin();
  const host = origin.replace(/^https?:\/\//, "");
  const preview = buildGcReminder({
    groupName: name.trim() || "Barkada Christmas Party",
    status: "OPEN",
    shareUrl: `${host || "monitomonita-ph.vercel.app"}/g/…`,
    memberCount: 0,
    partyDate: isIsoDate(partyDate) ? partyDate : "",
    budget: budget ? Number(budget) : null,
    theme: { kind: "none", partyDate: "", daysToParty: 0 },
  });
  const shortParty = isIsoDate(partyDate) ? formatPartyDay(partyDate) : "—";

  // Phones: one column (details, themes, the GC preview, Create). Laptops:
  // the form and Create on the left; the live GC preview on the right.
  const previewBlock = (
    <div className="flex min-w-0 flex-col gap-[18px] lg:gap-[22px]">
      <div className="flex flex-col gap-2">
        <SectionTitle>Preview sa GC</SectionTitle>
        <p className="text-small text-ube-soft">Ganito ang lalabas kapag pinaste mo sa GC. Nag-a-update habang nagta-type ka.</p>
      </div>
      <Bubble aria-label="Invite preview">{preview}</Bubble>
      <Capiz aria-label="Link preview">
        <p className="font-head text-section break-words lg:text-section-lg">{name.trim() || "Barkada Christmas Party"}</p>
        <p className="text-small">
          Sali na sa bunutan. Party: {shortParty} · {budget ? formatPeso(Number(budget)) : "₱—"}
        </p>
        <p className="text-small text-ube-soft" translate="no">
          {host || "monitomonita-ph.vercel.app"}
        </p>
      </Capiz>
    </div>
  );

  return (
    <form onSubmit={submitWithoutReset(formAction)} className={colsClass} noValidate aria-label="Gumawa ng group">
      <div className={cn(colClass, "lg:col-start-1 lg:row-start-1")}>
        <h1 className="font-head text-title lg:mt-2.5 lg:text-title-lg">Gumawa ng group</h1>
        {showBanner && state.status === "error" && <ErrorMessage>{state.message}</ErrorMessage>}

        <Field label="Pangalan ng group" error={errors.name}>
          {(props) => (
            <Input
              {...props}
              name="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearErrors((k) => k === "name");
              }}
              placeholder="Barkada Christmas 2026"
              maxLength={60}
              autoComplete="off"
              required
            />
          )}
        </Field>

        <div className="grid grid-cols-[1.4fr_1fr] items-start gap-3">
          <Field label="Petsa ng party" error={errors.partyDate}>
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

          <Field label="Budget" error={errors.budget}>
            {(props) => (
              <div className="relative">
                <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ube">
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
                  className="pl-7"
                  required
                />
              </div>
            )}
          </Field>
        </div>

        <Listahan title="Weekly themes" titleId="themes-title">
          <p className="lst-row text-small text-ube-soft">Isang theme kada linggo bago ang party.</p>
          {/* Said once, not under every theme. Each theme's date shows once there is a party date. */}
          {themes.length > 0 && startDates.length === 0 && (
            <p className="lst-row text-small text-ube-soft">Starts once you pick the party date.</p>
          )}
          <ol aria-labelledby="themes-title">
            {themes.map((theme, index) => {
              const error = errors[`themes.${index}`];
              const errorId = `theme-${theme.key}-error`;
              const inputId = `theme-${theme.key}`;
              return (
                <li key={theme.key}>
                  <div className="lst-row2">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <label htmlFor={inputId} className="text-tag font-bold text-dahon">
                        Week {index + 1}
                        {startDates[index] && (
                          <>
                            {" · "}
                            <span className="font-normal">Starts {formatShortDate(startDates[index])}</span>
                          </>
                        )}
                      </label>
                      <Input
                        id={inputId}
                        size="row"
                        name="theme"
                        value={theme.title}
                        onChange={(e) => updateTheme(theme.key, index, e.target.value)}
                        aria-label={`Theme ${index + 1}`}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? errorId : undefined}
                        placeholder="Something…"
                        maxLength={60}
                        className="h-11"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      className="self-end"
                      onClick={() => removeTheme(theme.key)}
                      aria-label={`Remove theme ${index + 1}`}
                    >
                      Alisin
                    </Button>
                  </div>
                  {error && (
                    <ErrorMessage id={errorId} alert={false} className="my-2">
                      {error}
                    </ErrorMessage>
                  )}
                </li>
              );
            })}
          </ol>
          {themes.length === 0 && <p className="lst-row text-ube-soft">Walang theme? Okay lang, puwede rin.</p>}
          {errors.themes && (
            <ErrorMessage alert={false} className="my-2">
              {errors.themes}
            </ErrorMessage>
          )}
          {themes.length < MAX_THEMES && (
            <div className="lst-row">
              <Button type="button" variant="link" onClick={addTheme}>
                + Magdagdag ng week
              </Button>
            </div>
          )}
        </Listahan>
      </div>

      {/* Rendered once: under the form on phones, the right column on laptops. */}
      <div className={cn(colClass, "lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-2.5")}>{previewBlock}</div>

      <Button type="submit" className="w-full lg:col-start-1 lg:row-start-2 lg:w-fit" disabled={pending || !hydrated}>
        {pending ? "Ginagawa na…" : "Create group"}
      </Button>
    </form>
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
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="font-bold">
        {label}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": error ? errorId : undefined })}
      {error && <ErrorMessage id={errorId} alert={false}>{error}</ErrorMessage>}
    </div>
  );
}
