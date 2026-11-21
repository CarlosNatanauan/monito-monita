"use client";

import { usePendingLabel } from "@/lib/use-pending-label";
import { useState, useTransition } from "react";
import { Name } from "@/components/page";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { Select } from "@/components/ui/input";
import { Listahan } from "@/components/ui/paper";
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
  const addLabel = usePendingLabel(pending, "Add", "Dinadagdag…");
  // A to Z in the dropdowns (the list itself stays in join order elsewhere).
  const byName = [...members].sort((a, b) => a.displayName.localeCompare(b.displayName, "en", { sensitivity: "base" }));

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
    <div className="flex flex-col gap-2.5">
      <ErrorMessage>{warning}</ErrorMessage>
      <Listahan title="Bawal magkabunot" titleId="exclusions-title">
        {pairs.length === 0 ? (
          <p className="lst-row text-ube-soft">Wala pang bawal.</p>
        ) : (
          <ul aria-label="Exclusion pairs">
            {pairs.map((pair) => (
              <li key={pair.id} className="lst-row">
                <span className="lst-wrap">
                  <Name>{pair.memberAName}</Name> at <Name>{pair.memberBName}</Name>
                </span>
                {editable && (
                  <Button
                    type="button"
                    variant="link"
                    className="-mr-1.5 self-start"
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
          // One row of two names and Add; at a very large text size they wrap onto more rows.
          <div className="lst-row2 flex-wrap">
            <label className="min-w-0 flex-1 basis-[5.5rem]">
              <span className="sr-only">Unang tao</span>
              <Select value={first} onChange={(e) => setFirst(e.target.value)} disabled={pending}>
                <option value="">Pumili</option>
                {byName.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}
                  </option>
                ))}
              </Select>
            </label>
            <label className="min-w-0 flex-1 basis-[5.5rem]">
              <span className="sr-only">Pangalawang tao</span>
              <Select value={second} onChange={(e) => setSecond(e.target.value)} disabled={pending}>
                <option value="">Pumili</option>
                {byName
                  .filter((m) => m.id !== first)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName}
                    </option>
                  ))}
              </Select>
            </label>
            <Button type="button" variant="secondary" onClick={add} disabled={pending || !first || !second} aria-label="Add pair">
              {addLabel}
            </Button>
          </div>
        )}
        {/* Only next to the add form: after the draw it's locked, and an old error would be stale. */}
        {editable && error && <ErrorMessage className="my-2">{error}</ErrorMessage>}
      </Listahan>
      <p className="text-small text-ube-soft">Hindi sila magkakabunutan, halimbawa mag-asawa o magkapatid.</p>
    </div>
  );
}
