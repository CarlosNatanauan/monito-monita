import { LstEmpty } from "@/components/ui/paper";
import { displayDomain } from "@/lib/wish";

export interface WishItemData {
  id: string;
  title: string;
  url: string | null;
  note: string | null;
}

/** The link of a wish, shown as just the domain. */
export function WishLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="inline-flex min-h-10 shrink-0 items-center rounded-paper text-small font-bold underline decoration-[1.5px] underline-offset-[3px] focus-ring"
    >
      {displayDomain(url)}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/**
 * One wish on the listahan: the title on its line (the link's domain at
 * the end), the note on the next line if there is one.
 */
export function WishRows({ item, actions }: { item: WishItemData; actions?: React.ReactNode }) {
  return (
    <>
      <div className="lst-row">
        <p className="min-w-0 truncate">{item.title}</p>
        <span className="flex shrink-0 items-center gap-2">
          {item.url && <WishLink url={item.url} />}
          {actions}
        </span>
      </div>
      {item.note && <p className="lst-row truncate text-small text-ube-soft">{item.note}</p>}
    </>
  );
}

/** Read-only list (the receiver's wishlist, seen by their giver), on the listahan rows. */
export function WishlistView({ items, empty }: { items: WishItemData[]; empty: string[] }) {
  if (items.length === 0) return <LstEmpty lines={empty} />;
  return (
    <ul aria-label="Wishlist ng monito mo">
      {items.map((item) => (
        <li key={item.id}>
          <WishRows item={item} />
        </li>
      ))}
    </ul>
  );
}
