import { SegmentedNav } from "@/components/segmented";

/**
 * For someone who is both organizer and member of a group (both cookies on
 * this device): switch between their slip and managing the group.
 */
export function RoleSwitch({ slug, current }: { slug: string; current: "member" | "organizer" }) {
  return (
    <SegmentedNav
      label="Switch view"
      items={[
        { href: `/g/${slug}/me`, label: "My slip", current: current === "member" },
        { href: `/g/${slug}/admin`, label: "Manage group", current: current === "organizer" },
      ]}
    />
  );
}
