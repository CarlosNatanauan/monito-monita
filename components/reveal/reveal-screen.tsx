"use client";

import { Maximize, Minimize, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { isWindowed, revealSlipsAt, type RevealSlip } from "@/server/reveal-window";
import { ICON_BUTTON, NIGHT_BUTTON, useFullscreen } from "./controls";
import { RevealStage, type StagePair, type StageView } from "./reveal-stage";
import { useRevealSound } from "./sound";

// Gabi with a soft green centre and faint leaf veins (docs/DESIGN.md, "Reveal screen").
const NIGHT = {
  backgroundColor: "var(--color-gabi)",
  backgroundImage:
    "repeating-linear-gradient(115deg, rgb(255 255 255 / 0.035) 0 1px, transparent 1px 16px), radial-gradient(ellipse at center, #18432f 0%, transparent 70%)",
};

export type ScreenData =
  | { status: "DRAWN"; groupName: string; total: number }
  | { status: "REVEALING"; groupName: string; step: number; total: number; pair: StagePair; slips: RevealSlip[] }
  | { status: "REVEALED"; groupName: string; total: number; pairs: StagePair[] };

/** One screen of the reveal, as the stage draws it. */
export function toStageView(data: ScreenData): StageView {
  if (data.status === "DRAWN") return { ...data, step: 0, slips: [] };
  if (data.status === "REVEALING") return data;
  return { ...data, step: data.total, slips: revealSlipsAt(data.pairs, data.total) };
}

/**
 * The party reveal (signature moment 4) on a projector, a laptop, or the
 * organizer's phone. Landscape: the stage fills the window, with the
 * controls in its corners, clear of the outer 5%. Portrait (phone as
 * remote): the stage on top, big controls below.
 */
export function RevealScreen({
  data,
  backHref,
  controls,
  speed,
}: {
  data: ScreenData;
  backHref: string;
  /** Timeline speed (lab only). */
  speed?: number;
  /** Start / Next / Previous for this screen. */
  controls?: React.ReactNode;
}) {
  const view = toStageView(data);
  const windowed = isWindowed(view.total);
  const sound = useRevealSound();
  const fullscreen = useFullscreen();

  // Large groups: after the finale (or straight away after a refresh), the full list of pairs.
  const [showList, setShowList] = useState(view.status === "REVEALED" && windowed);
  const [wasRevealed, setWasRevealed] = useState(view.status === "REVEALED");
  if ((view.status === "REVEALED") !== wasRevealed) {
    setWasRevealed(view.status === "REVEALED");
    if (view.status !== "REVEALED") setShowList(false);
  }

  // "F" for fullscreen.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "f" || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(event.target.tagName)) return;
      fullscreen.toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const status =
    view.status === "DRAWN" ? (
      <>{view.total} slips</>
    ) : view.status === "REVEALING" ? (
      <span data-count>
        {view.step} of {view.total}
      </span>
    ) : (
      <>Tapos na!</>
    );

  return (
    <div className="relative flex min-h-dvh flex-1 flex-col text-white landscape:h-dvh landscape:overflow-hidden" style={NIGHT}>
      <header className="z-10 flex items-center justify-between gap-2 px-4 pt-3 landscape:absolute landscape:inset-x-[5vw] landscape:top-[5vh] landscape:p-0">
        <Link
          href={backHref}
          className="flex min-h-11 items-center rounded-sm font-bold text-gabi-mist underline underline-offset-4 focus-ring landscape:text-[clamp(16px,2.2vh,24px)]"
        >
          Back to organizer page
        </Link>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" className={ICON_BUTTON} aria-pressed={sound.on} onClick={sound.toggle}>
            {sound.on ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
            <span className="portrait:sr-only">Tunog: {sound.on ? "on" : "off"}</span>
          </Button>
          {fullscreen.supported && (
            <Button type="button" variant="ghost" className={ICON_BUTTON} onClick={fullscreen.toggle}>
              {fullscreen.active ? <Minimize aria-hidden /> : <Maximize aria-hidden />}
              <span className="portrait:sr-only">{fullscreen.active ? "Exit fullscreen" : "Fullscreen"}</span>
            </Button>
          )}
        </div>
      </header>

      <RevealStage
        view={view}
        showList={showList}
        className="relative aspect-video w-full overflow-hidden landscape:absolute landscape:inset-0 landscape:aspect-auto"
        speed={speed}
        onCue={sound.play}
        onFinaleDone={() => {
          if (windowed) setShowList(true);
        }}
      />

      <footer className="z-10 flex flex-col gap-4 px-4 pt-2 pb-8 landscape:absolute landscape:inset-x-[5vw] landscape:bottom-[5vh] landscape:flex-row landscape:items-end landscape:justify-between landscape:p-0">
        <p className="text-title font-bold text-gabi-mist landscape:text-[clamp(16px,2.4vh,28px)]">
          {view.groupName} · {status}
        </p>
        <div className="flex flex-col gap-3 landscape:flex-row landscape:items-end">
          {view.status === "REVEALED" && (
            <Button type="button" variant="secondary" className={NIGHT_BUTTON} onClick={() => setShowList((s) => !s)}>
              {showList ? "Balik sa parol" : "Lahat ng pairs"}
            </Button>
          )}
          {controls}
        </div>
      </footer>
    </div>
  );
}
