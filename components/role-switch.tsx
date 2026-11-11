import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * For someone who is both organizer and member of a group (both cookies on
 * this device): a small switch between their slip and managing the group.
 */
export function RoleSwitch({ slug, current }: { slug: string; current: "member" | "organizer" }) {
  const item = (active: boolean) =>
    cn(
      "rounded-full px-4 py-2 outline-none focus-visible:ring-3 focus-visible:ring-ring",
      active ? "bg-slip text-foreground shadow-[0_1px_2px_rgb(31_27_77/0.10)]" : "text-muted-foreground",
    );
  return (
    <nav aria-label="Switch view" className="flex self-start rounded-full bg-muted p-1 text-caption font-semibold">
      <Link
        href={`/g/${slug}/me`}
        aria-current={current === "member" ? "page" : undefined}
        className={item(current === "member")}
      >
        My slip
      </Link>
      <Link
        href={`/g/${slug}/admin`}
        aria-current={current === "organizer" ? "page" : undefined}
        className={item(current === "organizer")}
      >
        Manage group
      </Link>
    </nav>
  );
}
