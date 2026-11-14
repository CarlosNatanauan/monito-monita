import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * docs/DESIGN.md, "Segmented control": a white pill track with 4px padding.
 * The active segment is ube with white text; the others are ube-soft.
 */
const track = "flex w-full rounded-full bg-niyog p-1";
const segment = (active: boolean) =>
  cn(
    "flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-full px-2 text-center text-body font-bold whitespace-nowrap focus-ring [-webkit-tap-highlight-color:transparent]",
    active ? "bg-ube text-white" : "text-ube-soft",
  );

/** Segments that are links (My slip / Manage group). */
export function SegmentedNav({
  label,
  items,
}: {
  label: string;
  items: { href: string; label: string; current: boolean }[];
}) {
  return (
    <nav aria-label={label} className={cn(track, "md:max-w-[420px]")}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.current ? "page" : undefined}
          className={segment(item.current)}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/** Segments that are toggle buttons. */
export function SegmentedButtons<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn(track, className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={segment(value === option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
