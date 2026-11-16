"use client";

import { Maximize, Minimize, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Art } from "@/components/art/symbols";
import { Lights, openedStates } from "@/components/lights";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isWindowed, revealSlipsAt, WINDOW_BEFORE, WINDOW_SLOTS, type RevealSlip } from "@/server/reveal-window";
import { ICON_BUTTON, NIGHT_BUTTON, useFullscreen } from "./controls";
import { RevealStage, type StagePair, type StageView } from "./reveal-stage";
import "./reveal.css";
import { useRevealSound } from "./sound";

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

/** "13 hanggang 24": the loop numbers the 12-slip window shows (large groups). */
function windowRange(step: number, total: number): string {
  const at = (n: number) => ((((n - 1) % total) + total) % total) + 1;
  return `${at(step - WINDOW_BEFORE)} hanggang ${at(step - WINDOW_BEFORE + WINDOW_SLOTS - 1)}`;
}

/** How many revealed pairs the phone shows while revealing. */
const PHONE_RECENT = 6;

/**
 * The party reveal (signature moment 4) on a projector, a laptop, or the
 * organizer's phone. Landscape: the 16:9 stage fills the window, on the
 * dark ube night, with the controls in its corners, clear of the outer
 * 5%. Portrait (a phone held upright): the follow-along view (the centre
 * text and the latest revealed pairs as white slips), with the organizer's
 * buttons under it, so the phone is still the remote.
 */
