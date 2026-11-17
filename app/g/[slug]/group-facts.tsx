import { Art } from "@/components/art/symbols";
import { LostSlip } from "@/components/state-art";
import { Button } from "@/components/ui/button";
import { Capiz, SectionTitle, Tag, Tags } from "@/components/ui/paper";
import { formatPartyDate, formatPartyDay, formatPeso } from "@/lib/format";

/**
 * The group's facts as gift tags (docs/DESIGN.md, "Tags"): gold = party
 * date, pink = budget, green = member count. One fact per tag.
 */
export function GroupFacts({
  partyDate,
  budget,
  memberCount,
  year = false,
  memberSuffix = " na",
  className,
}: {
  partyDate: string;
  budget: number;
  memberCount?: number;
  /** "Sat, Dec 19, 2026" instead of "Sat, Dec 19". */
  year?: boolean;
  /** "12 na" while joining, "12" once it's closed. */
  memberSuffix?: string;
  className?: string;
}) {
  return (
    <Tags className={className}>
      <Tag tone="gold" label="Party">
        {year ? formatPartyDate(partyDate) : formatPartyDay(partyDate)}
      </Tag>
      <Tag tone="pink" label="Budget">
        {formatPeso(budget)}
      </Tag>
      {memberCount !== undefined && (
        <Tag tone="green" label="Kasali">
          {memberCount === 0 ? "Wala pa" : `${memberCount}${memberSuffix}`}
        </Tag>
      )}
    </Tags>
  );
}

/** A heading with the parol beside it (join, ready). */
export function WithParol({ children }: { children: React.ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">{children}</div>
      <Art name="parol" className="-mt-[18px] h-[102px] w-[72px] shrink-0 lg:-mt-10 lg:h-[170px] lg:w-[120px]" />
    </header>
  );
}

/*
 * Link states (docs/DESIGN.md, "In-between states"): each says what
 * happened and what to do next. Plain <a> links, never next/link, so /me
 * keeps its JS budget.
 */

/** Shown on the device of a member the organizer removed. No join button. */
export function RemovedNotice({ className }: { className?: string }) {
  return (
    <Capiz className={className} aria-labelledby="removed-title">
      <SectionTitle id="removed-title">Wala ka na sa group na &apos;to</SectionTitle>
      <p>Tinanggal ka ng organizer, kaya sarado na sa&apos;yo ang slip at wishlist dito.</p>
      <p className="text-small text-ube-soft">Kung mali, i-message ang organizer. Sila lang ang makakapag-ayos nito.</p>
      <Button asChild variant="secondary" className="self-start">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- plain link: /me ships no next/link (JS budget) */}
        <a href="/">Bumalik sa home</a>
      </Button>
    </Capiz>
  );
}

/**
 * A personal link (or this device's saved login) that no longer works:
 * usually the organizer issued a new one ("Get new link"). Coming back
 * with name + PIN works; without a PIN, the new link from the organizer.
 */
export function OldLinkNotice({ slug }: { slug: string }) {
  return (
    <>
      <LostSlip />
      <Capiz aria-labelledby="old-link-title">
        <SectionTitle id="old-link-title">Hindi na gumagana ang link na &apos;to</SectionTitle>
        <p>Baka gumawa na ng bagong link ang organizer para sa&apos;yo. Pag ganoon, hindi na bubukas ang luma.</p>
        <Button asChild className="w-full lg:w-fit">
          <a href={`/g/${slug}?bumalik=1`}>Bumalik gamit ang PIN</a>
        </Button>
        <p className="text-small text-ube-soft">Walang PIN o nakalimutan? Hingin ang bagong link sa organizer.</p>
      </Capiz>
    </>
  );
}

/**
 * The group is gone, and this browser had been in it: a demo that expired
 * (or was reset). Only demo groups are ever deleted.
 */
export function GoneGroupNotice() {
  return (
    <>
      <LostSlip />
      <h1 className="font-head text-display lg:text-display-lg">Tapos na ang demo na &apos;to</h1>
      <p className="lg:text-[19px]">Nabubura ang demo groups after 24 hours, o pag ni-reset. Gawa ka ng bago, mga 2 minuto lang.</p>
      <div className="flex flex-col gap-2.5 lg:flex-row">
        <Button asChild className="w-full lg:w-fit">
          <a href="/demo">Simulan ulit ang demo</a>
        </Button>
        <Button asChild variant="secondary" className="w-full lg:h-[60px] lg:w-fit">
          <a href="/new">Gumawa ng totoong group</a>
        </Button>
      </div>
    </>
  );
}

/** The wordmark as a plain link home (pages that must not pull in next/link). */
export function PlainBrand() {
  return (
    // eslint-disable-next-line @next/next/no-html-link-for-pages -- plain link: /me ships no next/link (JS budget)
    <a href="/" className="w-fit rounded-paper font-head text-brand focus-ring lg:py-1.5 lg:text-brand-lg">
      Monito Monita
    </a>
  );
}
