"use client";

import { usePendingLabel } from "@/lib/use-pending-label";
import { ChevronLeft, Play } from "lucide-react";
import { useActionState, useRef, useState, useTransition } from "react";
import { GOLD_BUTTON, NIGHT_BUTTON, useRevealKeys } from "@/components/reveal/controls";
import { useCanShare, useOrigin } from "@/components/copy-link";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import type { QrPath } from "@/lib/qr";
import { moveRevealFormAction, startRevealAction } from "./actions";

/**
 * "Gawing remote ang phone mo" (persona test C7), on the laptop's "Handa
 * na?" screen: a QR code of the organizer link to scan with the
 * organizer's own phone, with "I-send sa phone ko" (the share sheet) or
 * Copy as the fallback. The screen may already be on the projector, so
 * neither the link nor the QR shows until "Ipakita ang QR" (like a private
 * link's "Ipakita"); the QR then takes the place of the explanation line.
 * It sits inside the ring under "Handa na?" (stage pixels, scaled with the
 * stage), so it never covers a slip; a phone held upright doesn't show the
 * stage at all (that phone already is the remote).
 *
 * The QR is encoded on the server (lib/qr.ts) and arrives as a finished
 * SVG path: no QR library in any page's JS. Only the organizer's own
 * reveal screen renders this (it holds their link).
 */
