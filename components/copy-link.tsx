"use client";

import { Check, Copy } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const noopSubscribe = () => () => {};

/** The site origin in the browser ("" during server rendering). */
export function useOrigin(): string {
  return useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
}

/** Shows a link (path or absolute URL) as selectable text. */
export function LinkBox({ url }: { url: string }) {
  return (
    <p className="min-h-10 rounded-lg bg-muted px-3 py-2 text-caption break-all select-all" translate="no">
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
  variant?: "default" | "outline";
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
      {copied ? <Check /> : <Copy />}
      {copied ? "Copied!" : label}
    </Button>
  );
}

/** A link from a path, made absolute in the browser, with a Copy button. */
export function CopyLink({
  path,
  label,
  variant = "default",
}: {
  path: string;
  label: string;
  variant?: "default" | "outline";
}) {
  const origin = useOrigin();
  const url = origin ? `${origin}${path}` : "";
  return (
    <div className="flex flex-col gap-3">
      <LinkBox url={url || path} />
      <CopyButton text={url} label={label} variant={variant} />
    </div>
  );
}
