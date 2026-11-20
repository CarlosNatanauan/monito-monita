"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const POSTER = "/landing/poster";
const SIZES = "(min-width: 1180px) 632px, (min-width: 600px) 640px, calc(100vw - 40px)";
type Player = typeof import("./video-player");
const loadPlayer = () => import("./video-player");

/**
 * The landing's demo video (docs/design/landing-video, 1a "Poster first"):
 * our own poster (the opened slip "Carlo", WebP 640/1280, the page's likely
 * LCP image) as one button, with a paper "Panoorin 0:51" label. First paint
 * is the poster only: no <video> and no video bytes until it's pressed. The
 * player code loads on the first press (or as the press starts), then plays
 * in place, or full screen on a phone; when the viewer is done, the poster
 * and the focus come back. Each press counts one "landing_video_played".
 */
export function DemoVideo({ className }: { className?: string }) {
  const [state, setState] = useState<"poster" | "loading" | "playing">("poster");
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const player = useRef<Player | null>(null);
  const stop = useRef<(() => void) | null>(null);

  // Focus goes back to the poster once it's showing again (after the end, or leaving full screen).
  const refocus = useRef(false);
  useEffect(() => {
    if (state === "poster" && refocus.current) {
      refocus.current = false;
      button.current?.focus();
    }
  }, [state]);

  useEffect(() => () => stop.current?.(), []);

  const warm = () => {
    if (!player.current) void loadPlayer().then((m) => (player.current = m));
  };

  const play = async () => {
    if (state !== "poster" || !box.current) return;
    void fetch("/api/landing-video", { method: "POST", keepalive: true }).catch(() => {});
    setState("loading");
    const m = player.current ?? (player.current = await loadPlayer());
    setState("playing");
    stop.current = m.startVideo({
      box: box.current,
      // The still the page already loaded (640 or 1280), so the video adds no second download of it.
      poster: button.current?.querySelector("img")?.currentSrc || `${POSTER}-1280.webp`,
      onDone: () => {
        stop.current = null;
        refocus.current = true;
        setState("poster");
      },
    });
  };

  return (
    <div ref={box} className={cn("relative aspect-video w-full overflow-hidden rounded-sky bg-ube", className)}>
      <button
        ref={button}
        type="button"
        onClick={play}
        onPointerDown={warm}
        onKeyDown={warm}
        aria-label="Panoorin ang demo video, 0:51"
        aria-busy={state === "loading" || undefined}
        className={cn(
          "group absolute inset-0 cursor-pointer rounded-sky focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ilaw",
          state === "playing" && "invisible",
        )}
      >
        {/* Pre-sized WebP stills in public/landing (no image optimizer). Painted as soon as it arrives: the LCP image. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- already sized and encoded (scripts/landing/make-poster.mjs) */}
        <img
          src={`${POSTER}-1280.webp`}
          srcSet={`${POSTER}-640.webp 640w, ${POSTER}-800.webp 800w, ${POSTER}-1280.webp 1280w`}
          sizes={SIZES}
          width={1280}
          height={720}
          alt=""
          loading="eager"
          fetchPriority="high"
          className="absolute inset-0 size-full object-cover"
        />
        {/* The play label: a white paper slip, tilted, with the slip shadow; it lifts 2px on hover. */}
        <span
          aria-hidden
          className={cn(
            "absolute bottom-3 left-3 flex h-11 items-center gap-[9px] rounded-paper bg-papel pr-3.5 pl-[13px] text-ube shadow-slip",
            "rotate-[-2deg] transition-transform duration-[120ms] group-hover:-translate-y-0.5",
            "lg:bottom-[22px] lg:left-[22px] lg:h-12 lg:gap-2.5 lg:pr-[18px] lg:pl-4",
          )}
        >
          <svg viewBox="0 0 18 20" className="h-4 w-3.5 shrink-0 lg:h-[18px] lg:w-4">
            <path d="M2 2L16 10L2 18Z" fill="currentColor" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
          </svg>
          <span className="font-head text-[20px] leading-none lg:text-[22px]">Panoorin</span>
          <span className="text-[15px] leading-none font-bold text-ube-soft lg:text-base">0:51</span>
        </span>
      </button>
    </div>
  );
}
