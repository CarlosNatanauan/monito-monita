import { ExternalLink } from "lucide-react";
import { displayDomain } from "@/lib/wish";

export interface WishItemData {
  id: string;
  title: string;
  url: string | null;
  note: string | null;
}

/** One wishlist item: title, link shown as just the domain, optional note. */
export function WishItemContent({ item }: { item: WishItemData }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="font-semibold break-words">{item.title}</p>
      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex w-fit items-center gap-1 text-caption font-semibold underline decoration-simbang-gabi/30 underline-offset-4"
        >
          {displayDomain(item.url)}
          <ExternalLink className="size-3.5" aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      )}
      {item.note && <p className="text-caption break-words text-muted-foreground">{item.note}</p>}
    </div>
  );
}

/** Read-only list (the receiver's wishlist, seen by their giver). */
export function WishlistView({ items, emptyText }: { items: WishItemData[]; emptyText: string }) {
  if (items.length === 0) return <p className="text-muted-foreground">{emptyText}</p>;
  return (
    <ul className="flex flex-col divide-y divide-border" aria-label="Wishlist ng monito mo">
      {items.map((item) => (
        <li key={item.id} className="py-3 first:pt-0 last:pb-0">
          <WishItemContent item={item} />
        </li>
      ))}
    </ul>
  );
}
