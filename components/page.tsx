/**
 * The page column. Phones (under 768px): one column, max 480px, 20px side
 * gutters. Tablets and laptops (`md`, 768px and up) get the wide frame:
 * content up to 1120px, centred, 32px gutters; each page lays out its own
 * columns inside it (docs/DESIGN.md, "Layout").
 */
export const pageClass = "mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-4 px-5 pb-14";

/** The wide frame: phones as `pageClass`, then up to 1120px of content from `md`. */
export const widePageClass =
  "mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-4 px-5 pb-14 md:max-w-[calc(1120px+4rem)] md:px-8 md:pb-16";

/**
 * Sticky only where the screen is tall enough to show the whole element
 * (not on a phone turned sideways), from `md`.
 */
export const stickyClass = "md:[@media(min-height:640px)]:sticky md:[@media(min-height:640px)]:top-6";

/** Small line above a page title (the group name, "Organizer"). */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-medium text-ube-soft">{children}</p>;
}

/** From md: a centred 560px column, for short one-card states inside the wide frame. */
export function Narrow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-4 md:mx-auto md:w-full md:max-w-[560px]">{children}</div>;
}