export function PhoneRemote({ remotePath, qr }: { remotePath: string; qr?: QrPath }) {
  const origin = useOrigin();
  const canShare = useCanShare();
  const [done, setDone] = useState<"copied" | "failed" | null>(null);
  const [showQr, setShowQr] = useState(false);
  const url = origin ? `${origin}${remotePath}` : "";

  const send = async () => {
    setDone(null);
    try {
      if (canShare) {
        await navigator.share({ title: "Monito Monita", text: "Organizer link (para sa phone ko lang)", url });
      } else {
        await navigator.clipboard.writeText(url);
        setDone("copied");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setDone("failed");
    }
  };

  const sendButton = (
    <button type="button" className={REMOTE_BUTTON} disabled={!url} onClick={send}>
      {canShare ? "I-send sa phone ko" : done === "copied" ? "Copied!" : "Copy organizer link"}
    </button>
  );
  const qrToggle = qr && (
    <button
      type="button"
      className={REMOTE_BUTTON}
      aria-expanded={showQr}
      aria-controls="remote-qr"
      onClick={() => setShowQr((s) => !s)}
    >
      {showQr ? "Itago ang QR" : "Ipakita ang QR"}
    </button>
  );
  const status = (
    <>
      {done === "copied" && <p role="status">I-paste sa chat mo sa sarili mo, tapos buksan sa phone.</p>}
      {done === "failed" && <p role="status">Hindi na-send. Buksan na lang ang organizer link sa phone mo.</p>}
    </>
  );
  const title = (
    <h2 id="remote-title" className="font-head text-[32px] leading-none text-white">
      Gawing remote ang phone mo
    </h2>
  );

  if (qr && showQr) {
    // The QR on white with a quiet zone, 360px on the 1920 stage (about
    // 6 cm on a 14" laptop): big enough to scan from arm's length.
    return (
      <section
        aria-labelledby="remote-title"
        data-qr-open
        className="mt-1 flex max-w-[860px] items-center gap-8 border-t-[1.5px] border-gabi-line pt-4 text-left text-[26px] leading-[1.25] text-gabi-text"
      >
        <svg
          id="remote-qr"
          role="img"
          aria-label="QR code ng organizer link"
          viewBox={`-2 -2 ${qr.size + 4} ${qr.size + 4}`}
          shapeRendering="crispEdges"
          className="size-[360px] shrink-0 bg-papel"
        >
          <path d={qr.d} fill="#1E1238" />
        </svg>
        <div className="flex flex-col items-start gap-3">
          {title}
          <p className="font-bold text-white">I-scan gamit ang phone mo.</p>
          <p>Tapos i-tap ang Party reveal sa phone.</p>
          <div className="flex flex-wrap gap-3">
            {qrToggle}
            {sendButton}
          </div>
          {status}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="remote-title"
      className="mt-4 flex max-w-[860px] flex-col items-center gap-2 border-t-[1.5px] border-gabi-line pt-4 text-[26px] leading-[1.25] text-gabi-text"
    >
      {title}
      <p>Buksan ang organizer link sa phone, tapos i-tap ang Party reveal.</p>
      <div className="flex flex-wrap justify-center gap-3">
        {qrToggle}
        {sendButton}
      </div>
      {status}
    </section>
  );
}

const REMOTE_BUTTON =
  "h-[54px] cursor-pointer rounded-btn border-[1.5px] border-gabi-text px-6 text-[26px] font-bold text-gabi-text focus-ring disabled:cursor-not-allowed";

/** "Simulan ang reveal", with a confirm (redraws and removals lock after). */
export function StartReveal({ slug }: { slug: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const startLabel = usePendingLabel(pending, "Oo, simulan na", "Sinisimulan…");

  const start = () => {
    setError(null);
    startTransition(async () => {
      const result = await startRevealAction({ slug });
      if (!result.ok) setError(result.message);
    });
  };

  return (
    <div className="flex flex-col gap-3 landscape:max-w-[min(560px,40vw)] landscape:items-end">
      <ErrorMessage>{error}</ErrorMessage>
      {!confirming ? (
        <Button type="button" variant="gold" className={GOLD_BUTTON} onClick={() => setConfirming(true)}>
          Simulan ang reveal
        </Button>
      ) : (
        <div className="flex flex-col gap-3 rounded-paper border-[1.5px] border-gabi-line bg-gabi p-5" role="group" aria-label="Confirm reveal">
          <p className="font-bold text-gabi-text landscape:text-[clamp(16px,2.4dvh,28px)]">
            Pag sinimulan na, hindi na puwedeng mag-redraw o magtanggal ng member. Go?
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="gold" className={GOLD_BUTTON} disabled={pending} onClick={start}>
              {startLabel}
            </Button>
            <Button
              type="button"
              variant="link"
              className="h-[58px] px-3 text-body text-gabi-text landscape:text-[clamp(16px,2.4dvh,28px)]"
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
              Huwag muna
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Previous / Next, as a real form: a tap before the page hydrates (slow
 * projector laptop) still goes through. Sends the step this screen shows,
 * so a double tap or a second device can't skip a pair. Space and the
 * arrow keys work too. On the last pair, Next lights the parol.
 */
export function RevealControls({ slug, step, total }: { slug: string; step: number; total: number }) {
  const [state, formAction, pending] = useActionState(moveRevealFormAction, { error: null });
  const formRef = useRef<HTMLFormElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const previousRef = useRef<HTMLButtonElement>(null);
  const last = step >= total;

  const press = (button: HTMLButtonElement | null) => {
    if (button && !button.disabled) formRef.current?.requestSubmit(button);
  };
  useRevealKeys(
    () => press(nextRef.current),
    () => press(previousRef.current),
  );

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3 landscape:items-end">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="fromStep" value={step} />
      <ErrorMessage>{state.error}</ErrorMessage>
      <div className="flex gap-3">
        <Button
          ref={previousRef}
          type="submit"
          name="move"
          value="previous"
          variant="secondary"
          className={`flex-1 ${NIGHT_BUTTON}`}
          disabled={pending || step <= 1}
        >
          <ChevronLeft aria-hidden />
          Previous
        </Button>
        <Button
          ref={nextRef}
          type="submit"
          name="move"
          value="next"
          variant="gold"
          className={`flex-[2] ${GOLD_BUTTON}`}
          disabled={pending}
        >
          {last ? (
            "Ilawan ang parol"
          ) : (
            <>
              Next
              <Play aria-hidden className="fill-current" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
