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

/** Shown on the device of a member the organizer removed. No join button. */
export function RemovedNotice() {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-[0_1px_2px_rgb(31_27_77/0.06),0_4px_16px_rgb(31_27_77/0.06)]">
      <p className="font-heading text-title font-extrabold">
        Tinanggal ka ng organizer sa group na &apos;to.
      </p>
      <p className="mt-2 text-muted-foreground">Kung mali ito, kausapin ang organizer.</p>
    </div>
  );
}

export function PageFallback() {
  return <p className="text-muted-foreground">Sandali lang…</p>;
}
