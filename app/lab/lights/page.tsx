import type { Metadata } from "next";
import { joinStates, Lights, openedStates } from "@/components/lights";
import { Card, CardTitle } from "@/components/ui/card";

// The organizer's progress lights at different group sizes. Not linked
// from anywhere, no database.
export const metadata: Metadata = {
  title: "Lights lab · Monito Monita",
  robots: { index: false, follow: false },
};

const SIZES = [3, 12, 13, 24, 40, 150];

export default function LightsLabPage() {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-4 px-5 pt-8 pb-14">
      {SIZES.map((n) => (
        <Card key={`join-${n}`}>
          <Lights plan={joinStates(n)} label={<CardTitle>{n} na ang sumali</CardTitle>} />
        </Card>
      ))}
      {SIZES.map((n) => {
        const opened = Math.round(n * 0.6);
        return (
          <Card key={`opened-${n}`}>
            <Lights
              plan={openedStates(opened, n)}
              label={
                <p className="font-bold">
                  {opened} of {n} have opened their slip
                </p>
              }
            />
          </Card>
        );
      })}
    </main>
  );
}
