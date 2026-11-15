import { cn } from "@/lib/utils";

/**
 * Paper folder tabs on a 1.5px ube line (organizer only). The active tab
 * is white with a border on three sides. Links, or buttons via `onSelect`.
 * Links are plain anchors: switching between a member's slip and the
 * organizer page is a full page load anyway, and it keeps next/link out of
 * every page that uses paper (member pages must stay under 150 KB of JS).
 */
export function FolderTabs<T extends string>({
  label,
  items,
  value,
  onSelect,
  className,
}: {
  label: string;
  items: { value: T; label: string; href?: string }[];
  value: T;
  onSelect?: (value: T) => void;
  className?: string;
}) {
  const tab = (active: boolean) =>
    cn(
      "-mb-[1.5px] flex min-h-11 items-center rounded-[8px_10px_0_0] px-3.5 pt-[13px] pb-[11px] font-head text-[17px] leading-none whitespace-nowrap focus-ring [-webkit-tap-highlight-color:transparent]",
      active ? "border-[1.5px] border-b-0 border-ube bg-papel" : "border-[1.5px] border-transparent",
    );
  const list = items.map((item) =>
    item.href ? (
      <a key={item.value} href={item.href} aria-current={item.value === value ? "page" : undefined} className={tab(item.value === value)}>
        {item.label}
      </a>
    ) : (
      <button
        key={item.value}
        type="button"
        aria-pressed={item.value === value}
        onClick={() => onSelect?.(item.value)}
        className={cn(tab(item.value === value), "cursor-pointer")}
      >
        {item.label}
      </button>
    ),
  );
  const Wrap = items.some((i) => i.href) ? "nav" : "div";
  return (
    <Wrap
      aria-label={label}
      role={Wrap === "div" ? "group" : undefined}
      className={cn("flex gap-1.5 border-b-[1.5px] border-ube", className)}
    >
      {list}
    </Wrap>
  );
}
