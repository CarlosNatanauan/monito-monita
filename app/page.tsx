import { Button } from "@/components/ui/button";

// Placeholder home page: shows the design foundation (colors, fonts, slip).
// The real landing page ("Try a bunutan") comes in Week 3.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col justify-center gap-10 px-4 py-12">
      <header className="flex flex-col gap-3">
        <h1 className="text-display text-simbang-gabi">Monito Monita</h1>
        <p className="text-title text-muted-foreground">
          Bunutan, wishlists, and the big reveal. Isang link lang.
        </p>
      </header>

      <div
        aria-label="Sample slip"
        className="self-center -rotate-2 rounded-sm bg-slip px-10 py-8 shadow-[0_1px_2px_rgb(31_27_77/0.08),0_8px_24px_rgb(31_27_77/0.10)]"
      >
        <p className="font-hand text-heading text-simbang-gabi">~ Ate Joy ~</p>
      </div>

      <Button type="button" size="lg" className="w-full">
        Create your group
      </Button>
    </main>
  );
}
