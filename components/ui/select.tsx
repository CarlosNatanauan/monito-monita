import * as React from "react"
import { cn } from "@/lib/utils"
import { fieldClass } from "./input"

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

export { Select }
