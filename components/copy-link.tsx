"use client";

import { Check } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { maskLink } from "@/lib/mask-link";
import { siteOrigin } from "@/lib/site-url";

const noopSubscribe = () => () => {};

/**
 * The origin for links on screen, in Copy and in Share: NEXT_PUBLIC_SITE_URL
 * when set, else the page's real origin ("" during server rendering).
 */
export function useOrigin(): string {
  return useSyncExternalStore(noopSubscribe, () => siteOrigin(window.location.origin), () => "");
}

/**
 * Shows a link (path or absolute URL) as selectable text. `masked` shows
 * the link with its token as dots instead (personal links: people
 * screenshot their page); the real link is then only in Copy / Share.
 */
export function LinkBox({
  url,
  masked = false,
  maskedLabel = "Personal link (nakatago). Gamitin ang Copy o Send.",
}: {
  url: string;
  masked?: boolean;
  /** What a screen reader says instead of the hidden link. */
  maskedLabel?: string;
}) {
  if (masked) {
    return (
      <p
        data-masked-link
        className="rounded-2xl bg-leaf-wash px-5 py-4 font-medium break-all"
        translate="no"
      >
        <span aria-hidden>{maskLink(url)}</span>
        <span className="sr-only">{maskedLabel}</span>
      </p>
    );
  }
  return (
    <p className="rounded-2xl bg-leaf-wash px-5 py-4 font-medium break-all select-all" translate="no">
      {url}
    </p>
  );
}

export function CopyButton({
  text,
  label,
  variant = "default",
  className,
  onCopied,
}: {
  text: string;
  label: string;
  variant?: "default" | "secondary";
  className?: string;
  /** Called after a successful copy. */
  onCopied?: () => void;
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
    <Button type="button" variant={variant} onClick={copy} className={className} aria-live="polite" disabled={!text}>
      {copied && <Check />}
      {copied ? "Copied!" : label}
    </Button>
  );
}

/** A link from a path, made absolute in the browser, with a Copy button. Pass `maskedLabel` to hide its token. */
export function CopyLink({
  path,
  label,
  variant = "default",
  maskedLabel,
}: {
  path: string;
  label: string;
  variant?: "default" | "secondary";
  /** Show the link with its token as dots (Copy still uses the full link). */
  maskedLabel?: string;
}) {
  const origin = useOrigin();
  const url = origin ? `${origin}${path}` : "";
  return (
    <div className="flex flex-col gap-3">
      <LinkBox url={url || path} masked={Boolean(maskedLabel)} maskedLabel={maskedLabel} />
      <CopyButton text={url} label={label} variant={variant} />
    </div>
  );
}
