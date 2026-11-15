import { Art } from "@/components/art/symbols";
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

/** Shown on the device of a member the organizer removed. No join button. */
export function RemovedNotice({ className }: { className?: string }) {
  return (
    <Capiz className={className}>
      <SectionTitle>Tinanggal ka ng organizer sa group na &apos;to.</SectionTitle>
      <p className="text-ube-soft">Kung mali ito, kausapin ang organizer.</p>
    </Capiz>
  );
}

export function PageFallback() {
  return <p className="text-ube-soft">Sandali lang…</p>;
}
