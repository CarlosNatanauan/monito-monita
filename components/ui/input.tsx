import * as React from "react"
import { cn } from "@/lib/utils"

// Kept apart from Select and DateInput (components/ui/select.tsx, date-input.tsx):
// modules ship whole, and /me needs only Input (docs/DESIGN.md, "Performance on budget phones").

// Restyled for Monito Monita (docs/DESIGN.md, "Inputs"): 54px, white,
// 1.5px ube border, uneven 6px corners, 16px text (no iOS zoom). Focus:
// the 3px gold outline. Error: a 2.5px sili border (drawn inside, so
// nothing shifts) plus the error message under it.
export const fieldClass =
  "w-full min-w-0 rounded-field border-[1.5px] border-ube bg-papel px-3.5 text-body text-ube outline-none placeholder:text-ube-soft focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ilaw aria-invalid:border-sili aria-invalid:shadow-[inset_0_0_0_1px_var(--color-sili)] disabled:cursor-not-allowed disabled:bg-ube-mist disabled:text-ube-soft"

function Input({
  className,
  type,
  size = "default",
  hand = false,
  ...props
}: Omit<React.ComponentProps<"input">, "size"> & {
  /** 54px on the page, 48px inside a listahan row. */
  size?: "default" | "row"
  /** The name field: typed text in Gochi Hand 28. */
  hand?: boolean
}) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        fieldClass,
        size === "row" ? "h-12 px-2.5" : "h-[54px]",
        hand && "font-hand text-hand placeholder:font-sans placeholder:text-body",
        className
      )}
      {...props}
    />
  )
}

export { Input }
