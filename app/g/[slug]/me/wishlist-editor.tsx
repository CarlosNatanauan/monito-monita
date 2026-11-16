"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { WishRows, type WishItemData } from "@/components/wish-item";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { Input } from "@/components/ui/input";
import { Listahan, LstEmpty } from "@/components/ui/paper";
import { WISH_NOTE_MAX, WISH_TITLE_MAX, WISHLIST_MAX_ITEMS } from "@/lib/wish";
import { addWishAction, deleteWishAction, updateWishAction, type WishActionResult } from "./actions";

interface Draft {
  title: string;
  url: string;
  note: string;
}

const EMPTY: Draft = { title: "", url: "", note: "" };

/**
 * "Wishlist mo" on a listahan (docs/design/08–10): each wish on a line
 * with Edit and Alisin, the one being edited as an input with Save, and
 * the add row at the bottom ("Hal. mug na cute" + Add).
 */
export function WishlistEditor({
  slug,
  items,
  placeholder,
}: {
  slug: string;
  items: WishItemData[];
  /** The add row's example, with the budget ("Hal. mug na cute · hanggang ₱500"). */
  placeholder: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  // Remounts the add form (clearing it) after each successful add.
  const [addKey, setAddKey] = useState(0);

  return (
    <Listahan title="Wishlist mo" titleId="my-wishlist-title">
      {items.length === 0 && (
        <LstEmpty lines={["Wala pang laman ang wishlist mo.", "Add something para sa monito mo."]} />
      )}

      {items.length > 0 && (
        <ul aria-label="Wishlist mo">
          {items.map((item) =>
            editingId === item.id ? (
              <li key={item.id}>
                <WishForm
                  initial={{ title: item.title, url: item.url ?? "", note: item.note ?? "" }}
                  mode="edit"
                  onSubmit={(draft) => updateWishAction({ slug, itemId: item.id, ...draft })}
                  onDone={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li key={item.id}>
                <ItemRows slug={slug} item={item} onEdit={() => setEditingId(item.id)} />
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
          placeholder={placeholder}
          onSubmit={(draft) => addWishAction({ slug, ...draft })}
          onDone={() => setAddKey((k) => k + 1)}
        />
      ) : (
        <p className="lst-row text-small text-ube-soft">Hanggang {WISHLIST_MAX_ITEMS} items lang ang wishlist.</p>
      )}
    </Listahan>
  );
}

function ItemRows({ slug, item, onEdit }: { slug: string; item: WishItemData; onEdit: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <WishRows
        item={item}
        actions={
          <span className="-mr-1.5 flex">
            <Button type="button" variant="link" onClick={onEdit} aria-label={`Edit ${item.title}`}>
              Edit
            </Button>
            <Button
              type="button"
              variant="link"
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
          </span>
        }
      />
      {error && <ErrorMessage className="my-2">{error}</ErrorMessage>}
    </>
  );
}

/**
 * Adding: one two-line row ("Hal. mug na cute" + Add), with link and note
 * behind "Lagyan ng link o note". Editing: the title with Save, then the
 * link and note, and Cancel.
 */
function WishForm({
  initial,
  mode,
  onSubmit,
  onDone,
  placeholder,
}: {
  initial: Draft;
  mode: "add" | "edit";
  onSubmit: (draft: Draft) => Promise<WishActionResult>;
  onDone: () => void;
  placeholder?: string;
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

  // On a slow phone people type before /me hydrates. The field shows that
  // text but state doesn't have it, so the next render (or Add) would wipe
  // it or say it's missing. Take it into state once, right after hydrating.
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const typed = titleRef.current?.value ?? "";
    if (typed !== initial.title) setDraft((d) => ({ ...d, title: typed }));
    // Only the first render can differ from what was typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <form onSubmit={submit} noValidate>
      {message && <ErrorMessage className="my-2">{message}</ErrorMessage>}
      <div className="lst-row2">
        <Input
          ref={titleRef}
          size="row"
          value={draft.title}
          onChange={(e) => set("title")(e.target.value)}
          placeholder={placeholder ?? "Hal. mug na cute"}
          aria-label="Ano ang gusto mo?"
          aria-invalid={errors.title ? true : undefined}
          maxLength={WISH_TITLE_MAX}
          autoFocus={mode === "edit"}
          required
          className="flex-1"
        />
        <Button type="submit" variant="secondary" disabled={pending}>
          {mode === "add" ? (pending ? "…" : "Add") : pending ? "Sine-save…" : "Save"}
        </Button>
      </div>
      {errors.title && <ErrorMessage className="my-2">{errors.title}</ErrorMessage>}

      {extras ? (
        <>
          <TextRow label="Link (optional)" error={errors.url}>
            <Input
              size="row"
              value={draft.url}
              onChange={(e) => set("url")(e.target.value)}
              placeholder="https://shopee.ph/…"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              aria-invalid={errors.url ? true : undefined}
            />
          </TextRow>
          <TextRow label="Note (optional)" error={errors.note}>
            <Input
              size="row"
              value={draft.note}
              onChange={(e) => set("note")(e.target.value)}
              placeholder="Kahit anong kulay"
              maxLength={WISH_NOTE_MAX}
              aria-invalid={errors.note ? true : undefined}
            />
          </TextRow>
          {mode === "edit" && (
            <div className="lst-row justify-start">
              <Button type="button" variant="link" className="-ml-1.5" disabled={pending} onClick={onDone}>
                Cancel
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="lst-row justify-start">
          <Button type="button" variant="link" className="-ml-1.5" onClick={() => setExtras(true)}>
            Lagyan ng link o note
          </Button>
        </div>
      )}
    </form>
  );
}

/** A labelled field on the listahan: the label on one rule, the input on the next two. */
function TextRow({ label, error, children }: { label: string; error?: string; children: React.ReactElement }) {
  return (
    <label className="block">
      <span className="lst-label block">{label}</span>
      <span className="flex h-10 items-center">{children}</span>
      {error && <ErrorMessage className="my-2">{error}</ErrorMessage>}
    </label>
  );
}
