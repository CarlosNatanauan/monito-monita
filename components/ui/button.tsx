import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

// Restyled for Monito Monita (docs/DESIGN.md, "Buttons"):
// - default: the one filled ube button per screen (the main action).
// - secondary: white with an ube outline.
// - link: underlined text, still a 44px tap target.
// - ghost: quiet text buttons for small row actions (Edit, Alisin).
// Disabled is ube-mist with ube-soft text (pair it with a line saying why).
// Only transform animates (press scale); colors change instantly.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-sans font-bold whitespace-nowrap select-none focus-ring transition-transform duration-100 ease-out active:not-disabled:scale-[0.98] disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5 [-webkit-tap-highlight-color:transparent]",
  {
    variants: {
      variant: {
        default: "bg-ube text-white disabled:bg-ube-mist disabled:text-ube-soft",
        secondary:
          "border-[1.5px] border-ube bg-niyog text-ube disabled:border-ube-mist disabled:bg-ube-mist disabled:text-ube-soft",
        ghost: "text-ube underline-offset-4 hover:underline disabled:text-ube-soft",
        link: "min-h-11 text-ube underline decoration-[1.5px] underline-offset-4 disabled:text-ube-soft",
      },
      size: {
        default: "h-[58px] px-7 text-button",
        md: "h-[52px] px-6 text-body",
        sm: "h-12 px-5 text-body",
        xs: "h-11 px-3 text-small",
        icon: "size-11",
        inline: "h-auto px-0 text-body",
      },
    },
    compoundVariants: [
      // Secondary buttons are 48–52px; a secondary at the default size is 52.
      { variant: "secondary", size: "default", className: "h-[52px] text-body" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
