import { CalendarDays, Gift, Users } from "lucide-react";
import { formatPartyDate, formatPeso, joinedCount } from "@/lib/format";

/** Party date, budget, and (optionally) how many have joined. */
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
    <ul className="flex flex-col gap-2 text-muted-foreground">
      <li className="flex items-center gap-2">
        <CalendarDays className="size-5 shrink-0" aria-hidden />
        <span>Party: {formatPartyDate(partyDate)}</span>
      </li>
      <li className="flex items-center gap-2">
        <Gift className="size-5 shrink-0" aria-hidden />
        <span>Budget: {formatPeso(budget)}</span>
      </li>
      {memberCount !== undefined && (
        <li className="flex items-center gap-2">
          <Users className="size-5 shrink-0" aria-hidden />
          <span>{joinedCount(memberCount)}</span>
        </li>
      )}
    </ul>
  );
}

export function PageFallback() {
  return <p className="text-muted-foreground">Sandali lang…</p>;
}
