import * as React from "react"
import { cn } from "@/lib/utils"

// Restyled for Monito Monita: white slip field, 48px tall, 16px text
// (prevents iOS zoom on focus), clear indigo focus ring.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-xl border border-input bg-slip px-4 text-body text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15 file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-caption file:font-semibold file:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Input }
