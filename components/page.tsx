/** The page column: one column, max 480px, 20px side gutters. */
export const pageClass = "mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-4 px-5 pb-14";

/** Small line above a page title (the group name, "Organizer"). */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-medium text-ube-soft">{children}</p>;
}
