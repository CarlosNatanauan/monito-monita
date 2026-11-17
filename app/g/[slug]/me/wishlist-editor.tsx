"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { WishRows, type WishItemData } from "@/components/wish-item";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { Input } from "@/components/ui/input";
import { Listahan, LstEmpty } from "@/components/ui/listahan";
import { usePendingLabel } from "@/lib/use-pending-label";
import { WISH_NOTE_MAX, WISH_TITLE_MAX, WISHLIST_MAX_ITEMS } from "@/lib/wish";
import { addWishAction, deleteWishAction, updateWishAction } from "./actions";

interface Draft {
  title: string;
  url: string;
  note: string;
}

type Errors = Record<string, string>;
type Wish = WishItemData & { saving?: boolean };
type Change = { add: Wish } | { edit: Wish } | { remove: string };

const EMPTY: Draft = { title: "", url: "", note: "" };
const ADD_FIELD = "wish-new";
const toItem = (id: string, d: Draft): Wish => ({ id, title: d.title.trim(), url: d.url.trim() || null, note: d.note.trim() || null, saving: true });

/**
 * "Wishlist mo" on a listahan (docs/design/08–10): each wish on a line
 * with Edit and Alisin, the one being edited as an input with Save, and
 * the add row at the bottom ("Hal. mug na cute" + Add).
 *
 * Optimistic (docs/DESIGN.md, "In-between states"): an added or edited
 * wish shows at once with "Sine-save…" (or "Hinihintay ang signal…"
 * offline: the save waits and goes through once the connection is back),
 * and an Alisin takes it off at once. If the server says no, the list
 * rolls back by itself and a clear message says what didn't save; what was
 * typed goes back into the field, so trying again is one tap. After each
 * action the cursor returns to the add field.
 */
