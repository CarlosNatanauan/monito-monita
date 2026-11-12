"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";

/**
 * A 4-digit PIN field: numeric keypad on phones (inputMode + pattern for
 * iOS), masked, never echoed back by the server.
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
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-bold">
        {label}
      </label>
      <Input
        id={id}
        name="pin"
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        placeholder="••••"
        className="max-w-40 tracking-[0.5em]"
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        onChange={onChange}
        required
      />
    </div>
  );
}
