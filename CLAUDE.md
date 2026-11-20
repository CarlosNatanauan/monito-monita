# CLAUDE.md

Instructions for AI coding assistants working in this repo.

@AGENTS.md

## Project

Monito Monita: a web app for running Filipino exchange gift groups (draw names, wishlists, theme weeks, reveal). Read `docs/PRODUCT.md`, `docs/DESIGN.md`, `docs/TECH.md`, and `docs/ROADMAP.md` before starting work.

## Priorities

1. **Ship by Nov 28, 2026.** Prefer the simplest working solution.
2. **Never leak pairs.** Before a group is `REVEALED`, no response may reveal who is giving to whom, except a member's own receiver.
3. **Mobile first.** Most users open links from Messenger on a phone.

## Rules

- TypeScript strict mode. No `any` unless truly needed.
- Validate all inputs on the server with Zod.
- Business logic goes in `server/`, not in components.
- The draw algorithm in `server/draw.ts` must be pure and covered by tests in `tests/draw.test.ts`.
- Store only hashes of tokens, never raw tokens.
- Don't add new libraries or services beyond the stack in `docs/TECH.md` without a clear reason.
- Don't build features marked "Later" or "Future" in the docs unless asked.
- Keep UI copy short, warm, and a little Taglish.

## Design rules

- Follow `docs/DESIGN.md`: its colors, type, and the bunutan (paper slip) motif.
- Heavy animation only in the 4 signature moments. Everywhere else, motion only responds to user actions. (One exception: the decorative light string: controller modes on the landing and /me, a calm twinkle on forms; opacity only on 4 layers, about 1 flash/s per bulb at most, nothing under reduced motion.)
- Animate only `transform` and `opacity`. Lazy-load animation code (GSAP, Rive, confetti) only on the screens that use it.
- CSS transitions and Web Animations for everyday UI motion; GSAP for the signature timelines. Don't mix both on the same element.
- Always respect `prefers-reduced-motion`.
- Gochi Hand is only for names on slips and codenames.
- Restyle shadcn/ui components; don't ship the default look.

## Commands

Keep this list updated as scripts are added.