export function RevealScreen({
  data,
  backHref,
  controls,
  startExtra,
  speed,
}: {
  data: ScreenData;
  backHref: string;
  /** Timeline speed (lab only). */
  speed?: number;
  /** Start / Next / Previous for this screen. */
  controls?: React.ReactNode;
  /** Inside the ring under "Handa na?" (landscape only): "Gawing remote ang phone mo". */
  startExtra?: React.ReactNode;
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

  const count = (
    <span data-count>
      {view.step} of {view.total}
    </span>
  );
  // Large groups: the window's range and a small string of every pair.
  const progress =
    windowed && view.status === "REVEALING" ? (
      <Lights
        plan={openedStates(view.step, view.total)}
        variant="dark"
        label={<span>Ipinapakita: {windowRange(view.step, view.total)}</span>}
        rowClassName="h-[clamp(28px,4.4vh,48px)] w-[clamp(220px,28vh,420px)] portrait:h-9 portrait:w-full"
        className="gap-1"
      />
    ) : null;

  const tools = (
    <>
      <Link
        href={backHref}
        className="flex min-h-11 items-center rounded-paper font-bold text-gabi-text underline decoration-[1.5px] underline-offset-[3px] focus-ring landscape:text-[clamp(16px,2.4vh,28px)]"
      >
        Back to organizer page
      </Link>
      <div className="flex items-center gap-1">
        <button type="button" className={ICON_BUTTON} aria-pressed={sound.on} onClick={sound.toggle}>
          {sound.on ? <Volume2 aria-hidden className="size-5" /> : <VolumeX aria-hidden className="size-5" />}
          <span>Tunog: {sound.on ? "on" : "off"}</span>
        </button>
        {fullscreen.supported && (
          <button type="button" className={cn(ICON_BUTTON, "portrait:hidden")} onClick={fullscreen.toggle}>
            {fullscreen.active ? <Minimize aria-hidden className="size-5" /> : <Maximize aria-hidden className="size-5" />}
            <span>{fullscreen.active ? "Exit fullscreen" : "Fullscreen"}</span>
          </button>
        )}
      </div>
    </>
  );

  const listToggle = view.status === "REVEALED" && (
    <Button type="button" variant="secondary" className={cn(NIGHT_BUTTON, "portrait:hidden")} onClick={() => setShowList((s) => !s)}>
      {showList ? "Balik sa parol" : "Lahat ng pairs"}
    </Button>
  );

  // Controls and tools render once (one form, one set of key handlers);
  // CSS places them in the stage's corners (landscape) or under the
  // follow-along view (portrait).
  return (
    <div className="rv-screen relative flex min-h-dvh flex-1 flex-col text-white landscape:h-dvh landscape:overflow-hidden">
      <RevealStage
        view={view}
        showList={showList}
        className="relative overflow-hidden portrait:hidden landscape:absolute landscape:inset-0"
        speed={speed}
        onCue={sound.play}
        startExtra={startExtra}
        onFinaleDone={() => {
          if (windowed) setShowList(true);
        }}
      />

      {/* Bottom left, clear of the ring: at 16:9 the ring's lower-left slip
          starts about 24vw in, so this stays within 18vw and a long group
          name is cut short instead of running into it (the count stays). */}
      <footer className="z-10 hidden max-w-[18vw] flex-col gap-1 text-[clamp(16px,2.4vh,28px)] font-bold text-gabi-text landscape:absolute landscape:bottom-[5vh] landscape:left-[5vw] landscape:flex">
        <p className="flex min-w-0 whitespace-nowrap">
          <span className="min-w-0 truncate">{view.groupName}</span>
          <span className="shrink-0">&nbsp;· {count}</span>
        </p>
        {progress}
      </footer>

      <FollowAlong view={view} count={count} progress={progress} />

      {(controls || listToggle) && (
        <footer className="z-10 flex flex-col gap-3 px-5 pt-4 landscape:absolute landscape:right-[5vw] landscape:bottom-[5vh] landscape:max-w-[60vw] landscape:flex-row landscape:items-end landscape:p-0">
          {listToggle}
          {controls}
        </footer>
      )}

      <header className="z-10 flex flex-wrap items-center justify-between gap-2 px-5 pt-6 pb-8 portrait:mt-auto landscape:absolute landscape:inset-x-[5vw] landscape:top-[5vh] landscape:p-0">
        {tools}
      </header>
    </div>
  );
}

function FollowAlong({ view, count, progress }: { view: StageView; count: React.ReactNode; progress: React.ReactNode }) {
  const revealed: StagePair[] =
    view.status === "REVEALED"
      ? (view.pairs ?? [])
      : view.slips
          .filter((s) => s.giverName && s.receiverName)
          .sort((a, b) => a.index - b.index)
          .map((s) => ({ giverCodename: s.codename ?? "", giverName: s.giverName!, receiverName: s.receiverName! }));
  const shown = view.status === "REVEALED" ? revealed : revealed.slice(-PHONE_RECENT);
  const folded = view.total - view.step;

  return (
    <div className="relative flex flex-col gap-3.5 px-5 pt-6 landscape:hidden">
      <Art name="parol" className="pointer-events-none absolute top-0 right-5 h-[108px] w-[76px]" />
      <p className="pr-24 font-bold text-ilaw">
        {view.groupName}
        <br />
        {count}
      </p>

      <section aria-label="Reveal" aria-live="polite" className="mt-4 flex flex-col gap-1.5">
        {view.status === "DRAWN" && (
          <>
            <h1 className="font-head text-[44px] leading-[1.05]">Handa na?</h1>
            <p className="text-[22px] leading-[1.25] font-bold">
              {view.total} slips, {view.total} sikreto. Abangan sa screen.
            </p>
            <p className="mt-2 text-gabi-text">Dito mo rin makikita ang bawat reveal habang nangyayari.</p>
          </>
        )}
        {view.status === "REVEALING" && view.pair && (
          <>
            <p className="text-[18px] font-bold text-gabi-text">Si {view.pair.giverCodename} ay si…</p>
            <p className="font-hand text-[clamp(56px,20vw,92px)] leading-none break-words text-ilaw">{view.pair.giverName}!</p>
            <p className="mt-1 font-head text-[22px]">
              Ang monito niya: <span className="nm">{view.pair.receiverName}</span>
            </p>
          </>
        )}
        {view.status === "REVEALED" && (
          <>
            <h1 className="font-head text-[44px] leading-[1.05]">Maligayang Pasko!</h1>
            <p className="text-[22px] leading-[1.25] font-bold">Buo na ang parol. Bigayan na ng regalo!</p>
          </>
        )}
      </section>

      {shown.length > 0 && (
        <section aria-labelledby="revealed-title" className="mt-3 flex flex-col gap-3">
          <h2 id="revealed-title" className="font-head text-[22px]">
            Nabunyag na
          </h2>
          <ol aria-label={view.status === "REVEALED" ? "All pairs" : "Nabunyag na"} className="grid grid-cols-2 gap-3">
            {shown.map((p) => (
              <li key={`${p.giverName}-${p.receiverName}`} className="flex min-w-0 flex-col items-center bg-papel px-2 py-1.5 text-center text-ube">
                <span className="max-w-full truncate font-hand text-[24px] leading-tight">{p.giverName}</span>
                <span className="max-w-full truncate text-[14px] font-bold">
                  → kay <span className="nm">{p.receiverName}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
      {view.status === "REVEALING" && folded > 0 && (
        <p className="text-gabi-text">
          {revealed.length > PHONE_RECENT && `Huling ${PHONE_RECENT} lang ang ipinapakita. `}
          {folded} pa ang nakatiklop.
        </p>
      )}
      {progress && <div className="text-small font-bold text-gabi-text">{progress}</div>}
    </div>
  );
}
