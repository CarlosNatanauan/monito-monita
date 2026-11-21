import * as React from "react"
import { cn } from "@/lib/utils"

// Restyled for Monito Monita (docs/DESIGN.md, "Buttons"). Hand-cut
// corners, never pills, no shadows:
// - default: the one filled ube button per screen. Chelsea Market 20,
//   58px tall (60 on laptop). Full width on phones by the caller.
// - secondary: white, 1.5px ube border, Atkinson 700 16, 48px tall.
// - link: underlined Atkinson 700, a 44px tap target ("Alisin", "Edit").
// - gold: the reveal screen only (ilaw fill, gabi text).
// Disabled is ube-mist with ube-soft text; always add a line saying why.
// Heights are minimums: at a large text size the label wraps and the
// button grows instead of spilling out sideways (in a row it may shrink,
// never below its longest word).
// Focus: a 3px gold outline, 2px out. Pressed: scale 0.98 (transform only).
const BASE =
  "group/button inline-flex cursor-pointer items-center justify-center gap-2 text-center select-none focus-ring transition-transform duration-100 ease-out active:not-disabled:scale-[0.98] disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5 [-webkit-tap-highlight-color:transparent]"

const VARIANTS = {
  default:
    "min-h-[58px] rounded-btn bg-ube px-[26px] py-2 font-head text-button text-white disabled:bg-ube-mist disabled:text-ube-soft lg:min-h-[60px] lg:px-[30px]",
  secondary:
    "min-h-12 rounded-btn-sm border-[1.5px] border-ube bg-papel px-[18px] py-1.5 font-sans text-body font-bold text-ube disabled:border-ube-mist disabled:bg-ube-mist disabled:text-ube-soft",
  link: "min-h-11 min-w-11 px-1.5 font-sans text-small font-bold text-ube underline decoration-[1.5px] underline-offset-[3px] disabled:text-ube-soft",
  gold: "min-h-[54px] rounded-btn bg-ilaw px-[26px] font-head text-button text-gabi disabled:bg-gabi-2 disabled:text-gabi-text",
} as const

export type ButtonVariant = keyof typeof VARIANTS

/** The classes for a button variant (also for links styled as buttons). */
function buttonVariants({ variant = "default" }: { variant?: ButtonVariant | null } = {}): string {
  return `${BASE} ${VARIANTS[variant ?? "default"]}`
}

function Button({
  className,
  variant = "default",
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"button"> & {
    variant?: ButtonVariant | null
    /** Style the single child (a Link) as the button instead of rendering a <button>. */
    asChild?: boolean
  }) {
  const classes = cn(buttonVariants({ variant }), className)
  if (asChild && React.isValidElement<{ className?: string }>(children)) {
    // A small stand-in for Radix's Slot (kept out of the first load): the
    // child keeps its own props and gets the button's look.
    return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
      "data-slot": "button",
      "data-variant": variant,
      className: cn(classes, children.props.className),
    })
  }
  return (
    <button data-slot="button" data-variant={variant} className={classes} {...props}>
      {children}
    </button>
  )
}

export { Button, buttonVariants }
