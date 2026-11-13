"use client";

import { useState, useTransition } from "react";
import { WishItemContent, type WishItemData } from "@/components/wish-item";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { ErrorMessage } from "@/components/ui/error-message";
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
  // Remounts the add form (clearing it) after each successful add.
  const [addKey, setAddKey] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 && (
        <EmptyState>Wala pang wishlist. Add something para hindi mahirapan ang monito mo.</EmptyState>
      )}

      {items.length > 0 && (
        <ul className="flex flex-col rows-dashed" aria-label="Wishlist mo">
          {items.map((item) =>
            editingId === item.id ? (
              <li key={item.id} className="py-3.5 first:pt-0">
                <WishForm
                  initial={{ title: item.title, url: item.url ?? "", note: item.note ?? "" }}
                  mode="edit"
                  onSubmit={(draft) => updateWishAction({ slug, itemId: item.id, ...draft })}
                  onDone={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li key={item.id} className="flex items-start justify-between gap-3 py-3.5 first:pt-0">
                <WishItemContent item={item} />
                <ItemButtons slug={slug} item={item} onEdit={() => setEditingId(item.id)} />
              </li>
            ),
          )}
        </ul>
      )}

      {items.length < WISHLIST_MAX_ITEMS ? (
        <WishForm
          key={addKey}
          initial={EMPTY}
          mode="add"
          onSubmit={(draft) => addWishAction({ slug, ...draft })}
          onDone={() => setAddKey((k) => k + 1)}
        />
      ) : (
        <p className="text-small font-medium text-ube-soft">Hanggang {WISHLIST_MAX_ITEMS} items lang ang wishlist.</p>
      )}
    </div>
  );
}

function ItemButtons({ slug, item, onEdit }: { slug: string; item: WishItemData; onEdit: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="-my-2.5 flex shrink-0 flex-col items-end gap-1">
      <div className="flex">
        <Button type="button" variant="ghost" size="xs" onClick={onEdit} aria-label={`Edit ${item.title}`}>
          Edit
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={pending}
          aria-label={`Delete ${item.title}`}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteWishAction({ slug, itemId: item.id });
              if (!result.ok) setError(result.message);
            })
          }
        >
          Alisin
        </Button>
      </div>
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </div>
  );
}

/**
 * Adding: one line ("Hal. mug na cute" + Add), with link and note behind
 * "Lagyan ng link o note". Editing: all three fields, Save and Cancel.
 */
function WishForm({
  initial,
  mode,
  onSubmit,
  onDone,
}: {
  initial: Draft;
  mode: "add" | "edit";
  onSubmit: (draft: Draft) => Promise<WishActionResult>;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [extras, setExtras] = useState(mode === "edit");
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

  const title = (
    <Input
      size="card"
      value={draft.title}
      onChange={(e) => set("title")(e.target.value)}
      placeholder="Hal. mug na cute"
      aria-label="Ano ang gusto mo?"
      aria-invalid={errors.title ? true : undefined}
      maxLength={WISH_TITLE_MAX}
      required
    />
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      {message && <ErrorMessage>{message}</ErrorMessage>}
      {mode === "add" ? (
        <div className="flex gap-3">
          {title}
          <Button type="submit" size="sm" className="h-[52px] px-6" disabled={pending}>
            {pending ? "…" : "Add"}
          </Button>
        </div>
      ) : (
        title
      )}
      {errors.title && <ErrorMessage>{errors.title}</ErrorMessage>}

      {extras ? (
        <>
          <TextField label="Link (optional)" error={errors.url}>
            <Input
              size="card"
              value={draft.url}
              onChange={(e) => set("url")(e.target.value)}
              placeholder="https://shopee.ph/…"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              aria-invalid={errors.url ? true : undefined}
            />
          </TextField>
          <TextField label="Note (optional)" error={errors.note}>
            <Input
              size="card"
              value={draft.note}
              onChange={(e) => set("note")(e.target.value)}
              placeholder="Kahit anong kulay"
              maxLength={WISH_NOTE_MAX}
              aria-invalid={errors.note ? true : undefined}
            />
          </TextField>
        </>
      ) : (
        <Button type="button" variant="link" size="inline" className="self-start" onClick={() => setExtras(true)}>
          Lagyan ng link o note
        </Button>
      )}

      {mode === "edit" && (
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Sine-save…" : "Save"}
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={onDone}>
            Cancel
          </Button>
        </div>
      )}
    </form>
  );
}

function TextField({ label, error, children }: { label: string; error?: string; children: React.ReactElement }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="px-1.5 font-bold">{label}</span>
      {children}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </label>
  );
}
