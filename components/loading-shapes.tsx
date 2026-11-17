import { Art } from "@/components/art/symbols";
import { Lights, openedStates } from "@/components/lights";
import { colClass, colsClass } from "@/components/page";
import { Capiz } from "@/components/ui/paper";
import { cn } from "@/lib/utils";

/*
 * Loading placeholders (docs/DESIGN.md, "In-between states"): the page's
 * own materials, empty, while its data streams in: the listahan with blank
 * lines, the slip panel with a dashed slip outline, unlit tags and bulbs.
 * One short line says what's happening. Server-only markup and CSS: no JS
 * (on /me that matters, at the edge of its 150 KB budget), no spinners,
 * no grey bars, no motion.
 */

/** The one line of copy, announced once (role="status"). */
function Note({ title, line, className }: { title?: string; line: string; className?: string }) {
  return (
    <div role="status" className={cn("flex flex-col gap-1", className)}>
      <p className="font-head text-display lg:text-display-lg">{title ?? "Sandali lang…"}</p>
      <p className="text-ube-soft">{line}</p>
    </div>
  );
}

/** Blank listahan lines: the rules do the drawing. */
function Lines({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="lst-row" />
      ))}
    </>
  );
}

/**
 * A listahan with its title and blank lines. Not the Listahan component:
 * its title is a card title, and a placeholder isn't a card.
 */
function BlankList({ title, lines, className }: { title: string; lines: number; className?: string }) {
  return (
    <div aria-hidden className={cn("listahan min-w-0", className)}>
      <p className="lst-title text-ube-soft lg:text-section-lg">{title}</p>
      <Lines count={lines} />
    </div>
  );
}

/** A gift tag with its label and no value yet. */
function EmptyTag({ tone, label }: { tone: "gold" | "pink" | "green"; label: string }) {
  const bg = { gold: "bg-ilaw-lit -rotate-2", pink: "bg-tag-pink rotate-2", green: "bg-tag-green -rotate-1" }[tone];
  return (
    <div className={cn("gift-tag", bg)}>
      <p className="text-tag font-bold">{label}</p>
      <p className="font-head text-[19px] leading-[1.15] text-ube-soft">…</p>
    </div>
  );
}

/** Four empty PIN boxes, as on the join form. */
function PinBoxes() {
  return (
    <div className="flex h-10 items-start gap-2.5">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="h-[44px] w-[40px] rounded-[4px] border-[1.5px] border-ube-line bg-papel" />
      ))}
    </div>
  );
}

/** Join, come back, closed: the group's tags left, the listahan form right. */
export function JoinFallback() {
  return (
    <div className={cn(colsClass, "lg:pt-2.5")} aria-busy="true" data-loading="join">
      <div className={cn(colClass, "lg:col-start-1 lg:row-start-1")}>
        <header className="flex items-start justify-between gap-3">
          <Note line="Binubuksan ang listahan ng group." />
          <Art name="parol" className="-mt-[18px] h-[102px] w-[72px] shrink-0 lg:-mt-10 lg:h-[170px] lg:w-[120px]" />
        </header>
        <div className="flex flex-wrap gap-x-3 gap-y-2.5">
          <EmptyTag tone="gold" label="Party" />
          <EmptyTag tone="pink" label="Budget" />
          <EmptyTag tone="green" label="Kasali" />
        </div>
      </div>
      <div className={cn(colClass, "lg:col-start-2 lg:row-start-1")}>
        <div aria-hidden className="listahan">
          <p className="lst-row font-bold text-ube-soft">Isulat ang pangalan mo</p>
          <p className="lst-label">Pangalan mo</p>
          <div className="lst-row" />
          <p className="lst-label">4-digit PIN</p>
          <PinBoxes />
          <div className="lst-row" />
        </div>
      </div>
    </div>
  );
}

/**
 * /me: the evening sky with an empty string and a dashed slip outline
 * (the slip isn't here yet), then a blank wishlist.
 */
export function MeFallback() {
  return (
    <div className={colsClass} aria-busy="true" data-loading="me">
      <div className={cn(colClass, "lg:col-start-1 lg:row-start-1")}>
        <Note line="Hinahanap ang slip mo." />
        <div aria-hidden className="sky relative isolate h-[340px] overflow-hidden rounded-sky lg:h-[440px] lg:rounded-sky-lg">
          <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="absolute top-[84px] left-0 h-[60px] w-full lg:top-[92px] lg:h-[76px]" focusable="false">
            <path d="M0 8 Q200 60 400 8" fill="none" stroke="#fff" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
          </svg>
          <Art name="parol" className="absolute top-0 right-2.5 h-[119px] w-[84px] lg:right-[18px] lg:h-[156px] lg:w-[110px]" />
          <Art name="clothespin" className="absolute top-[112px] left-[calc(50%-8px)] h-[46px] w-4 lg:top-[134px] lg:left-[calc(50%-9px)] lg:h-[52px] lg:w-[18px]" />
          <div className="absolute top-[150px] left-[calc(50%-90px)] h-24 w-[180px] -rotate-[4deg] border-[1.5px] border-dashed border-ube-line lg:top-[176px] lg:left-[calc(50%-101px)] lg:h-[108px] lg:w-[202px]" />
        </div>
      </div>
      <div className={cn(colClass, "lg:col-start-2 lg:row-start-1")}>
        <div aria-hidden className="flex flex-wrap gap-x-3 gap-y-2.5">
          <EmptyTag tone="gold" label="Party" />
          <EmptyTag tone="pink" label="Budget" />
        </div>
        <BlankList title="Wishlist mo" lines={4} />
      </div>
    </div>
  );
}

/** The organizer page: the join count's unlit bulbs on a capiz card, a blank members listahan. */
export function AdminFallback() {
  return (
    <div
      className="flex flex-col gap-[18px] min-[840px]:grid min-[840px]:grid-cols-[minmax(0,1fr)_340px] min-[840px]:items-start min-[840px]:gap-x-8 min-[840px]:gap-y-[22px] lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-x-12"
      aria-busy="true"
      data-loading="admin"
    >
      <div className="flex min-w-0 flex-col gap-[18px] lg:gap-[22px]">
        <Note line="Binibilang ang mga kasali." />
        <Capiz aria-hidden>
          <Lights
            plan={openedStates(0, 12)}
            label={<p className="font-head text-section text-ube-soft lg:text-section-lg">Ilan na kaya?</p>}
            rowClassName="mx-auto h-9 w-full max-w-[420px] lg:h-[52px]"
          />
          <div className="h-[46px] rounded-paper border-[1.5px] border-dashed border-ube-line bg-papel" />
        </Capiz>
      </div>
      <BlankList title="Members" lines={6} className="min-[840px]:col-start-2 min-[840px]:row-start-1" />
    </div>
  );
}

/** The reveal: the dim parol frame on the night, and one line. */
export function RevealFallback() {
  return (
    <div className="rv-screen flex flex-1 flex-col items-center justify-center gap-5 px-5 py-10 text-center text-white" aria-busy="true" data-loading="reveal">
      <Art name="parol-outline" className="size-[min(40vh,320px)] text-[#3D2A68]" />
      <div role="status" className="flex flex-col gap-1">
        <p className="font-head text-display lg:text-display-lg">Sandali lang…</p>
        <p className="text-gabi-text">Inaayos ang entablado para sa reveal.</p>
      </div>
    </div>
  );
}