- `npm run dev`: start dev server
- `npm run build`: production build
- `npm run lint`: lint
- `npm test`: run unit tests once (Vitest)
- `npm run test:watch`: unit tests in watch mode
- `npx vitest run tests/draw.test.ts`: run a single test file (on Windows run Vitest from PowerShell; in Git Bash its fork pool fails every file with "reading 'config'")
- `npx playwright test layouts --project=laptop-1366`: just the 10-size layout sweep
- `npm run test:db`: database constraint smoke tests against the dev DB in `.env.local` (rolled back; never run against production)
- `npm run test:e2e`: Playwright main flow in four specs (`e2e/flow-1-setup-join`, `flow-2-draw-slip`, `flow-3-organizer`, `flow-4-reveal`; 2–4 start from groups seeded by `e2e/seed.ts`) on Pixel 7 (Chromium), iPhone 14 (WebKit) and a 1366×768 laptop (`laptop-1366`, which also runs `e2e/layouts.spec.ts`: every page at 10 sizes from 360×740 to 1920×1080, including 1032×1376 and 1180×800, screenshots in `e2e/screenshots/layouts/`), plus the party reveal on a 1920×1080 projector laptop (`e2e/reveal.spec.ts`, also checks 1366×768 and 1280×720; `--project=projector-1080p` runs just that), plus `e2e/landing.spec.ts` (direction 1a: the poster and "Create your group" above the 1366×657 and 390×664 folds, the poster as the largest paint, no `<video>` or video request before the press, its keyboard button and focus ring, playing in place or full screen and back to the poster, no layout shift, the footer; the small bowl on "Paano 'to?": its code loads only on the bowl (not on scroll or idle), a tap before it arrives still plays, the opened slip covers no text; phones and laptop), `e2e/persona-fixes.spec.ts` (the Nov 16 persona-test fixes, phones and laptop), `e2e/states.spec.ts` (the in-between states: loading without JS, pending, the demo's "Inihahanda", optimistic wishlist and roll-back, offline and recovery, 404, old link, removed, expired demo, icons and manifest; phones and laptop), `e2e/demo.spec.ts` (the one-click demo end to end, phones and laptop; the reveal QR on the laptop) and `e2e/slow-phone.spec.ts` (Join and come-back tapped before hydration on a throttled Chromium phone; /new keeps everything typed before it hydrates, at 6x CPU throttling; personal-link tokens never in a Referer), against `npm run dev` (reuses a running dev server on :3000) and the dev DB; deletes its test groups; screenshots in `e2e/screenshots/`. Specs import `test` and `expect` from `e2e/test.ts`, which closes every browser context a test opened (left-over pages slow down later specs in the same worker). After `npm run build`, stop any running dev server first: a reused dev server that predates the build serves 500s
- `npx playwright test demo --project=laptop-1366`: just the demo path on the laptop
- `GET /api/cron/demo-cleanup` with `Authorization: Bearer $CRON_SECRET`: the daily demo cleanup (Vercel Cron, `vercel.json`)
- `npm run db:generate`: generate a SQL migration in `drizzle/` from `server/db/schema.ts` (commit it)
- `npm run db:migrate`: apply pending migrations to the database in `DATABASE_URL` (`.env.local` = Neon dev branch)
- `npm run db:migrate:prod`: apply migrations to PRODUCTION, using only `.env.prod-migrate.local` (a name Next.js never loads, so a local `next dev`/`next start` can't reach production; never put production credentials in `.env.production.local`, and the script refuses to run while that file exists); shows host and pending migrations and asks for confirmation. The human runs this, never the AI assistant.
- `npm run db:studio`: browse the database in Drizzle Studio
- `node scripts/perf/slip-perf.mjs http://localhost:3100`: slip unfold frame rate at 4x CPU throttling, lazy-GSAP, reduced-motion, and noindex checks on `/lab/slip`. Run against a production build (`npm run build && npx next start -p 3100`), not `next dev`
- `node scripts/perf/landing-perf.mjs http://localhost:3100`: landing bowl draw (the small bowl on "Paano 'to?": mix, rise, unfold) frame rate at 4x CPU throttling, GSAP not in the first load nor after idle or scrolling to the bowl, reduced motion (no shake or tumble), a new mix after every tap, static page. Production build, like slip-perf
- `node scripts/perf/lights-perf.mjs http://localhost:3100`: the light string on the landing and /me: each controller mode's frame rate at 4x CPU throttling, animation count (4, opacity only), flash rate per bulb and for the whole string, the "Palitan ang ilaw" button, never dark (off still glows), first paint lit with JavaScript off, the 8s auto cycle starting by itself on WebKit and Chromium (also after loading hidden), hidden = steady and lit, recovery from a missed "visible again" event, calm twinkle on forms, reduced motion. Creates an "E2E Lights perf" group in the dev DB. Production build, like slip-perf
- `node scripts/perf/js-weight.mjs http://localhost:3100`: JS on the wire (compressed, first load, Pixel 7) for the join page and /me against the 150 KB budget; creates an "E2E JS weight" group in the dev DB. `VERBOSE=1` lists each file and flags prefetches. Production build, like slip-perf
- Lighthouse (mobile) on the landing: `CHROME_PATH=<playwright chromium> npx -y lighthouse@12 http://localhost:3100/ --only-categories=performance,accessibility,best-practices,seo --quiet --chrome-flags="--headless=new"` against the production build
- `node scripts/perf/reveal-perf.mjs http://localhost:3100 [--gpu]`: party reveal frame rate (Next for 12 and 30, Previous, the finale) at 2x CPU throttling on a 1920×1080 laptop, lazy GSAP and confetti, reduced motion, every transition ending exactly on the fresh-load state, noindex. `--gpu` turns on GPU compositing (headless software compositing overstates the finale's full-screen layers). Production build, like slip-perf
- `node scripts/landing/make-poster.mjs video/out/landing-poster.png`: the landing video's poster (WebP, 1280×720, 800×450 and 640×360) into `public/landing/`, from the Remotion still (`cd video && npx remotion still LandingPoster out/landing-poster.png`)
- `node scripts/icons/make-icons.mjs`: regenerate the parol icons (`app/icon.svg`, `app/favicon.ico`, `app/apple-icon.png`, `public/icons/`) after changing the parol
- `/lab/lights`: progress lights at 3–150 members (no database)
- `/lab/reveal?n=12&step=7`: the party reveal with made-up names (no database): `n` 3–150, `step` 0 (before the start) to `n`, `n+1` for after the finale, `speed=0.1` to slow the timelines
- `node scripts/perf/slip-frames.mjs [baseUrl] [outDir]`: screenshots of the slip unfold at fixed timeline points (`TIMES=0.3,1.5` to pick), into `test-results/slip-frames/` by default
- Demo video (`video/`, a separate Remotion project with its own `package.json`; see `video/README.md`): `cd video && npm run studio` (preview), `npm run render` (`out/monito-monita-demo.mp4`, loudness-normalized), `npm run render:loop` (README loop: `out/monito-monita-loop.webm` and a GIF under 5 MB), `npm run render:web` (the landing's MP4s, 1080p and 720p, into `public/landing/`, from `out/monito-monita-demo.mp4`), `npm run render:preview` (half-size check), `npm run audio` (music edit and synthesized sound effects)
- `npx tsx video/scripts/record/record.ts all`: records the app for the video (frame by frame on a virtual clock) against a production build on :3100 built with `NEXT_PUBLIC_SITE_URL=https://monitomonita-ph.vercel.app`, seeding "Barkada Christmas 2026" in the dev DB; `... record.ts cleanup` deletes it

Database notes: use `db()` from `server/db` for everything (node-postgres pool, attached with `attachDatabasePool` for Vercel); use `db().transaction(...)` when writes must succeed or fail together. Exclusion pairs must be stored sorted (`member_a_id < member_b_id`).
