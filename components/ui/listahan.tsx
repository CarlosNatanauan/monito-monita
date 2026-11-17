import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Listahan (notebook paper). Rows are 40px (`lst-row`) or 80px
 * (`lst-row2`) so text sits on the rules. Pass `title` for the Chelsea
 * Market title row.
 */
export function Listahan({
  title,
  titleId,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"section">, "title"> & { title?: React.ReactNode; titleId?: string }) {
  return (
    <section className={cn("listahan min-w-0", className)} aria-labelledby={title && titleId ? titleId : undefined} {...props}>
      {title && (
        <h2 id={titleId} data-slot="card-title" className="lst-title lg:text-section-lg">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

/** Empty state on a listahan: one or two lines of soft text, written on the rules. */
export function LstEmpty({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line) => (
        <p key={line} className="lst-row text-ube-soft">
          {line}
        </p>
      ))}
    </>
  );
}
