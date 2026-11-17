"use client";

import { fontVariables } from "./fonts";
// No CSS import: the layout's stylesheet stays in <head> once loaded (React keeps
// stylesheet resources), and a CSS import here grew every page's JS by ~1.5 KB.

/*
 * Something broke (docs/DESIGN.md, "In-between states"): the one error
 * boundary, for every page. Never the raw error: what happened in plain
 * words, "Subukan ulit" (re-fetches and re-renders) and a full load home.
 * A dropped connection gets its own words.
 *
 * Self-contained on purpose (no Button, no cn): its code ships with every
 * page, in place of Next's built-in error screen, and /me has a 150 KB JS
 * budget. The classes match the primary and secondary buttons.
 */
const BTN =
  "inline-flex w-full cursor-pointer items-center justify-center rounded-btn focus-ring transition-transform duration-100 active:scale-[0.98] lg:w-fit";

export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  return (
    <html lang="en" className={`h-full antialiased ${fontVariables}`}>
      <body className="flex min-h-full flex-col">
        <title>Ay, may sumabit · Monito Monita</title>
        <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-[18px] px-5 pt-10 pb-12 lg:pt-16">
          <div aria-hidden className="es-slip" />
          <h1 className="font-head text-display lg:text-display-lg">{offline ? "Nawala ang signal" : "Ay, may sumabit."}</h1>
          <p className="lg:text-[19px]">
            {offline
              ? "Hindi ma-load ang page na 'to nang walang internet. Subukan ulit pag may signal na."
              : "May hindi gumana sa side namin. Ligtas ang group at ang slip mo, subukan lang ulit."}
          </p>
          <div className="flex flex-col gap-2.5 lg:flex-row">
            <button type="button" onClick={retry} autoFocus className={`${BTN} h-[58px] bg-ube px-[26px] font-head text-button text-white lg:h-[60px]`}>
              Subukan ulit
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full load: the app just failed */}
            <a href="/" className={`${BTN} h-12 border-[1.5px] border-ube bg-papel px-[18px] font-bold text-ube lg:h-[60px]`}>
              Bumalik sa home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
