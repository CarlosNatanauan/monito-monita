import { cn } from "@/lib/utils";

/**
 * The name written on a listahan line (docs/DESIGN.md, "Listahan"): a
 * dahon 14/700 label on the rule above, then the typed name in Gochi Hand
 * 30 sitting on the next rule. No box: it's handwriting on the paper. The
 * gold focus outline and a sili underline for errors still show.
 */
export function NameLine({
  id,
  label = "Pangalan mo",
  invalid,
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "id"> & { id: string; label?: string; invalid?: boolean }) {
  return (
    <>
      <label htmlFor={id} className="lst-label block">
        {label}
      </label>
      <input
        id={id}
        type="text"
        aria-invalid={invalid ? true : undefined}
        className={cn(
          "block h-10 w-full min-w-0 rounded-paper bg-transparent px-0 font-hand text-[30px] leading-[38px] text-ube outline-none placeholder:font-sans placeholder:text-body placeholder:text-ube-soft",
          "focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-ilaw",
          "aria-invalid:shadow-[inset_0_-2.5px_0_var(--color-sili)]",
          className,
        )}
        {...props}
      />
    </>
  );
}
