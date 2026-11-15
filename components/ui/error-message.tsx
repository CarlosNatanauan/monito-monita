import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * docs/DESIGN.md, "Error message": a sili-wash box with a 1.5px sili
 * border, sili 15/700 text and a round "!" badge. Directly under the
 * thing that failed. The "!" is a pseudo-element so the alert's text is
 * only the message.
 */
function ErrorMessage({
  className,
  children,
  alert = true,
  ...props
}: React.ComponentProps<"p"> & {
  /** Announce it (role="alert"). Off for field errors shown together with a summary that is announced. */
  alert?: boolean
}) {
  if (!children) return null
  return (
    <p
      role={alert ? "alert" : undefined}
      className={cn(
        "flex gap-2.5 self-stretch rounded-paper border-[1.5px] border-sili bg-sili-wash px-3 py-2.5 text-small font-bold text-sili",
        "before:mt-0.5 before:flex before:size-5 before:shrink-0 before:items-center before:justify-center before:rounded-full before:bg-sili before:text-[13px] before:leading-none before:font-bold before:text-white before:content-['!']",
        className
      )}
      {...props}
    >
      {children}
    </p>
  )
}

export { ErrorMessage }
