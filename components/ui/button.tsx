import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

// Restyled for Monito Monita (docs/DESIGN.md):
// - Red (default) is for the one main action on a screen.
// - 48px tall by default for thumbs on phones.
// - Only transform animates (press feedback); colors change instantly.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-transparent font-sans font-bold whitespace-nowrap outline-none select-none transition-transform duration-100 ease-out focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:not-aria-[haspopup]:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_2px_0_0_var(--color-parol-red-dark)] hover:bg-parol-red-dark",
        outline:
          "border-simbang-gabi/20 bg-slip text-foreground hover:border-simbang-gabi/40 aria-expanded:bg-muted",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-simbang-gabi/15 aria-expanded:bg-secondary",
        ghost: "text-foreground hover:bg-simbang-gabi/8 aria-expanded:bg-muted",
        destructive:
          "border-destructive/30 bg-slip text-destructive hover:bg-destructive/8",
        link: "text-foreground underline underline-offset-4 decoration-simbang-gabi/40 hover:decoration-simbang-gabi",
      },
      size: {
        default: "h-12 px-5 text-body",
        sm: "h-10 rounded-lg px-4 text-caption",
        lg: "h-14 px-6 text-title",
        icon: "size-12",
        "icon-sm": "size-10 rounded-lg",
      },
    },
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
