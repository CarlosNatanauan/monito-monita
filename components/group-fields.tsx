"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { Input } from "@/components/ui/input";
import { Listahan } from "@/components/ui/paper";
import { cn } from "@/lib/utils";
import {
  formatShortDate,
  MAX_THEMES,
  pastWeeksWarning,
  THEME_WEEK_TAG,
  themeWeekStates,
} from "@/lib/theme-weeks";

/**
 * Fields shared by "Gumawa ng group" (/new) and "Edit details" on the
 * organizer page, so both look and validate the same (server: the same
 * createGroupSchema).
 */

export interface ThemeDraft {
  key: number;
  title: string;
}

/**
 * The theme rows being edited, with stable keys. `clearErrors` hides field
 * errors that no longer line up after an edit.
 */
export function useThemeDrafts(initial: readonly string[], clearErrors: (match: (key: string) => boolean) => void) {
  const [themes, setThemes] = useState<ThemeDraft[]>(() => initial.map((title, key) => ({ key, title })));
  const [nextKey, setNextKey] = useState(initial.length);
  return {
    themes,
    onChange: (key: number, index: number, title: string) => {
      setThemes((list) => list.map((t) => (t.key === key ? { ...t, title } : t)));
      clearErrors((k) => k === `themes.${index}` || k === "themes");
    },
    onRemove: (key: number) => {
      setThemes((list) => list.filter((t) => t.key !== key));
      // Positions shift, so per-theme errors no longer line up.
      clearErrors((k) => k.startsWith("themes"));
    },
    onAdd: () => {
      setThemes((list) => [...list, { key: nextKey, title: "" }]);
      setNextKey((k) => k + 1);
      clearErrors((k) => k === "themes");
    },
  };
}

interface FieldControlProps {
  id: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
}

export function Field({
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

/**
 * The weekly themes on a listahan: one row per week with its start date
 * (once there's a party date), "Tapos na" / "Ngayong linggo" tags, and a
 * warning when some weeks would already be over (weeks count back from the
 * party, so adding one moves Week 1 earlier). Posts each title as `theme`.
 */
export function ThemeWeeksEditor({
  themes,
  startDates,
  today,
  errors,
  onChange,
  onRemove,
  onAdd,
}: {
  themes: ThemeDraft[];
  /** One per theme once there's a party date, else empty. */
  startDates: string[];
  /** Today in Manila; undefined before hydration (no tags then). */
  today: string | undefined;
  errors: Record<string, string>;
  onChange: (key: number, index: number, title: string) => void;
  onRemove: (key: number) => void;
  onAdd: () => void;
}) {
  const titleId = useId();
  const states = today && startDates.length > 0 ? themeWeekStates(startDates, today) : [];
  const warning = pastWeeksWarning(states);
  return (
    <div className="flex flex-col gap-2.5">
      <Listahan title="Weekly themes" titleId={titleId}>
        <p className="lst-row text-small text-ube-soft">Isang theme kada linggo bago ang party.</p>
        {/* Said once, not under every theme. Each theme's date shows once there is a party date. */}
        {themes.length > 0 && startDates.length === 0 && (
          <p className="lst-row text-small text-ube-soft">Starts once you pick the party date.</p>
        )}
        <ol aria-labelledby={titleId}>
          {themes.map((theme, index) => {
            const error = errors[`themes.${index}`];
            const errorId = `theme-${theme.key}-error`;
            const inputId = `theme-${theme.key}`;
            const state = states[index];
            const tag = state ? THEME_WEEK_TAG[state] : null;
            return (
              <li key={theme.key}>
                <div className="lst-row2">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <label htmlFor={inputId} className="truncate text-tag font-bold text-dahon">
                      Week {index + 1}
                      {startDates[index] && (
                        <>
                          {" · "}
                          <span className="font-normal">Starts {formatShortDate(startDates[index])}</span>
                        </>
                      )}
                      {tag && (
                        <>
                          {" · "}
                          <span className={cn(state === "past" && "text-sili")}>{tag}</span>
                        </>
                      )}
                    </label>
                    <Input
                      id={inputId}
                      size="row"
                      name="theme"
                      value={theme.title}
                      onChange={(e) => onChange(theme.key, index, e.target.value)}
                      aria-label={`Theme ${index + 1}`}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? errorId : undefined}
                      placeholder="Something…"
                      maxLength={60}
                      className={cn("h-11", state === "past" && "text-ube-soft")}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    className="self-end"
                    onClick={() => onRemove(theme.key)}
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
            <Button type="button" variant="link" onClick={onAdd}>
              + Magdagdag ng week
            </Button>
          </div>
        )}
      </Listahan>
      {warning && (
        <p
          role="status"
          data-past-weeks
          className="rounded-paper border-[1.5px] border-ube bg-ilaw-lit px-3 py-2.5 text-small font-bold text-ube"
        >
          {warning}
        </p>
      )}
    </div>
  );
}
