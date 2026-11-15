"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";
import { displayLink, maskLink } from "@/lib/mask-link";
import { siteOrigin } from "@/lib/site-url";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};

/**
 * The origin for links on screen, in Copy and in Share: NEXT_PUBLIC_SITE_URL
 * when set, else the page's real origin ("" during server rendering).
 */
export function useOrigin(): string {
  return useSyncExternalStore(noopSubscribe, () => siteOrigin(window.location.origin), () => "");
}

/** True in browsers with the Web Share API (most phones). False on the server. */
export function useCanShare(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );
}

/**
 * The link box (docs/DESIGN.md, "GC bubble and link box"): white, a 1.5px
 * dashed ube border, bold, wraps anywhere. `masked` shows the link with its
 * token as dots (personal and organizer links: people screenshot their
 * page); the real link is then only in Copy / Share, or after "Ipakita".
 */
export function LinkBox({
  url,
  masked = false,
  maskedLabel = "Personal link (nakatago). Gamitin ang Copy.",
  className,
}: {
  url: string;
  masked?: boolean;
  /** What a screen reader says instead of the hidden link. */
  maskedLabel?: string;
  className?: string;
}) {
  const box = cn(
    "rounded-paper border-[1.5px] border-dashed border-ube bg-papel px-3 py-2.5 font-bold [overflow-wrap:anywhere]",
    className,
  );
  if (masked) {
    return (
      <p data-masked-link className={box} translate="no">
        <span aria-hidden>{maskLink(url)}</span>
        <span className="sr-only">{maskedLabel}</span>
      </p>
    );
  }
  return (
    <p className={cn(box, "select-all")} translate="no">
      {displayLink(url)}
    </p>
  );
}

export function CopyButton({
  text,
  label,
  variant = "default",
  className,
  onCopied,
  ariaLabel,
}: {
  text: string;
  label: string;
  variant?: "default" | "secondary";
  className?: string;
  /** Called after a successful copy. */
  onCopied?: () => void;
  ariaLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (rare): the link is still selectable.
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      onClick={copy}
      className={className}
      aria-live="polite"
      aria-label={copied ? undefined : ariaLabel}
      disabled={!text}
    >
      {copied && <CheckIcon />}
      {copied ? "Copied!" : label}
    </Button>
  );
}

/** A public link from a path (the share link), made absolute in the browser, with a Copy button. */
export function CopyLink({
  path,
  label,
  variant = "secondary",
  buttonClassName = "self-start",
}: {
  path: string;
  label: string;
  variant?: "default" | "secondary";
  buttonClassName?: string;
}) {
  const origin = useOrigin();
  const url = origin ? `${origin}${path}` : "";
  return (
    <>
      <LinkBox url={url || path} />
      <CopyButton text={url} label={label} variant={variant} className={buttonClassName} />
    </>
  );
}

/**
 * A private link (personal or organizer): masked until "Ipakita", then
 * Copy, and "I-send sa sarili mo" where the phone can share. Pass either
 * a `path` (made absolute here) or a full `url`.
 */
export function PrivateLink({
  path,
  url: fullUrl,
  maskedLabel,
  copyLabel = "Copy",
  copyAriaLabel,
  shareText,
  prominent = false,
}: {
  path?: string;
  url?: string;
  maskedLabel: string;
  copyLabel?: string;
  copyAriaLabel?: string;
  /** With a share text, phones also get "I-send sa sarili mo". */
  shareText?: string;
  /** Right after joining: sending it to yourself (or Copy, without share) is the filled main button. */
  prominent?: boolean;
}) {
  const origin = useOrigin();
  const url = fullUrl ?? (origin && path ? `${origin}${path}` : "");
  const [shown, setShown] = useState(false);
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
    <>
      <LinkBox url={url || path || ""} masked={!shown} maskedLabel={maskedLabel} />
      <div className="flex flex-wrap gap-2.5">
        <Button type="button" variant="secondary" aria-pressed={shown} onClick={() => setShown((s) => !s)} disabled={!url}>
          {shown ? "Itago" : "Ipakita"}
        </Button>
        <CopyButton
          text={url}
          label={copyLabel}
          variant={prominent && !(shareText && canShare) ? "default" : "secondary"}
          ariaLabel={copyAriaLabel}
        />
        {shareText && canShare && (
          <Button type="button" variant={prominent ? "default" : "secondary"} onClick={share} disabled={!url} className={cn(prominent && "w-full")}>
            I-send sa sarili mo
          </Button>
        )}
      </div>
      {failed && (
        <p role="status" className="text-small text-ube-soft">
          Hindi nabuksan ang share. I-copy na lang ang link.
        </p>
      )}
    </>
  );
}
