"use client";

import { Send } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { CopyButton, LinkBox, useOrigin } from "@/components/copy-link";
import { Button } from "@/components/ui/button";

const noopSubscribe = () => () => {};

/** True in browsers with the Web Share API (most phones). False on the server. */
function useCanShare(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );
}

/**
 * "Send this link to yourself": opens the phone's share sheet (Messenger,
 * Notes, email…) with the personal link. Copy is always there too, and is
 * the main button where sharing isn't supported.
 */
export function ShareLink({
  path,
  shareText,
  prominent = false,
  masked = false,
}: {
  path: string;
  /** Text that goes with the link in the share sheet. */
  shareText: string;
  /** Right after joining: the share button is the main action. */
  prominent?: boolean;
  /** Show the link with its token as dots (Copy and Share still use the full link). */
  masked?: boolean;
}) {
  const origin = useOrigin();
  const url = origin ? `${origin}${path}` : "";
  const canShare = useCanShare();
  const [failed, setFailed] = useState(false);

  const share = async () => {
    setFailed(false);
    try {
      await navigator.share({ title: "Monito Monita", text: shareText, url });
    } catch (error) {
      // Closing the share sheet isn't an error. Anything else: use Copy.
      if (!(error instanceof DOMException && error.name === "AbortError")) setFailed(true);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <LinkBox url={url || path} masked={masked} />
      {canShare && (
        <Button type="button" variant={prominent ? "default" : "secondary"} onClick={share} disabled={!url}>
          <Send />
          I-send sa sarili mo
        </Button>
      )}
      <CopyButton
        text={url}
        label="Copy my link"
        variant={canShare || !prominent ? "secondary" : "default"}
      />
      {failed && (
        <p role="status" className="text-small text-ube-soft">
          Hindi nabuksan ang share. I-copy na lang ang link.
        </p>
      )}
    </div>
  );
}
