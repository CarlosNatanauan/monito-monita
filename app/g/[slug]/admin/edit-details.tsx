"use client";

import { usePendingLabel } from "@/lib/use-pending-label";
import { useActionState, useEffect, useState, useSyncExternalStore } from "react";
import { Field, ThemeWeeksEditor, useThemeDrafts } from "@/components/group-fields";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { CheckIcon } from "@/components/ui/icons";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { SectionTitle } from "@/components/ui/paper";
import { submitWithoutReset } from "@/lib/forms";
import { isIsoDate, themeStartDates, todayIn } from "@/lib/theme-weeks";
import { updateDetailsAction, type DetailsState } from "./actions";

const noopSubscribe = () => () => {};
const NO_KEYS: ReadonlySet<string> = new Set();

export interface GroupDetails {
  name: string;
  budget: number;
  partyDate: string;
  themes: string[];
}

/**
 * "Edit details" (persona test C5): fix the party date, budget, name or
 * themes without making a new group (and a new link for 40 people). The
 * same fields as /new, checked by the same schema on the server. After the
 * draw only the date and themes can change.
 */
export function EditDetails({ slug, details, all }: { slug: string; details: GroupDetails; all: boolean }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" onClick={() => (setOpen(true), setSaved(false))}>
          Edit details
        </Button>
        {saved && (
          <p role="status" className="flex items-center gap-1.5 font-bold text-dahon">
            <CheckIcon /> Na-save ang details.
          </p>
        )}
      </div>
    );
  }
  return (
    <DetailsForm
      slug={slug}
      details={details}
      all={all}
      onClose={(didSave) => {
        setOpen(false);
        setSaved(didSave);
      }}
    />
  );
}

function DetailsForm({
  slug,
  details,
  all,
  onClose,
}: {
  slug: string;
  details: GroupDetails;
  all: boolean;
  onClose: (saved: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState<DetailsState, FormData>(updateDetailsAction, { status: "idle" });
  const saveLabel = usePendingLabel(pending, "I-save", "Sine-save…");
  const [name, setName] = useState(details.name);
  const [budget, setBudget] = useState(String(details.budget));
  const [partyDate, setPartyDate] = useState(details.partyDate);
  const today = useSyncExternalStore(noopSubscribe, () => todayIn(), () => undefined);

  // Field errors hide once that field is edited, until the next save.
  const [cleared, setCleared] = useState<{ result: DetailsState; keys: ReadonlySet<string> }>({
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

  const themeDrafts = useThemeDrafts(details.themes, clearErrors);
  const startDates = isIsoDate(partyDate) ? themeStartDates(partyDate, themeDrafts.themes.length) : [];

  // Saved: close the form (the page has refreshed with the new details).
  useEffect(() => {
    if (state.status === "saved") onClose(true);
  }, [state, onClose]);

  return (
    <form
      onSubmit={submitWithoutReset(formAction)}
      className="flex flex-col gap-[18px]"
      aria-label="Edit details"
      noValidate
    >
      <input type="hidden" name="slug" value={slug} />
      <SectionTitle>Edit details</SectionTitle>
      {!all && (
        <p className="text-small text-ube-soft">
          Na-draw na, kaya ang petsa at themes na lang ang puwedeng baguhin.
        </p>
      )}
      {state.status === "error" && <ErrorMessage>{state.message}</ErrorMessage>}

      {all && (
        <Field label="Pangalan ng group" error={errors.name}>
          {(props) => (
            <Input
              {...props}
              readOnly={pending}
              name="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearErrors((k) => k === "name");
              }}
              maxLength={60}
              autoComplete="off"
              required
            />
          )}
        </Field>
      )}

      <div className={all ? "grid grid-cols-[1.4fr_1fr] items-start gap-3" : "flex flex-col"}>
        <Field label="Petsa ng party" error={errors.partyDate}>
          {(props) => (
            <DateInput
              {...props}
              readOnly={pending}
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
        {all && (
          <Field label="Budget" error={errors.budget}>
            {(props) => (
              <div className="relative">
                <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ube">
                  ₱
                </span>
                <Input
                  {...props}
                  readOnly={pending}
                  name="budget"
                  value={budget}
                  onChange={(e) => {
                    setBudget(e.target.value.replace(/[^\d]/g, ""));
                    clearErrors((k) => k === "budget");
                  }}
                  inputMode="numeric"
                  className="pl-7"
                  required
                />
              </div>
            )}
          </Field>
        )}
      </div>

      <ThemeWeeksEditor
        readOnly={pending}
        themes={themeDrafts.themes}
        startDates={startDates}
        today={today}
        errors={errors}
        onChange={themeDrafts.onChange}
        onRemove={themeDrafts.onRemove}
        onAdd={themeDrafts.onAdd}
      />

      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" variant="secondary" disabled={pending}>
          {saveLabel}
        </Button>
        <Button type="button" variant="link" disabled={pending} onClick={() => onClose(false)}>
          Huwag na
        </Button>
      </div>
    </form>
  );
}
