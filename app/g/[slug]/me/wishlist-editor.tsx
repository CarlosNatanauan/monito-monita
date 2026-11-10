"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { WishItemContent, type WishItemData } from "@/components/wish-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WISH_NOTE_MAX, WISH_TITLE_MAX, WISHLIST_MAX_ITEMS } from "@/lib/wish";
import { addWishAction, deleteWishAction, updateWishAction, type WishActionResult } from "./actions";

interface Draft {
  title: string;
  url: string;
  note: string;
}

const EMPTY: Draft = { title: "", url: "", note: "" };

export function WishlistEditor({ slug, items }: { slug: string; items: WishItemData[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 && !adding && (
        <p className="text-muted-foreground">
          Wala pang wishlist. Add something para hindi mahirapan ang monito mo.
        </p>
      )}

      {items.length > 0 && (
        <ul className="flex flex-col divide-y divide-border" aria-label="Wishlist mo">
          {items.map((item) =>
            editingId === item.id ? (
              <li key={item.id} className="py-3">
                <WishForm
                  slug={slug}
                  initial={{ title: item.title, url: item.url ?? "", note: item.note ?? "" }}
                  submitLabel="Save"
                  onSubmit={(draft) => updateWishAction({ slug, itemId: item.id, ...draft })}
                  onDone={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li key={item.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <WishItemContent item={item} />
                <ItemButtons
                  slug={slug}
                  item={item}
                  onEdit={() => {
                    setAdding(false);
                    setEditingId(item.id);
                  }}
                />
              </li>
            ),
          )}
        </ul>
      )}

      {adding ? (
        <WishForm
          slug={slug}
          initial={EMPTY}
          submitLabel="Add to wishlist"
          onSubmit={(draft) => addWishAction({ slug, ...draft })}
          onDone={() => setAdding(false)}
        />
      ) : items.length < WISHLIST_MAX_ITEMS ? (
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={() => {
            setEditingId(null);
            setAdding(true);
          }}
        >
          <Plus /> Add an item
        </Button>
      ) : (
        <p className="text-caption text-muted-foreground">Hanggang {WISHLIST_MAX_ITEMS} items lang ang wishlist.</p>
      )}
    </div>
  );
}

function ItemButtons({ slug, item, onEdit }: { slug: string; item: WishItemData; onEdit: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={onEdit} aria-label={`Edit ${item.title}`}>
          Edit
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          aria-label={`Delete ${item.title}`}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteWishAction({ slug, itemId: item.id });
              if (!result.ok) setError(result.message);
            })
          }
        >
          Delete
        </Button>
      </div>
      {error && <p className="text-caption text-destructive">{error}</p>}
    </div>
  );
}

function WishForm({
  initial,
  submitLabel,
  onSubmit,
  onDone,
}: {
  slug: string;
  initial: Draft;
  submitLabel: string;
  onSubmit: (draft: Draft) => Promise<WishActionResult>;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (field: keyof Draft) => (value: string) => {
    setDraft((d) => ({ ...d, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await onSubmit(draft);
      if (result.ok) return onDone();
      setErrors(result.fieldErrors ?? {});
      if (!result.fieldErrors) setMessage(result.message);
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl bg-muted p-3" noValidate>
      {message && (
        <p role="alert" className="text-caption font-semibold text-destructive">
          {message}
        </p>
      )}
      <TextField label="Ano ang gusto mo?" error={errors.title}>
        <Input
          value={draft.title}
          onChange={(e) => set("title")(e.target.value)}
          placeholder="Mug na cute"
          maxLength={WISH_TITLE_MAX}
          required
        />
      </TextField>
      <TextField label="Link (optional)" error={errors.url}>
        <Input
          value={draft.url}
          onChange={(e) => set("url")(e.target.value)}
          placeholder="https://shopee.ph/…"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
        />
      </TextField>
      <TextField label="Note (optional)" error={errors.note}>
        <Input
          value={draft.note}
          onChange={(e) => set("note")(e.target.value)}
          placeholder="Kahit anong kulay"
          maxLength={WISH_NOTE_MAX}
        />
      </TextField>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Sine-save…" : submitLabel}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function TextField({ label, error, children }: { label: string; error?: string; children: React.ReactElement }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-caption font-semibold">{label}</span>
      {children}
      {error && <span className="text-caption font-semibold text-destructive">{error}</span>}
    </label>
  );
}
