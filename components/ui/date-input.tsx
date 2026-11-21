import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "./input"

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

export { DateInput }
