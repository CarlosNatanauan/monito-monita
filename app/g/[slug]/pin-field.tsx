"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const PIN_LENGTH = 4;
const noopSubscribe = () => () => {};

/**
 * The 4-digit PIN as four circles (docs/DESIGN.md, "PIN boxes").
 *
 * One real input (name="pin") sits over the circles, so the form still
 * posts before hydration, paste and password managers work, and focus
 * "moves" to the next circle as you type. Its text is invisible once React
 * runs; the circles show a dot per digit and a gold ring on the next one.
 * Before hydration the masked text shows through, spaced over the circles.
 * Numeric keypad on phones (inputMode + pattern for iOS); never echoed back
 * by the server.
 */
export function PinField({
  id,
  label,
  autoComplete,
  invalid,
  describedBy,
  autoFocus,
  onChange,
}: {
  id: string;
  label: ReactNode;
  autoComplete: "new-password" | "current-password";
  invalid?: boolean;
  describedBy?: string;
  autoFocus?: boolean;
  onChange?: () => void;
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
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="px-1.5 font-bold">
        {label}
      </label>
      <div className="relative w-fit">
        <div aria-hidden className="flex gap-3">
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <span
              key={i}
              data-pin-box
              className={cn(
                "flex size-[60px] items-center justify-center rounded-full border-[1.5px] border-ube-line bg-niyog",
                invalid && "border-2 border-sili",
                i === active &&
                  (invalid
                    ? "shadow-[0_0_0_4px_rgb(244_197_66/0.8)]"
                    : "border-2 border-ube shadow-[0_0_0_4px_rgb(244_197_66/0.8)]"),
              )}
            >
              {hydrated && i < length && <span className="size-3.5 rounded-full bg-ube" />}
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
          maxLength={PIN_LENGTH}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
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
            "absolute inset-0 h-full w-full cursor-pointer rounded-full bg-transparent outline-none",
            // Keep the caret and selection out of sight; the circles show focus.
            "caret-transparent selection:bg-transparent [-webkit-tap-highlight-color:transparent]",
            hydrated
              ? "text-transparent"
              : "pl-[23px] font-mono text-[18px] tracking-[57px] text-ube",
          )}
        />
      </div>
    </div>
  );
}
