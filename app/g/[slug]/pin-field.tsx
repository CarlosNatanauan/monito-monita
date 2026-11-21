"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const PIN_LENGTH = 4;
const noopSubscribe = () => () => {};

/**
 * The 4-digit PIN as four square boxes (docs/DESIGN.md, "PIN boxes").
 *
 * One real input (name="pin") sits over the boxes, so the form still
 * posts before hydration, paste and password managers work, and focus
 * "moves" to the next box as you type. Its text is invisible once React
 * runs; the boxes show a dot per digit and the next one lit (ilaw-lit,
 * 2.5px border). Before hydration the masked text shows through, spaced
 * over the boxes.
 * Numeric keypad on phones (inputMode + pattern for iOS); never echoed back
 * by the server.
 */
export function PinField({
  id,
  label,
  labelClassName = "font-bold",
  rowClassName,
  autoComplete,
  invalid,
  describedBy,
  autoFocus,
  onChange,
  readOnly,
}: {
  id: string;
  label: ReactNode;
  /** The listahan sets labels in dahon 14 bold on the rule. */
  labelClassName?: string;
  /** Wraps the boxes (a listahan two-line row). */
  rowClassName?: string;
  autoComplete: "new-password" | "current-password";
  invalid?: boolean;
  describedBy?: string;
  autoFocus?: boolean;
  onChange?: () => void;
  /** While the form's submit is pending: read-only (the PIN still posts). */
  readOnly?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [length, setLength] = useState(0);
  const [focused, setFocused] = useState(false);
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  // React resets uncontrolled forms after an action (and the PIN is never
  // echoed back), so re-read the real value when a result comes back
  // (invalid / describedBy change) and on reset.
  useLayoutEffect(() => {
    setLength(inputRef.current?.value.length ?? 0);
  }, [invalid, describedBy]);
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const onReset = () => setTimeout(() => setLength(inputRef.current?.value.length ?? 0), 0);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  const active = focused ? Math.min(length, PIN_LENGTH - 1) : -1;

  return (
    <>
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      <div className={rowClassName}>
      {/* Sized in rem, so the boxes grow with the reader's text size (54×60 at 16px), and never
          wider than the row: at a very large text size they shrink to fit four across. */}
      <div className="relative w-full max-w-[15.375rem]">
        <div aria-hidden className="grid grid-cols-4 gap-2.5">
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <span
              key={i}
              data-pin-box
              className={cn(
                "flex aspect-[54/60] items-center justify-center rounded-[4px] border-[1.5px] border-ube bg-papel",
                i === active && "border-[2.5px] bg-ilaw-lit",
                invalid && "border-[2.5px] border-sili",
              )}
            >
              {hydrated && i < length && <span className="size-3 rounded-full bg-ube" />}
            </span>
          ))}
        </div>
        <input
          ref={inputRef}
          id={id}
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          // Room for a pasted "12-34" or "1 2 3 4" (maxLength 4 would cut it before the clean-up below).
          maxLength={PIN_LENGTH * 3}
          autoComplete={autoComplete}
          // iOS Safari: what a PIN may be, so it doesn't offer a "Strong Password" here.
          {...{ passwordrules: `required: digit; minlength: ${PIN_LENGTH}; maxlength: ${PIN_LENGTH};` }}
          autoFocus={autoFocus}
          readOnly={readOnly}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={describedBy}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => {
            // Digits only; a pasted "12-34" still works.
            const digits = event.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH);
            if (digits !== event.target.value) event.target.value = digits;
            setLength(digits.length);
            onChange?.();
          }}
          required
          className={cn(
            "absolute inset-0 h-full w-full cursor-pointer rounded-[4px] bg-transparent outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ilaw",
            // Keep the caret and selection out of sight; the circles show focus.
            "caret-transparent selection:bg-transparent [-webkit-tap-highlight-color:transparent]",
            hydrated
              ? "text-transparent"
              : "pl-[1.3125rem] font-mono text-[1.125rem] tracking-[3.3125rem] text-ube",
          )}
        />
      </div>
      </div>
    </>
  );
}
