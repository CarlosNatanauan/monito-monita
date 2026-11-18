"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** The demo video on YouTube (the 51-second cut built in video/). */
export const DEMO_VIDEO_ID = "DBNKbfwfE50";
export const DEMO_VIDEO_EMBED = `https://www.youtube-nocookie.com/embed/${DEMO_VIDEO_ID}?autoplay=1&rel=0&playsinline=1`;

const POSTER = "/landing/demo-poster";
const SIZES = "(min-width: 1024px) 740px, (min-width: 600px) 560px, calc(100vw - 40px)";

/**
 * The landing's demo video behind a click-to-load facade: our own poster
 * (a frame of the video, served from this site) and a paper "Panoorin"
 * label. Until it's pressed there is no YouTube code and no request to
 * YouTube at all; pressing it swaps in the youtube-nocookie player,
 * autoplaying, in the same 16:9 box (no layout shift), moves focus into
 * it, and counts one "landing_video_played" (no personal data).
 */
export function DemoVideo({ className }: { className?: string }) {
  const [playing, setPlaying] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (playing) frameRef.current?.focus();
  }, [playing]);

  const play = () => {
    setPlaying(true);
    void fetch("/api/landing-video", { method: "POST", keepalive: true }).catch(() => {});
  };

  return (
    <div className={cn("relative aspect-video w-full", className)}>
      {playing ? (
        <iframe
          ref={frameRef}
          src={DEMO_VIDEO_EMBED}
          title="Monito Monita: the demo video"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full rounded-sky bg-gabi lg:rounded-sky-lg"
        />
      ) : (
        <button
          type="button"
          onClick={play}
          aria-label="Panoorin ang demo video, 51 segundo"
          className="group absolute inset-0 cursor-pointer overflow-hidden rounded-sky bg-gabi focus-ring lg:rounded-sky-lg"
        >
          <picture>
            <source type="image/avif" srcSet={`${POSTER}-640.avif 640w, ${POSTER}-1280.avif 1280w`} sizes={SIZES} />
            {/* Pre-sized posters in public/landing: no image optimizer needed. */}
            <img
              src={`${POSTER}-1280.webp`}
              srcSet={`${POSTER}-640.webp 640w, ${POSTER}-1280.webp 1280w`}
              sizes={SIZES}
              width={1280}
              height={720}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 size-full object-cover"
            />
          </picture>
          {/* The paper label, like "Tap to open your bunutan" on the slip's sky. */}
          <span
            aria-hidden
            className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2.5 rounded-paper bg-papel px-4 py-3 text-body font-bold text-ube transition-[scale,background-color] duration-150 group-hover:bg-ilaw-lit group-focus-visible:bg-ilaw-lit group-active:scale-[0.98] lg:gap-3 lg:px-5 lg:py-3.5 lg:text-[19px]"
          >
            <svg viewBox="0 0 16 18" className="h-4.5 w-4 shrink-0 lg:h-5 lg:w-4.5">
              <path d="M1.5 1.6v14.8L15 9Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            Panoorin
            <span className="font-normal text-ube-soft">0:51</span>
          </span>
        </button>
      )}
    </div>
  );
}