export function WishlistEditor({
  slug,
  items,
  budgetLine,
}: {
  slug: string;
  items: WishItemData[];
  /** The budget, on its own line above the add row ("Hanggang ₱500 ang regalo."). */
  budgetLine: string;
}) {
  const [list, change] = useOptimistic<Wish[], Change>(items, (current, c) =>
    "add" in c
      ? [...current, c.add]
      : "edit" in c
        ? current.map((i) => (i.id === c.edit.id ? c.edit : i))
        : current.filter((i) => i.id !== c.remove),
  );
  const [, startTransition] = useTransition();
  const savingLabel = usePendingLabel(true, "", "Sine-save…");
  const [editing, setEditing] = useState<{ id: string; draft?: Draft; errors?: Errors } | null>(null);
  // The add form remounts (cleared) on every add, and with the draft and
  // its errors if that add failed.
  const [addForm, setAddForm] = useState<{ key: number; draft: Draft; errors?: Errors }>({ key: 0, draft: EMPTY });
  // "Na-save!" fits one listahan line; the rest is for screen readers.
  const [notice, setNotice] = useState<{ ok: boolean; text: string; detail?: string } | null>(null);

  const focusAdd = () => requestAnimationFrame(() => document.getElementById(ADD_FIELD)?.focus());

  const add = (draft: Draft) => {
    setNotice(null);
    setAddForm((f) => ({ key: f.key + 1, draft: EMPTY }));
    const item = toItem(`new-${Date.now()}`, draft);
    startTransition(async () => {
      change({ add: item });
      const result = await addWishAction({ slug, ...draft });
      if (result.ok) return setNotice({ ok: true, text: "Na-save!", detail: `Nasa wishlist mo na ang “${item.title}”.` });
      setAddForm((f) => ({ key: f.key + 1, draft, errors: result.fieldErrors }));
      setNotice({ ok: false, text: `Hindi na-save ang “${item.title}”. ${result.fieldErrors ? "Pakicheck sa baba." : result.message}` });
    });
  };

  const save = (id: string, draft: Draft) => {
    setNotice(null);
    setEditing(null);
    focusAdd();
    startTransition(async () => {
      change({ edit: toItem(id, draft) });
      const result = await updateWishAction({ slug, itemId: id, ...draft });
      if (result.ok) return setNotice({ ok: true, text: "Na-save!" });
      setEditing({ id, draft, errors: result.fieldErrors });
      setNotice({ ok: false, text: `Hindi na-save ang pagbabago. ${result.fieldErrors ? "Pakicheck sa itaas." : result.message}` });
    });
  };

  const remove = (item: Wish) => {
    setNotice(null);
    focusAdd();
    startTransition(async () => {
      change({ remove: item.id });
      const result = await deleteWishAction({ slug, itemId: item.id });
      setNotice(
        result.ok
          ? { ok: true, text: "Naalis na!", detail: `Wala na sa wishlist mo ang “${item.title}”.` }
          : { ok: false, text: `Hindi naalis ang “${item.title}”. ${result.message}` },
      );
    });
  };

  return (
    <Listahan title="Wishlist mo" titleId="my-wishlist-title">
      {list.length === 0 && (
        <LstEmpty lines={["Wala pang laman ang wishlist mo.", "Add something para sa monito mo."]} />
      )}

      {list.length > 0 && (
        <ul aria-label="Wishlist mo">
          {list.map((item) => (
            <li key={item.id} aria-busy={item.saving || undefined}>
              {editing?.id === item.id ? (
                <WishForm
                  initial={editing.draft ?? { title: item.title, url: item.url ?? "", note: item.note ?? "" }}
                  initialErrors={editing.errors}
                  mode="edit"
                  onSubmit={(draft) => save(item.id, draft)}
                  onCancel={() => {
                    setEditing(null);
                    focusAdd();
                  }}
                />
              ) : (
                <WishRows
                  item={item}
                  actions={
                    item.saving ? (
                      <span className="text-small text-ube-soft">{savingLabel}</span>
                    ) : (
                      <span className="-mr-1.5 flex">
                        <Button type="button" variant="link" onClick={() => setEditing({ id: item.id })} aria-label={`Edit ${item.title}`}>
                          Edit
                        </Button>
                        <Button type="button" variant="link" aria-label={`Alisin ang ${item.title}`} onClick={() => remove(item)}>
                          Alisin
                        </Button>
                      </span>
                    )
                  }
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {/* What just happened, announced: "Na-save!" or what didn't save. */}
      <div aria-live="polite">
        {notice?.ok && (
          <p data-wish-notice className="lst-row justify-start font-bold text-dahon">
            {notice.text}
            {notice.detail && <span className="sr-only"> {notice.detail}</span>}
          </p>
        )}
      </div>
      {notice && !notice.ok && <ErrorMessage className="my-2">{notice.text}</ErrorMessage>}

      {list.length < WISHLIST_MAX_ITEMS ? (
        <WishForm
          key={addForm.key}
          initial={addForm.draft}
          initialErrors={addForm.errors}
          mode="add"
          budgetLine={budgetLine}
          autoFocus={addForm.key > 0}
          onSubmit={add}
        />
      ) : (
        <p className="lst-row text-small text-ube-soft">Hanggang {WISHLIST_MAX_ITEMS} items lang ang wishlist.</p>
      )}
    </Listahan>
  );
}

/**
 * Adding: one two-line row ("Hal. mug na cute" + Add), with link and note
 * behind "Lagyan ng link o note". Editing: the title with Save, then the
 * link and note, and Cancel. Hands the draft up and is done: the list
 * shows it at once (optimistic).
 */
function WishForm({
  initial,
  initialErrors,
  mode,
  onSubmit,
  onCancel,
  budgetLine,
  autoFocus,
}: {
  initial: Draft;
  initialErrors?: Errors;
  mode: "add" | "edit";
  onSubmit: (draft: Draft) => void;
  onCancel?: () => void;
  budgetLine?: string;
  autoFocus?: boolean;
}) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [errors, setErrors] = useState<Errors>(initialErrors ?? {});
  const [extras, setExtras] = useState(mode === "edit" || Boolean(initial.url || initial.note));

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
    // The one check worth doing here: an empty wish never shows up and vanishes.
    if (!draft.title.trim()) {
      setErrors({ title: "Pakilagay kung ano ang gusto mo." });
      return titleRef.current?.focus();
    }
    onSubmit(draft);
  };

  return (
    <form onSubmit={submit} noValidate>
      {budgetLine && <p className="lst-row text-small text-ube-soft">{budgetLine}</p>}
      <div className="lst-row2">
        <Input
          ref={titleRef}
          id={mode === "add" ? ADD_FIELD : undefined}
          size="row"
          value={draft.title}
          onChange={(e) => set("title")(e.target.value)}
          placeholder="Hal. mug na cute"
          aria-label="Ano ang gusto mo?"
          aria-invalid={errors.title ? true : undefined}
          maxLength={WISH_TITLE_MAX}
          autoFocus={mode === "edit" || autoFocus}
          required
          className="flex-1"
        />
        <Button type="submit" variant="secondary">
          {mode === "add" ? "Add" : "Save"}
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
          {onCancel && (
            <div className="lst-row justify-start">
              <Button type="button" variant="link" className="-ml-1.5" onClick={onCancel}>
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
