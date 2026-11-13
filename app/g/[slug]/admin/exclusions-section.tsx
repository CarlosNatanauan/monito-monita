"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { addExclusionAction, removeExclusionAction } from "./actions";

export interface ExclusionView {
  id: string;
  memberAName: string;
  memberBName: string;
}

const selectClass =
  "h-12 w-full min-w-0 rounded-xl border border-input bg-niyog px-3 text-body text-ube outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:opacity-60";

export function ExclusionsSection({
  slug,
  members,
  pairs,
  editable,
  warning,
}: {
  slug: string;
  members: { id: string; displayName: string }[];
  pairs: ExclusionView[];
  editable: boolean;
  /** Plain-language reason the draw is impossible, if it is. */
  warning: string | null;
}) {
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; message?: string }>, onSuccess?: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) onSuccess?.();
      else setError(result.message ?? "May problema. Subukan ulit.");
    });
  };

  const add = () => {
    if (!first || !second) return setError("Pumili ng dalawang tao.");
    if (first === second) return setError("Pumili ng dalawang magkaibang tao.");
    run(
      () => addExclusionAction({ slug, memberAId: first, memberBId: second }),
      () => {
        setFirst("");
        setSecond("");
      },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {warning && (
        <p role="alert" className="rounded-xl bg-sili-wash px-4 py-3 text-small font-semibold text-sili">
          {warning}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-sili-wash px-4 py-3 text-small font-semibold text-sili">
          {error}
        </p>
      )}

      {editable && members.length >= 2 && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-small font-semibold">Unang tao</span>
              <select className={selectClass} value={first} onChange={(e) => setFirst(e.target.value)} disabled={pending}>
                <option value="">Pumili…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-small font-semibold">Pangalawang tao</span>
              <select className={selectClass} value={second} onChange={(e) => setSecond(e.target.value)} disabled={pending}>
                <option value="">Pumili…</option>
                {members
                  .filter((m) => m.id !== first)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <Button type="button" variant="secondary" onClick={add} disabled={pending || !first || !second} className="self-start">
            {pending ? "Sandali…" : "Add pair"}
          </Button>
        </div>
      )}

      {pairs.length === 0 ? (
        <p className="text-small text-ube-soft">Wala pang bawal.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border" aria-label="Exclusion pairs">
          {pairs.map((pair) => (
            <li key={pair.id} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0 truncate">
                {pair.memberAName} <span className="text-ube-soft">&amp;</span> {pair.memberBName}
              </span>
              {editable && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => removeExclusionAction({ slug, exclusionId: pair.id }))}
                  aria-label={`Remove pair ${pair.memberAName} and ${pair.memberBName}`}
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
