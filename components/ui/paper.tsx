import * as React from "react";
import { Art } from "@/components/art/symbols";
import { cn } from "@/lib/utils";

// Listahan and LstEmpty live on their own (no illustrations), so client
// code like /me's wishlist doesn't pull this whole module into its JS.
export { Listahan, LstEmpty } from "./listahan";

/*
 * Different jobs, different materials (docs/DESIGN.md, "Components"):
 * a list is a listahan, a fact is a tag, a status is a capiz card, the
 * weekly theme is a papel de japon sheet. Never one box for everything.
 */

/** A "Paano 'to?" row: a small star in the margin instead of a number. */
export function LstStarRow({ children }: { children: React.ReactNode }) {
  return (
    <li className="lst-row relative justify-start">
      <Art name="star" className="absolute top-[11px] -left-9 size-[18px]" />
      <span className="min-w-0">{children}</span>
    </li>
  );
}

/** Capiz card: status and sharing. At most one per column. */
export function Capiz({ className, children, ...props }: React.ComponentProps<"section">) {
  return (
    <section className={cn("capiz min-w-0", className)} {...props}>
      <div className="flex flex-col gap-2.5 px-4 pt-3.5 pb-4 lg:gap-3 lg:px-5 lg:pt-4 lg:pb-5">{children}</div>
    </section>
  );
}

/** Section title (Chelsea Market 20 / 22). */
export function SectionTitle({ as: As = "h2", className, ...props }: React.ComponentProps<"h2"> & { as?: "h2" | "h3" | "p" }) {
  return <As data-slot="card-title" className={cn("font-head text-section lg:text-section-lg", className)} {...props} />;
}

/** "Names drawn" with the star: dahon, Chelsea Market 28 / 34. */
export function DoneTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 data-slot="card-title" className="flex items-center gap-2.5 font-head text-[28px] leading-[1.1] text-dahon lg:text-[34px]">
      <Art name="star" className="size-7 shrink-0" />
      {children}
    </h2>
  );
}

export type TagTone = "gold" | "pink" | "green";

const TAG_TONE: Record<TagTone, string> = {
  gold: "bg-ilaw-lit -rotate-2",
  pink: "bg-tag-pink rotate-2",
  green: "bg-tag-green -rotate-1",
};

/** A row of gift tags. */
export function Tags({ className, children }: { className?: string; children: React.ReactNode }) {
  return <dl className={cn("flex flex-wrap gap-x-3 gap-y-2.5", className)}>{children}</dl>;
}

/** One fact on a gift tag: label in Atkinson 700 14, value in Chelsea Market 19. Not clickable. */
export function Tag({ tone, label, children }: { tone: TagTone; label: string; children: React.ReactNode }) {
  return (
    <div className={cn("gift-tag", TAG_TONE[tone])}>
      <dt className="text-tag font-bold">{label}</dt>
      <dd className="font-head text-[19px] leading-[1.15]">{children}</dd>
    </div>
  );
}

/** The weekly theme: a dahon papel de japon sheet with a cut fringe. One per screen, /me only. */
export function ThemeSheet({
  label,
  title,
  detail,
  ...props
}: { label: string; title: string; detail: string } & Omit<React.ComponentProps<"section">, "title">) {
  return (
    <section {...props}>
      <div className="bg-dahon px-4 pt-3.5 pb-3 text-white">
        <p className="text-small font-bold">{label}</p>
        <p className="mt-1 mb-1.5 font-head text-[30px] leading-[1.1] break-words text-ilaw-lit">{title}</p>
        <p className="text-small">{detail}</p>
      </div>
      <div aria-hidden className="fringe" />
    </section>
  );
}

/** GC bubble: exactly what will be pasted. */
export function Bubble({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "rounded-[4px_16px_16px_16px] border-[1.5px] border-ube bg-papel px-3 py-2.5 text-small break-words whitespace-pre-wrap [overflow-wrap:anywhere]",
        className,
      )}
      translate="no"
      {...props}
    />
  );
}

/** The private-link card: pink paper, no border. */
export function SecretCard({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-2.5 bg-tag-pink p-4 lg:px-6 lg:py-5", className)} {...props} />
  );
}
