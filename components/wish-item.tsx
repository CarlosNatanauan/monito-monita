import { LstEmpty } from "@/components/ui/listahan";
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
      // A notebook text link: a 44px tap target over its 40px row (lst-row's rule for text buttons).
      data-variant="link"
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="inline-flex min-h-11 shrink-0 items-center self-start rounded-paper text-small font-bold underline decoration-[1.5px] underline-offset-[3px] focus-ring"
    >
      {displayDomain(url)}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/**
 * One wish on the listahan: the title, then the note and the link's
 * domain on the next row if there are any. Nothing is cut off: long titles
 * and notes wrap onto as many 40px rows as they need (lst-wrap).
 */
export function WishRows({ item, actions }: { item: WishItemData; actions?: React.ReactNode }) {
  return (
    <>
      <div className="lst-row">
        <p className="lst-wrap">{item.title}</p>
        {actions && <span className="flex h-10 shrink-0 items-center gap-2 self-start">{actions}</span>}
      </div>
      {(item.note || item.url) && (
        <div className={item.note ? "lst-row" : "lst-row justify-start"}>
          {item.note && <p className="lst-wrap text-small text-ube-soft">{item.note}</p>}
          {item.url && <WishLink url={item.url} />}
        </div>
      )}
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
