import * as React from "react"
import { cn } from "@/lib/utils"

// Restyled for Monito Monita (docs/DESIGN.md, "Inputs"): white, radius 18,
// 1.5px ube-line border, 18px side padding, 16px text (no iOS zoom).
// Focus: a 2px ube border (the extra 0.5px is an inset shadow, so nothing
// shifts) plus the 4px gold ring. Errors: a 2px sili border.
export const fieldClass =
  "w-full min-w-0 rounded-[18px] border-[1.5px] border-ube-line bg-niyog px-[18px] text-body text-ube outline-none placeholder:text-ube-soft focus-visible:border-ube focus-visible:shadow-[inset_0_0_0_0.5px_var(--color-ube),0_0_0_4px_rgb(244_197_66/0.8)] aria-invalid:border-sili aria-invalid:shadow-[inset_0_0_0_0.5px_var(--color-sili)] aria-invalid:focus-visible:shadow-[inset_0_0_0_0.5px_var(--color-sili),0_0_0_4px_rgb(244_197_66/0.8)] disabled:cursor-not-allowed disabled:bg-ube-mist disabled:text-ube-soft"

function Input({
  className,
  type,
  size = "default",
  hand = false,
  ...props
}: Omit<React.ComponentProps<"input">, "size"> & {
  /** 58px on the page, 52px inside cards. */
  size?: "default" | "card"
  /** The name field: typed text in Gochi Hand 26. */
  hand?: boolean
}) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        fieldClass,
        size === "card" ? "h-[52px]" : "h-[58px]",
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
        "h-[52px] appearance-none bg-[length:10px_6px] bg-[right_16px_center] bg-no-repeat pr-9",
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M0 0h10L5 6z' fill='%234B2472'/%3E%3C/svg%3E\")]",
        className
      )}
      {...props}
    />
  )
}

export { Input, Select }
