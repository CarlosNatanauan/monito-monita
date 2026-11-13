"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { Select } from "@/components/ui/input";
import { addExclusionAction, removeExclusionAction } from "./actions";

export interface ExclusionView {
  id: string;
  memberAName: string;
  memberBName: string;
}

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
    <div className="flex flex-col gap-3">
      <ErrorMessage>{warning}</ErrorMessage>
      <ErrorMessage>{error}</ErrorMessage>

      {pairs.length === 0 ? (
        <p className="text-small font-medium text-ube-soft">Wala pang bawal.</p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Exclusion pairs">
          {pairs.map((pair) => (
            <li key={pair.id} className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-leaf-wash px-5 py-2">
              <span className="min-w-0 truncate">
                <strong>{pair.memberAName}</strong> at <strong>{pair.memberBName}</strong>
              </span>
              {editable && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="-mr-2"
                  disabled={pending}
                  onClick={() => run(() => removeExclusionAction({ slug, exclusionId: pair.id }))}
                  aria-label={`Remove pair ${pair.memberAName} and ${pair.memberBName}`}
                >
                  Alisin
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {editable && members.length >= 2 && (
        <div className="flex gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Unang tao</span>
            <Select value={first} onChange={(e) => setFirst(e.target.value)} disabled={pending}>
              <option value="">Pumili</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                </option>
              ))}
            </Select>
          </label>
          <label className="min-w-0 flex-1">
            <span className="sr-only">Pangalawang tao</span>
            <Select value={second} onChange={(e) => setSecond(e.target.value)} disabled={pending}>
              <option value="">Pumili</option>
              {members
                .filter((m) => m.id !== first)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}
                  </option>
                ))}
            </Select>
          </label>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-[52px] px-5"
            onClick={add}
            disabled={pending || !first || !second}
            aria-label="Add pair"
          >
            {pending ? "…" : "Add"}
          </Button>
        </div>
      )}
    </div>
  );
}
