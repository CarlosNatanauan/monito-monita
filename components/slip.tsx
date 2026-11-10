import { cn } from "@/lib/utils";

/**
 * A static paper slip with a handwritten name (Gochi Hand).
 * Only use for names and codenames (docs/DESIGN.md).
 */
export function Slip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "-rotate-2 rounded-sm bg-slip px-8 py-6 text-center shadow-[0_1px_2px_rgb(31_27_77/0.08),0_8px_24px_rgb(31_27_77/0.10)]",
        className,
      )}
    >
      <p className="font-hand text-heading text-simbang-gabi">{children}</p>
    </div>
  );
}
