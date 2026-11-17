"use client";

import { usePendingLabel } from "@/lib/use-pending-label";
import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Field, ThemeWeeksEditor, useThemeDrafts } from "@/components/group-fields";
import { useOrigin } from "@/components/copy-link";
import { colClass, colsClass } from "@/components/page";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { Input } from "@/components/ui/input";
import { Bubble, Capiz, SectionTitle } from "@/components/ui/paper";
import { formatPartyDay, formatPeso } from "@/lib/format";
import { submitWithoutReset } from "@/lib/forms";
import { buildGcReminder } from "@/lib/reminder";
import { cn } from "@/lib/utils";
import { isIsoDate, SAMPLE_THEMES, themeStartDates, todayIn } from "@/lib/theme-weeks";
import { createGroupAction, type CreateGroupState } from "./actions";
import { GroupCreated } from "./group-created";

const initialState: CreateGroupState = { status: "idle" };

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
  const today = useToday();
  // These fields are controlled; submitting before hydration would bypass
  // React (and its validation display), so wait until it's ready.
  const hydrated = useHydrated();
  const createLabel = usePendingLabel(pending, "Create group", "Ginagawa ang group…");
  // After a failed create: the cursor goes to the first field to fix.
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status !== "error") return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

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
  const themeDrafts = useThemeDrafts(SAMPLE_THEMES, clearErrors);
  const { themes } = themeDrafts;
  const startDates = isIsoDate(partyDate) ? themeStartDates(partyDate, themes.length) : [];

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
    <form ref={formRef} onSubmit={submitWithoutReset(formAction)} className={colsClass} noValidate aria-label="Gumawa ng group">
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

        <ThemeWeeksEditor
          themes={themes}
          startDates={startDates}
          today={today}
          errors={errors}
          onChange={themeDrafts.onChange}
          onRemove={themeDrafts.onRemove}
          onAdd={themeDrafts.onAdd}
        />
      </div>

      {/* Rendered once: under the form on phones, the right column on laptops. */}
      <div className={cn(colClass, "lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-2.5")}>{previewBlock}</div>

      <Button type="submit" className="w-full lg:col-start-1 lg:row-start-2 lg:w-fit" disabled={pending || !hydrated}>
        {createLabel}
      </Button>
    </form>
  );
}
