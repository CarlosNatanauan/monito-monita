import { ExternalLink } from "lucide-react";
import { EmptyState } from "@/components/ui/card";
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
    <div className="flex min-w-0 flex-col gap-0.5">
      <p className="break-words">{item.title}</p>
      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex min-h-8 w-fit items-center gap-1 rounded-sm text-small font-bold underline underline-offset-4 focus-ring"
        >
          {displayDomain(item.url)}
          <ExternalLink className="size-3.5" aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      )}
      {item.note && <p className="text-small font-medium break-words text-ube-soft">{item.note}</p>}
    </div>
  );
}

/** Read-only list (the receiver's wishlist, seen by their giver). */
export function WishlistView({ items, emptyText }: { items: WishItemData[]; emptyText: string }) {
  if (items.length === 0) return <EmptyState>{emptyText}</EmptyState>;
  return (
    <ul className="flex flex-col rows-dashed" aria-label="Wishlist ng monito mo">
      {items.map((item) => (
        <li key={item.id} className="py-3.5 first:pt-0 last:pb-0">
          <WishItemContent item={item} />
        </li>
      ))}
    </ul>
  );
}
