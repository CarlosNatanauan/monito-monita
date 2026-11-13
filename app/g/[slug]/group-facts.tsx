import { Card, CardDescription, CardTitle, DetailRow, DetailRows } from "@/components/ui/card";
import { formatPartyDate, formatPeso, joinedCount } from "@/lib/format";

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
export function RemovedNotice() {
  return (
    <Card>
      <CardTitle>Tinanggal ka ng organizer sa group na &apos;to.</CardTitle>
      <CardDescription>Kung mali ito, kausapin ang organizer.</CardDescription>
    </Card>
  );
}

export function PageFallback() {
  return <p className="text-ube-soft">Sandali lang…</p>;
}
