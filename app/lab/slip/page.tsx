import type { Metadata } from "next";
import { SlipLab } from "./slip-lab";

// Prototype for tuning the slip unfold. Not linked from anywhere, no database.
export const metadata: Metadata = {
  title: "Slip lab · Monito Monita",
  robots: { index: false, follow: false },
};

export default function SlipLabPage() {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-8 px-4 py-10">
      <SlipLab />
    </main>
  );
}
