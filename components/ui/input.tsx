import * as React from "react"
import { cn } from "@/lib/utils"

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

/** A native select styled like the inputs, with a small ube caret. */
function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        fieldClass,
        "min-h-12 appearance-none bg-[length:8px_5px] bg-[right_14px_center] bg-no-repeat pr-8",
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M0 0h10L5 6z' fill='%233F1F63'/%3E%3C/svg%3E\")]",
        className
      )}
      {...props}
    />
  )
}

/**
 * A date field that behaves on iOS Safari: there a date input keeps a
 * built-in minimum width (it spilled into the Budget column), is taller
 * than the other fields and shows no placeholder. `date-field`
 * (app/globals.css) drops the native look, fills the column at the inputs'
 * height and left-aligns the value; while empty and not focused it shows
 * "Pumili ng petsa" in soft ube (WebKit and Blink, which draw an empty date
 * as blank or mm/dd/yyyy; Firefox keeps its own placeholder).
 */
function DateInput({
  className,
  value,
  hint = "Pumili ng petsa",
  ...props
}: Omit<React.ComponentProps<"input">, "size" | "type"> & { value: string; hint?: string }) {
  return (
    <div className="relative min-w-0">
      <Input type="date" value={value} data-empty={value ? undefined : ""} className={cn("date-field", className)} {...props} />
      <span aria-hidden className="date-hint pointer-events-none absolute inset-y-0 left-3.5 items-center text-body text-ube-soft">
        {hint}
      </span>
    </div>
  )
}

export { DateInput, Input, Select }
