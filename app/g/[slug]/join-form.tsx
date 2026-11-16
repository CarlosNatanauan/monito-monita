"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { JoinDrop, preloadDrop } from "@/components/bowl/lazy-join-drop";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { joinAction, type JoinState } from "./actions";
import { ComeBackForm } from "./come-back-form";
import { NameLine } from "./name-line";
import { PinField } from "./pin-field";

const initialState: JoinState = { status: "idle" };

/**
 * Name + PIN to join. If the name is already in the group, nothing is
 * created and two equal choices take its place: "Ako 'yan" (the come-back
 * form, PIN only) or "Hindi ako 'yan" (the join form again, the name kept,
 * with a hint to add an initial). Saying the name is taken tells nothing
 * new: the taken result itself already shows that.
 *
 * Uncontrolled on purpose: `<form action>` works even before hydration
 * (slow phones opening links from Messenger), and the action returns the
 * submitted name, which becomes the default value so React's automatic
 * form reset restores it instead of clearing it. The PIN is never echoed.
 */
export function JoinForm({
  slug,
  footer,
}: {
  slug: string;
  /** Shown under the join form only (not while the come-back form shows). */
  footer?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(joinAction, initialState);
  // The error hides as soon as a field is edited, until the next submit.
  const [editedAfter, setEditedAfter] = useState<JoinState | null>(null);
  // After a taken name: which choice they made, for this result.
  const [choice, setChoice] = useState<{ after: JoinState; mine: boolean } | null>(null);
  const chosen = choice?.after === state ? choice : null;

  const error = state.status === "error" && editedAfter !== state ? state : null;
  // A missing or wrong PIN: the cursor goes back to the boxes.
  const pinError = error?.field === "pin";
  useEffect(() => {
    if (pinError) document.getElementById("pin")?.focus();
  }, [pinError, state]);

  // Joined: the slip drops into the bowl, then /me (signature moment 2).
  if (state.status === "joined") return <JoinDrop name={state.displayName} href={state.href} />;

  if (state.status === "taken" && !chosen) {
    return <TakenChoice name={state.displayName} onChoose={(mine) => setChoice({ after: state, mine })} />;
  }

  if (state.status === "taken" && chosen?.mine) {
    return (
      <ComeBackForm
        key="taken"
        slug={slug}
        presetName={state.displayName}
        intro="Ilagay ang PIN na ginawa mo noong sumali ka."
        onNew={() => setChoice({ after: state, mine: false })}
      />
    );
  }

  // "Hindi ako 'yan": the join form again, with the taken name and a hint.
  const takenName = state.status === "taken" ? state.displayName.trim() : null;
  const submittedName = state.status === "idle" ? "" : state.displayName;
  const edited = () => {
    if (editedAfter !== state) setEditedAfter(state);
  };

  return (
    <>
      <form
        action={formAction}
        className="flex flex-col gap-[18px] lg:gap-[22px]"
        aria-label="Sumali"
        noValidate
        // Fetch the drop animation while they type, so it's ready on submit.
        onFocus={preloadDrop}
      >
        <input type="hidden" name="slug" value={slug} />
        {takenName && (
          <p id="taken-hint" className="font-bold text-dahon">
            May {takenName} na sa group. Dagdagan ng initial ng apelyido, hal. “{takenName} R.”
          </p>
        )}
        <div className="listahan">
          <p className="lst-row font-bold">
            <span className="lg:hidden">Isulat ang pangalan mo</span>
            <span className="hidden lg:inline">Isulat ang pangalan mo sa listahan</span>
          </p>
          <NameLine
            id="displayName"
            name="displayName"
            defaultValue={submittedName}
            onChange={edited}
            placeholder="Hal. Joy"
            maxLength={40}
            autoComplete="username"
            invalid={error?.field === "displayName"}
            aria-describedby={error?.field === "displayName" ? "join-error" : takenName ? "taken-hint" : undefined}
            autoFocus={Boolean(takenName)}
            required
          />
          <PinField
            id="pin"
            label="4-digit PIN"
            labelClassName="lst-label block"
            rowClassName="lst-row2"
            autoComplete="new-password"
            invalid={pinError}
            describedBy={pinError ? "pin-error" : "pin-hint"}
            onChange={edited}
          />
          {/* The PIN error takes the helper's line, so Join doesn't move down. */}
          {pinError ? (
            <p id="pin-error" role="alert" className="lst-row text-small font-bold text-sili">
              {error.message}
            </p>
          ) : (
            <p id="pin-hint" className="lst-row text-small text-ube-soft">
              Tandaan mo &apos;to. Gamit mo pagbalik.
            </p>
          )}
        </div>
        {error?.field === "displayName" && <ErrorMessage id="join-error">{error.message}</ErrorMessage>}
        {error && error.field === null && <ErrorMessage>{error.message}</ErrorMessage>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Sumasali…" : "Join the group"}
        </Button>
      </form>
      {footer}
    </>
  );
}

/**
 * The name is in the group already: is it them, or someone else with the
 * same name? Two equal buttons, right under the question (above the fold).
 */
/** Both choices look the same (neither is the "right" one) and wrap on small phones. */
const CHOICE = "h-auto min-h-14 w-full whitespace-normal py-2.5 text-center";

function TakenChoice({ name, onChoose }: { name: string; onChoose: (mine: boolean) => void }) {
  return (
    <section aria-labelledby="taken-title" className="flex flex-col gap-3.5">
      <h2 id="taken-title" className="font-head text-section break-words lg:text-section-lg">
        May <span className="nm">{name.trim()}</span> na sa group
      </h2>
      <p>Ikaw ba &apos;yan?</p>
      <Button type="button" variant="secondary" className={CHOICE} onClick={() => onChoose(true)}>
        Ako &apos;yan, ilalagay ko ang PIN
      </Button>
      <Button type="button" variant="secondary" className={CHOICE} onClick={() => onChoose(false)}>
        Hindi ako &apos;yan, gagamit ako ng ibang pangalan
      </Button>
    </section>
  );
}
