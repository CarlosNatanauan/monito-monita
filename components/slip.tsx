import { cn } from "@/lib/utils";

/**
 * A static paper slip with a handwritten name (docs/DESIGN.md, "The slip"):
 * white paper, radius 6, two faint crease lines centred both ways, a slight
 * tilt, the name in Gochi Hand between tildes. Names and codenames only.
 */
export function Slip({
  children,
  className,
  creases = true,
}: {
  children: React.ReactNode;
  className?: string;
  /** Small slips (bowl, reveal) have no creases. */
  creases?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative max-w-full -rotate-3 rounded-md bg-niyog px-8 py-6 text-center shadow-[0_2px_4px_rgb(75_36_114/0.1),0_10px_24px_rgb(75_36_114/0.14)]",
        creases &&
          "bg-[linear-gradient(to_right,transparent_calc(50%-0.5px),rgb(75_36_114/0.12)_calc(50%-0.5px),rgb(75_36_114/0.12)_calc(50%+0.5px),transparent_calc(50%+0.5px)),linear-gradient(to_bottom,transparent_calc(50%-0.5px),rgb(75_36_114/0.12)_calc(50%-0.5px),rgb(75_36_114/0.12)_calc(50%+0.5px),transparent_calc(50%+0.5px))]",
        className,
      )}
    >
      {/* A long codename wraps (balanced) on a small phone instead of running into the gutter. */}
      <p className="font-hand text-hand-lg text-balance text-ube">~ {children} ~</p>
    </div>
  );
}
