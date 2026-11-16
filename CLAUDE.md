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
- Motion for everyday UI motion; GSAP for the signature timelines. Don't mix both on the same element.
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
- `npx playwright test layouts --project=laptop-1366`: just the 8-size layout sweep
- `npm run test:db`: database constraint smoke tests against the dev DB in `.env.local` (rolled back; never run against production)
- `npm run test:e2e`: Playwright main flow in four specs (`e2e/flow-1-setup-join`, `flow-2-draw-slip`, `flow-3-organizer`, `flow-4-reveal`; 2–4 start from groups seeded by `e2e/seed.ts`) on Pixel 7 (Chromium), iPhone 14 (WebKit) and a 1366×768 laptop (`laptop-1366`, which also runs `e2e/layouts.spec.ts`: every page at 8 sizes from 360×740 to 1920×1080, screenshots in `e2e/screenshots/layouts/`), plus the party reveal on a 1920×1080 projector laptop (`e2e/reveal.spec.ts`, also checks 1366×768 and 1280×720; `--project=projector-1080p` runs just that), against `npm run dev` (reuses a running dev server on :3000) and the dev DB; deletes its test groups; screenshots in `e2e/screenshots/`. Specs import `test` and `expect` from `e2e/test.ts`, which closes every browser context a test opened (left-over pages slow down later specs in the same worker). After `npm run build`, stop any running dev server first: a reused dev server that predates the build serves 500s
- `npm run db:generate`: generate a SQL migration in `drizzle/` from `server/db/schema.ts` (commit it)
- `npm run db:migrate`: apply pending migrations to the database in `DATABASE_URL` (`.env.local` = Neon dev branch)
- `npm run db:migrate:prod`: apply migrations to PRODUCTION, using only `.env.prod-migrate.local` (a name Next.js never loads, so a local `next dev`/`next start` can't reach production; never put production credentials in `.env.production.local`, and the script refuses to run while that file exists); shows host and pending migrations and asks for confirmation. The human runs this, never the AI assistant.
- `npm run db:studio`: browse the database in Drizzle Studio
- `node scripts/perf/slip-perf.mjs http://localhost:3100`: slip unfold frame rate at 4x CPU throttling, lazy-GSAP, reduced-motion, and noindex checks on `/lab/slip`. Run against a production build (`npm run build && npx next start -p 3100`), not `next dev`
- `node scripts/perf/landing-perf.mjs http://localhost:3100`: landing bowl draw (mix, rise, unfold) frame rate at 4x CPU throttling, GSAP not in the first load, reduced motion (no shake or tumble), a new mix after every tap, static page. Production build, like slip-perf
- `node scripts/perf/lights-perf.mjs http://localhost:3100`: the light string on the landing and /me: each controller mode's frame rate at 4x CPU throttling, animation count (4, opacity only), flash rate per bulb and for the whole string, the "Palitan ang ilaw" button, never dark (off still glows), first paint lit with JavaScript off, the 8s auto cycle starting by itself on WebKit and Chromium (also after loading hidden), hidden = steady and lit, recovery from a missed "visible again" event, calm twinkle on forms, reduced motion. Creates an "E2E Lights perf" group in the dev DB. Production build, like slip-perf
- `node scripts/perf/js-weight.mjs http://localhost:3100`: JS on the wire (compressed, first load, Pixel 7) for the join page and /me against the 150 KB budget; creates an "E2E JS weight" group in the dev DB. `VERBOSE=1` lists each file and flags prefetches. Production build, like slip-perf
- Lighthouse (mobile) on the landing: `CHROME_PATH=<playwright chromium> npx -y lighthouse@12 http://localhost:3100/ --only-categories=performance,accessibility,best-practices,seo --quiet --chrome-flags="--headless=new"` against the production build
- `node scripts/perf/reveal-perf.mjs http://localhost:3100 [--gpu]`: party reveal frame rate (Next for 12 and 30, Previous, the finale) at 2x CPU throttling on a 1920×1080 laptop, lazy GSAP and confetti, reduced motion, every transition ending exactly on the fresh-load state, noindex. `--gpu` turns on GPU compositing (headless software compositing overstates the finale's full-screen layers). Production build, like slip-perf
- `/lab/lights`: progress lights at 3–150 members (no database)
- `/lab/reveal?n=12&step=7`: the party reveal with made-up names (no database): `n` 3–150, `step` 0 (before the start) to `n`, `n+1` for after the finale, `speed=0.1` to slow the timelines
- `node scripts/perf/slip-frames.mjs [baseUrl] [outDir]`: screenshots of the slip unfold at fixed timeline points (`TIMES=0.3,1.5` to pick), into `test-results/slip-frames/` by default

Database notes: use `db()` from `server/db` for everything (node-postgres pool, attached with `attachDatabasePool` for Vercel); use `db().transaction(...)` when writes must succeed or fail together. Exclusion pairs must be stored sorted (`member_a_id < member_b_id`).
