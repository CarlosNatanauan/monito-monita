import { FolderTabs } from "@/components/ui/folder-tabs";
import { cn } from "@/lib/utils";

/**
 * For someone who is both organizer and member of a group (both cookies on
 * this device): paper folder tabs to switch between their slip and
 * managing the group.
 */
export function RoleSwitch({ slug, current, className }: { slug: string; current: "member" | "organizer"; className?: string }) {
  return (
    <FolderTabs
      label="Switch view"
      value={current}
      className={cn("border-b-0", className)}
      items={[
        { value: "member", href: `/g/${slug}/me`, label: "My slip" },
        { value: "organizer", href: `/g/${slug}/admin`, label: "Manage group" },
      ]}
    />
  );
}
