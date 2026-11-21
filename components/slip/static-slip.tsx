import { SlipView } from "./slip-view";

/*
 * Slips rendered on the server, with exactly the markup BunutanSlip
 * renders (both use SlipView) but none of its code (docs/DESIGN.md,
 * "Performance on budget phones"). /me loads the interactive slip only for
 * a slip that is still folded.
 */

/** Already open: the codename before the draw, a slip opened on an earlier visit, the giver after the reveal. */
export function OpenSlip({
  name,
  heading = "Ang monito mo ay…",
  label = "Your monito",
  rays = true,
}: {
  name: string;
  heading?: string;
  label?: string;
  rays?: boolean;
}) {
  return <SlipView name={name} label={label} heading={heading} rays={rays} initiallyOpened phase="opened" open />;
}

/**
 * Still folded, while the interactive slip's code loads: what BunutanSlip
 * renders first, so the page looks the same until it takes over.
 */
export function FoldedSlip({ name }: { name: string }) {
  return <SlipView name={name} label="Your monito" heading="Ang monito mo ay…" rays initiallyOpened={false} phase="folded" open={false} />;
}
