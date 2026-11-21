import { resetDemoAction } from "@/app/demo/actions";
import { Art } from "@/components/art/symbols";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEMO_BANNER } from "@/server/demo";

/*
 * Server-only on purpose: no client code and no next/link, so the guide
 * adds nothing to /me's JS (150 KB budget). "Reset demo" is a plain form
 * posting to a Server Action, which also works before hydration.
 */

export type DemoPage = "me" | "admin" | "reveal" | "join";


const STEPS: { page: Exclude<DemoPage, "join"> | "new"; label: string; hint?: string }[] = [
  { page: "me", label: "My slip", hint: "buksan ang slip mo" },
  { page: "admin", label: "Manage group", hint: "ang dashboard" },
  { page: "reveal", label: "Reveal", hint: "hanggang sa finale" },
  { page: "new", label: "Gumawa ng totoong group" },
];

const hrefOf = (slug: string, page: (typeof STEPS)[number]["page"]) => (page === "new" ? "/new" : `/g/${slug}/${page}`);

const linkClass = "rounded-paper font-bold underline decoration-[1.5px] underline-offset-[3px] focus-ring";

function ResetForm({ slug, className, buttonClassName }: { slug: string; className?: string; buttonClassName?: string }) {
  return (
    <form action={resetDemoAction} className={className}>
      <input type="hidden" name="slug" value={slug} />
      <button type="submit" className={buttonClassName}>
        Reset demo
      </button>
    </form>
  );
}

/**
 * On every demo page (/me, the organizer page): the gold tag "Demo group
 * 'to. Mabubura after 24 hours.", then a listahan with stars in the margin
 * (not numbered steps): open your slip, the organizer dashboard, the party
 * reveal, a real group. The page you're on says "nandito ka" instead of
 * linking. "Reset demo" rebuilds it fresh.
 */
export function DemoGuide({ slug, current, className }: { slug: string; current: DemoPage; className?: string }) {
  return (
    <aside aria-labelledby="demo-banner" className={cn("flex min-w-0 flex-col gap-2.5", className)} data-demo-guide>
      <p id="demo-banner" className="gift-tag -rotate-1 self-start bg-ilaw-lit text-small font-bold">
        {DEMO_BANNER}
      </p>
      <div className="listahan">
        <ul aria-label="Subukan sa demo">
          {STEPS.map((step) => (
            <li key={step.page} className="lst-row relative justify-start">
              <Art name="star" className="absolute top-[11px] -left-9 size-[18px]" />
              <span className="min-w-0 truncate">
                {step.page === current ? (
                  <strong aria-current="page">{step.label}</strong>
                ) : (
                  <a href={hrefOf(slug, step.page)} className={linkClass}>
                    {step.label}
                  </a>
                )}
                {step.page === current ? (
                  <span className="text-ube-soft"> · nandito ka</span>
                ) : (
                  step.hint && <span className="text-ube-soft"> · {step.hint}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
        <ResetForm
          slug={slug}
          className="lst-row justify-start"
          buttonClassName={cn(buttonVariants({ variant: "link" }), "h-11 px-0 text-body")}
        />
      </div>
    </aside>
  );
}

/**
 * The demo tag on the reveal screen, on the same row as "Back to organizer
 * page": a demo has at most 9 slips, and with 3 to 9 the ring leaves the
 * header row free left of the top slip (43vw) and above 16vh. At most two
 * lines, so it stays in that band.
 */
export function DemoRevealTag() {
  return (
    <p
      data-demo-guide
      className="gift-tag -rotate-1 self-start bg-ilaw-lit font-bold text-ube landscape:max-w-[17vw] landscape:text-[clamp(14px,1.8dvh,20px)]"
    >
      {DEMO_BANNER}
    </p>
  );
}

/** "My slip" and "Reset demo" on the reveal screen, with the sound and fullscreen tools (top right, clear of the ring). */
export function DemoRevealLinks({ slug }: { slug: string }) {
  return (
    <>
      <a href={`/g/${slug}/me`} className={cn(linkClass, "flex min-h-11 items-center px-2 text-gabi-text")}>
        My slip
      </a>
      <ResetForm slug={slug} className="contents" buttonClassName={cn(linkClass, "min-h-11 cursor-pointer px-2 text-gabi-text")} />
    </>
  );
}
