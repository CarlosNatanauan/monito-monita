<p align="center">
  <img src="docs/media/monito-monita-loop.gif" alt="Monito Monita: a group link shared in the GC, people join, the names are drawn, a slip unfolds, and the party reveal plays on a projector" width="720">
</p>

# Monito Monita

**The Filipino exchange gift, run from one link: draw names, share wishlists, play the theme weeks and do the reveal at the party. No app, no sign-up.**

**Live:** [monitomonita-ph.vercel.app](https://monitomonita-ph.vercel.app) · **[Try the demo](https://monitomonita-ph.vercel.app/demo)** (one click, no sign-up) · **[Watch the 51-second video](https://youtu.be/DBNKbfwfE50)**

## What it is

Every December, Filipino families, barkadas and offices run *Monito Monita*: a secret gift exchange. The names are drawn as a *bunutan* (folded paper slips pulled from a bowl), and in the weeks before the party there are theme weeks: "something soft", "something sweet", "something red". At the party, each person reveals who they had.

Today this runs on a Messenger group chat, a spreadsheet and someone's memory. Monito Monita puts it in one link that people open from the GC on their phones. The organizer creates the group; everyone else just taps the link.

## Features

- **Join with a name and a 4-digit PIN.** No accounts. A cookie keeps you signed in on that phone, and a personal link plus your PIN gets you back in on any other device.
- **Draw in one tap.** The organizer draws all the names at once. Each person opens their own slip, which unfolds on screen with the name written in ink. Nobody else, the organizer included, can see the pairs.
- **Wishlists and theme weeks.** You can see your monito's wishlist and this week's theme. The organizer gets ready-to-paste GC reminders.
- **Organizer tools.** Edit the details, set exclusions (no couples, no siblings), see who has opened their slip, unlock a PIN, reissue a lost link, remove a member.
- **Party reveal.** A projector screen shows a ring of slips that flip one by one as the lights travel along the gift loop, then the parol lights up. The organizer's phone works as the remote; a QR code on the screen opens it.
- **Demo mode.** One click creates a sandbox group: you and 8 made-up members, with wishlists and theme weeks, already drawn. You are both organizer and member, so you can try every screen. It deletes itself after 24 hours.
- **Works on bad connections.** Forms work before JavaScript loads, wishlist edits show at once and roll back if they fail, and the app says when you're offline and recovers when you're back.

## Screenshots

| Landing (laptop) | Landing (phone) |
|---|---|
| <img src="docs/media/landing-laptop.webp" alt="The landing page on a laptop: headline, Create your group, and the demo video's poster" width="560"> | <img src="docs/media/landing-phone.webp" alt="The landing page on a phone: headline, the poster and Create your group above the fold" width="260"> |

| Your slip, opened (phone) | Organizer (laptop) |
|---|---|
| <img src="docs/media/me-opened-phone.webp" alt="A member's page with the slip opened: the name, a codename, the receiver's wishlist and this week's theme" width="260"> | <img src="docs/media/organizer-laptop.webp" alt="The organizer page after the draw: 8 of 12 have opened their slips" width="560"> |

<p align="center">
  <img src="docs/media/reveal-finale.webp" alt="The party reveal finale on a 1920×1080 projector: twelve flipped slips in a ring around a lit parol" width="840">
  <br><sub>The reveal finale, on a 1920×1080 projector.</sub>
</p>

## Engineering highlights

**A draw that makes one loop.** The draw ([`server/draw.ts`](server/draw.ts)) is a pure function. It builds a single gift loop (A → B → C → … → A), so the reveal can go from person to person, and it respects exclusions in both directions. It uses randomized backtracking that tries the most-constrained person first. If no loop exists, it says which exclusions to relax.
- 33 tests in [`tests/draw.test.ts`](tests/draw.test.ts): 400 random groups checked against a brute-force search over every possible loop, a uniformity test (every loop of 5 comes up about equally often), and 150 members with heavy exclusions, which finishes fast and fails fast when it's impossible.

**Pairs never leak.** Before the reveal, no page, JSON or network response may show who gives to whom, except your own receiver.
- End-to-end tests check the HTML and every response at each stage, for groups of 3 and 30, and on the reveal screen step by step.
- Personal-link tokens are kept out of the Referer header (`Referrer-Policy: same-origin`). A test watches every request to make sure.

**Identity without accounts.**
- Tokens are 32 random bytes, and only their SHA-256 hashes are stored.
- PINs are hashed with salted scrypt.
- A member is locked out for 15 minutes after 5 wrong PINs, and until the organizer unlocks them after 10. The member row is locked while a PIN is checked, so parallel guesses are counted one at a time.
- Every failure returns the same message and runs one scrypt, so timing gives nothing away.
- Per-IP rate limits (Upstash): create 10/hour, join 30 per 10 minutes, and failed come-backs 10 per 15 minutes.

**Click-to-load self-hosted video and lazy animation code.**
- The landing's first load is a 16–39 KB WebP poster: no video bytes, no player and no animation code.
- The MP4 (H.264, 720p on phones, 1080p on laptops) starts only when the poster is pressed. It plays in place on laptops and full screen on phones.
- The small bowl on the "Paano 'to?" list is a real button from the first paint. Its GSAP code, the slip and the sparkle load only when someone touches, focuses or types on the bowl, never on scroll or idle. A tap that lands before the code arrives is queued and still plays.
- PageSpeed Insights on the live landing: 98 mobile and 100 desktop for performance, and 100 for accessibility, best practices and SEO. Zero layout shift; the poster is the largest paint.

**Hydration-safe forms.** People open these links on budget phones over mobile data, and they start typing before React loads. The create-group form adopts whatever is already in the inputs when React hydrates, so nothing typed is lost.
- [`e2e/slow-phone.spec.ts`](e2e/slow-phone.spec.ts) proves it: 6× CPU throttling, a 400 ms / 1.6 Mbps network, and every script held back while the test types.
- The same spec taps Join and come-back before hydration, and checks that those plain HTML form posts are accepted.

**Performance budgets.** At most 150 KB of JavaScript (compressed) on the first load of the pages members open from the GC: join is 146.4 KB, /me is 149.8 KB.
- Animations touch only `transform` and `opacity`, and respect `prefers-reduced-motion`.
- Scripts in [`scripts/perf/`](scripts/perf/) measure frame rates at 4× CPU throttling for the slip unfold, the bowl and the light string, and at 2× for the reveal.

**Testing.**
- 232 unit tests (Vitest).
- 77 database constraint tests, run against a Neon branch and rolled back.
- 57 Playwright runs on a Pixel 7 (Chromium), an iPhone 14 (WebKit), a 1366×768 laptop and a 1920×1080 projector.
- A 10-size layout sweep of every page, from 360×740 to 1920×1080.
- A usability test with AI personas (a kuya tapping Join on a slow phone, a tita coming back without "Tita" in her name, an organizer running a 20-person group, and others). Each fix is tested the way the persona ran into it, in [`e2e/persona-fixes.spec.ts`](e2e/persona-fixes.spec.ts) and [`e2e/slow-phone.spec.ts`](e2e/slow-phone.spec.ts).

## Design process

The first build used a "Puto Bumbong" look. It worked, but it looked like every other AI-made app. I explored three new directions in Claude Design and picked the third, **Handmade Pasko**: the evening before Simbang Gabi, a paper parol as the only strong colour, and everything else made of paper someone prepared (a listahan notebook page, gift tags, a capiz card, papel de japon).

Three rules hold it together:
- Colour is light.
- Different jobs use different materials.
- Nothing is blurred.

The full system, with its contrast table, the four signature animations, and the rules for budget phones, is in [docs/DESIGN.md](docs/DESIGN.md).

## The video, built in code

The demo video is a [Remotion](https://www.remotion.dev) project in [`video/`](video/README.md). The app's real screens are recorded frame by frame on a virtual clock, then cut with React components that reuse the app's slip, parol and sky. The music is edited and the sound effects are synthesized in scripts, and the audio is normalized for loudness. The landing poster is a Remotion still rendered from the same scene.

## How I built it

I built this solo with AI tools: Claude Design for the design directions and screens, and Claude Code for writing the code. My part was the product decisions, the specs and rules in [CLAUDE.md](CLAUDE.md) and [docs/](docs/), reviewing every change, and testing the live app. The same files show what the AI worked from.

## Tech stack

Next.js 16 (App Router, React 19) · TypeScript (strict) · Tailwind CSS v4 · Neon Postgres · Drizzle ORM · Zod · GSAP · Upstash rate limiting · PostHog (server-side, no personal data) · Vitest · Playwright · Vercel

## Architecture

```
app/          routes: landing, /new, /g/[slug] (join, /me, /admin, /reveal), /demo, API routes
components/   UI, the slip, the reveal ring, the landing bowl and video
server/       all business logic: draw, auth, PIN, groups, reveal, demo, rate limits
server/db/    Drizzle schema; SQL migrations in drizzle/
lib/          shared helpers (theme weeks, dates, referrer policy)
tests/        Vitest unit and database tests
e2e/          Playwright specs and the seed script
video/        the Remotion project (its own package.json)
```

- Pages are server components. Mutations are Server Actions that validate input with Zod and call `server/`.
- A draw writes all its assignments in one transaction.
- A daily Vercel Cron job deletes expired demo groups.

More in [docs/TECH.md](docs/TECH.md), [docs/PRODUCT.md](docs/PRODUCT.md) and [docs/ROADMAP.md](docs/ROADMAP.md).

## Run it locally

You need Node 24 and a Postgres database (a free [Neon](https://neon.tech) branch works).

```bash
git clone https://github.com/CarlosNatanauan/monito-monita.git
cd monito-monita
npm install
cp .env.example .env.local   # set DATABASE_URL; everything else is optional locally
npm run db:migrate
npm run dev                  # http://localhost:3000
```

```bash
npm test            # unit tests
npm run test:db     # database tests (against the database in .env.local)
npm run test:e2e    # Playwright (uses the running dev server)
```

---

Made by Carlos Natanauan · [kuyacarlos.is-a.dev](https://kuyacarlos.is-a.dev) · [LinkedIn](https://www.linkedin.com/in/carlosnatanauan)
