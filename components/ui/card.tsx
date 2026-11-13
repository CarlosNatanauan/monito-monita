import * as React from "react"
import { cn } from "@/lib/utils"

// Restyled for Monito Monita (docs/DESIGN.md, "Cards"): flat white, radius
// 24, padding 20, no border, no shadow. The page texture shows around it.
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("flex flex-col gap-4 rounded-3xl bg-niyog p-5 text-body text-ube", className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-header" className={cn("flex flex-col gap-1", className)} {...props} />
}

/** Manrope 20/800. */
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-title" className={cn("text-title font-extrabold text-ube", className)} {...props} />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="card-description" className={cn("text-body text-ube-soft", className)} {...props} />
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("flex flex-col gap-4", className)} {...props} />
}

/** Detail rows (party, budget): label, a dotted leader, the value in bold. */
function DetailRows({ className, ...props }: React.ComponentProps<"dl">) {
  return <dl className={cn("flex flex-col gap-4", className)} {...props} />
}

function DetailRow({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="shrink-0 text-ube-soft">{label}</dt>
      <span aria-hidden className="min-w-4 flex-1 border-b-2 border-dotted border-ube-line/60" />
      <dd className="min-w-0 text-right font-bold text-ube">{children}</dd>
    </div>
  )
}

/**
 * Empty state inside a card: a dashed ube-line box with one sentence that
 * says what to do next.
 */
function EmptyState({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("rounded-2xl border-[1.5px] border-dashed border-ube-line p-4 text-ube-soft", className)}
      {...props}
    />
  )
}

/** An inset field on a card: a link, a reminder preview, an exclusion pair. */
function Inset({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-2xl bg-leaf-wash px-5 py-4", className)} {...props} />
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, DetailRows, DetailRow, EmptyState, Inset }
