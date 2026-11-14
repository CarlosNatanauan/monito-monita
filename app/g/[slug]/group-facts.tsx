import { Card, CardDescription, CardTitle, DetailRow, DetailRows } from "@/components/ui/card";
import { formatPartyDate, formatPeso, joinedCount } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Party date, budget, and (optionally) how many have joined, as detail rows. */
export function GroupFacts({
  partyDate,
  budget,
  memberCount,
}: {
  partyDate: string;
  budget: number;
  memberCount?: number;
}) {
  return (
    <DetailRows>
      <DetailRow label="Party">{formatPartyDate(partyDate)}</DetailRow>
      <DetailRow label="Budget">{formatPeso(budget)}</DetailRow>
      {memberCount !== undefined && <DetailRow label="Kasali">{joinedCount(memberCount)}</DetailRow>}
    </DetailRows>
  );
}

/** Shown on the device of a member the organizer removed. No join button. */
export function RemovedNotice({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardTitle>Tinanggal ka ng organizer sa group na &apos;to.</CardTitle>
      <CardDescription>Kung mali ito, kausapin ang organizer.</CardDescription>
    </Card>
  );
}

export function PageFallback() {
  return <p className="text-ube-soft">Sandali lang…</p>;
}

/**
 * The join and come-back layout. Phones: the group info, then the form,
 * stacked (each part styles itself). From md: one centred white card in
 * two parts, the group info on the left and the form on the right, split
 * by the dashed row line.
 */
export function SplitCard({ info, children, className }: { info: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 md:mx-auto md:mt-6 md:grid md:w-full md:max-w-[880px] md:grid-cols-2 md:gap-0 md:rounded-3xl md:bg-niyog",
        className,
      )}
    >
      <div className="flex flex-col gap-4 md:border-r-[1.5px] md:border-dashed md:p-8 lg:p-10">{info}</div>
      <div className="flex flex-col gap-4 md:p-8 lg:p-10">{children}</div>
    </div>
  );
}

/** A card that becomes a plain half inside SplitCard from md. */
export const splitHalfClass = "md:rounded-none md:bg-transparent md:p-0";
