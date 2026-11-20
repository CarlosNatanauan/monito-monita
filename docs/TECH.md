# Tech

Goal: ship fast, keep it simple, but get the tricky parts (draw, anonymity, identity) right.

## Stack

Chosen for what this project needs (premium animation, fast on budget Android phones, solo dev, 3 weeks), not for what's already familiar.

### Core

| Layer | Choice | Why |
|---|---|---|
| App | **Next.js 16** (App Router) + TypeScript | React has the strongest animation ecosystem (Motion, GSAP, Rive all have first-class React support). Frontend + backend in one app |
| Database | **PostgreSQL on Neon** | Serverless Postgres, free tier, database branches for preview deploys |
| ORM | **Drizzle ORM** | Lightweight, SQL-first, fast cold starts on serverless, fully typed. A transferable skill: you write and understand real SQL |
| Validation | **Zod** | Validate every input on the server |
| Styling | **Tailwind v4 + shadcn/ui** | Fast base components, restyled to match `docs/DESIGN.md` |
| Rate limiting | **Upstash Redis** + `@upstash/ratelimit` | Serverless-friendly, free tier, protects create, join, and come-back (name + PIN) |
| Hosting | **Vercel** | Free tier, preview deploy per branch, built-in OG images and cron |
| Node | **24 LTS** (pinned in `package.json` engines and `.nvmrc`) | Same version locally and on Vercel |

### Animation and graphics

Each tool has one clear job. Animation code is **lazy-loaded** only on the screens that use it.

| Tool | Job | Used for |
|---|---|---|
| ~~Motion~~ | Removed (Nov 19, 2026) | Everyday UI motion is CSS transitions and Web Animations: /me must stay under 150 KB of JS, and nothing else needed it |
| **GSAP** + plugins (100% free, including formerly paid plugins) | Cinematic, choreographed timelines | Slip unfold sequence, the bowl draw and join drop, the party reveal (slip flips, bulbs lighting along the loop, the turning window, the parol finale) |
| **Rive** (optional, decide after mockups) | Illustrated, interactive animations with state machines, tiny runtime | The bowl with slips tumbling, if SVG + GSAP isn't rich enough. Needs design time in the Rive editor |
| **canvas-confetti** | Particle bursts | Gold star/parol sparkles at big moments only |
| **View Transitions** (React 19.3 `<ViewTransition>`) | Smooth page-to-page transitions | `components/page-transition.tsx`: a fade and 8px rise on navigation only (`default="none"`) on the landing, /demo, /new, the organizer page and the 404 (not the reveal, join or /me); off on WebKit (`lib/view-transition-guard.ts`, the page crashed in testing); no JS cost |
| ~~opentype.js~~ | Not used | The slip's handwriting is an ink reveal moved with transforms (docs/DESIGN.md, section 8), so no font outlines ship to /me |

**Not using three.js / 3D WebGL for v1.** It's heavy on budget phones and a big time sink. CSS 3D transforms + SVG + GSAP gets the paper-slip look. Revisit for the 2027 reveal screen.

### Quality and product

| Need | Choice |
|---|---|
| Unit tests | **Vitest** (draw algorithm, token helpers) |
| End-to-end tests | **Playwright** on a mobile viewport (create → join → draw → open slip) |
| Product analytics | **PostHog** (free tier), server-side events only: see "Analytics" below |
| Share previews | `next/og` (built into Next.js) |
| QR code (reveal remote) | **uqr** (unjs, zero dependencies), encoded on the server only (`lib/qr.ts`): the page gets a finished SVG path, so no QR code ships in any page's JS |
| Email (later) | Resend |
| Realtime (later) | Not needed for launch: the bowl refreshes by polling every few seconds while open. Pick a realtime service in December when building anonymous chat |

Backend logic lives in **Server Actions** and **Route Handlers**, with all business rules in `server/`.

**Next 16 note:** `cacheComponents` is on. Pages that read cookies (member and organizer pages) need dynamic rendering / Suspense boundaries. Read `node_modules/next/dist/docs/` before writing `server/auth.ts` and those pages.

## Data model (v1)

```
Group
  id, slug (random, unguessable), name
  budget (int, in pesos), partyDate, timezone (default Asia/Manila)
  status: OPEN | DRAWN | REVEALING | REVEALED
  revealStep (int: pair on the reveal screen, 1-based, while REVEALING)
  isDemo, demoExpiresAt                 -- one-click demo; a database check keeps them together
  organizerTokenHash
  organizationId (nullable — reserved for future office plans)
  createdAt

Member
  id, groupId, displayName, codename
  tokenHash (for their personal link)
  pinHash (nullable: scrypt hash of the 4-digit PIN; null for pre-PIN members or after a reset)
  pinFailedAttempts, pinLockedUntil (15-min lock), pinLockedAt (locked until organizer unlocks)
  linkReissuedAt, linkOpenedAt, slipOpenedAt
  email (optional, later)
  joinedAt, removedAt (nullable)

MemberSession                           -- extra devices, from coming back with name + PIN
  id, memberId, tokenHash, createdAt    -- newest 10 kept per member

Exclusion
  id, groupId, memberAId, memberBId     -- A and B can't draw each other

Assignment
  id, groupId, giverId, receiverId      -- created at draw time

WishlistItem
  id, memberId, title, url (optional), note (optional), position

ThemeWeek
  id, groupId, title, startDate, position

-- Nice-to-have
Message
  id, assignmentId, from: GIVER | RECEIVER, body, createdAt

Guess
  id, groupId, memberId, guessedGiverId, createdAt
```

## Identity without accounts

No sign-up, but people still need to come back.

- **Joining** takes a name and a 4-digit PIN and creates a `Member` with a random secret token.
- The token is saved in an **httpOnly cookie** (so returning on the same phone just works).
- The member also gets a **personal link** (`/g/[slug]/me?t=TOKEN`) to save and open on another device. /me shows it with "I-send sa sarili mo" (Web Share API, Copy as fallback); right after joining it's the first card.
- The **organizer** gets a separate organizer link with its own token.
- Only **hashes** of tokens are stored in the database (like passwords).
- Lost link? The organizer's "Get new link" issues a new token and deletes the member's device sessions, so every old link and cookie stops working.
- **Why a link didn't work** (docs/DESIGN.md, "In-between states"): when a personal link's token doesn't log a device in, the proxy redirects to `/me?link=old` (or `?link=removed` when the token belonged to a removed member), unless the device is already logged in as an active member. A cookie whose token no longer matches is the `stale` session kind. /me then says the link no longer works and offers coming back with the PIN. A missing group with this browser's cookie for it (`hasGroupCookie`) can only be a deleted demo, so join, /me and the organizer page say the demo is over instead of a 404.

### Name + PIN (`server/pin.ts`)

For people who joined in Messenger's browser and later open the link elsewhere.

- **Storage:** the PIN is hashed with salted **scrypt** (N=2^14, r=8), never stored in plain text. PINs aren't unique and are never compared across members. No hash can make a 4-digit PIN strong against an offline attack, so the real protection is the online limits below; the hash keeps a leaked database from showing PINs at a glance.
- **Joining with a taken name** (case-insensitive, extra spaces ignored, same matching as the unique-name index) creates nothing and returns a "taken" result (the page asks "Ako 'yan?" before showing the come-back form). Taken-name results count toward the IP failure limit.
- **Coming back:** active member with that name (or, failing an exact match, the one member it fits without a leading Kuya/Ate/Tita/Tito/Sir/Ma'am: `findByDisplayName` in `server/names.ts`) + correct PIN → a **new device token** in `member_sessions` (hash only), set as the member cookie. The member's original token keeps working, so the old device stays logged in. Session tokens work everywhere a member token does, including as a personal link.
- **One failure for everything:** unknown name, wrong PIN, locked, removed, no PIN set, rate limited, bad input: all return exactly "Mali ang pangalan o PIN", and each runs one scrypt so timing doesn't tell them apart. Works in every group status (only new joins close at the draw).
- **Lockout per member** (pure logic, unit tested): 5 wrong → `pinLockedUntil` = now + 15 min; 10 wrong → `pinLockedAt` (until the organizer unlocks). Tries during a lock aren't checked or counted. A correct PIN or an unlock resets the count. The member row is locked (`SELECT … FOR UPDATE`) while checking, so parallel guesses are counted one by one.
- **Organizer:** sees "Na-lock ang PIN ni {name}" + Unlock for fully locked members, and "Maraming maling PIN kanina" (under their row) + "Get new link" (Reset PIN ticked) while a 15-minute lock runs; "Get new link" has a **Reset PIN** option (clears the PIN and lock).
- **No PIN** (pre-PIN members, or after a reset): /me shows a one-time "Mag-set ng PIN" card; it can only set a PIN when there is none.

## The draw

Requirements:
- Nobody draws themselves
- Exclusions are respected (both directions)
- **One big loop** (A → B → C → … → A), so the reveal can go person to person in a chain
- Random and fair
- Nobody, not even the organizer, can see the full result before the reveal

Approach:
1. Shuffle members randomly.
2. Try to build a loop using **randomized backtracking**: place people one at a time, skipping anyone excluded, backtrack on dead ends.
3. If no valid loop exists (too many exclusions), tell the organizer which exclusions to relax.
4. Save all `Assignment` rows in **one transaction** and set the group to `DRAWN`.

Group sizes are small (usually under 100), so this is fast. **Write unit tests for it**: random groups, heavy exclusions, impossible cases, 2–3 person edge cases.

## Anonymity rules

The server knows everything. The API must never leak it.

- A member can only fetch **their own** assignment (who they're giving to).
- No endpoint returns "who is giving to me" before `REVEALED`.
- Organizer pages show who has joined and the draw status, **not** the pairs. The one exception is the reveal screen once the organizer starts the reveal: only the pairs revealed so far, then all of them after `REVEALED`.
- Before reveal, nothing in page HTML, JSON, or network responses should contain other people's pairs. Check this in the browser's Network tab.
- **Secret links never leave the site:** `/g/*` and `/new` send `Referrer-Policy: same-origin` (`lib/referrer-policy.ts`), so requests to other sites carry no Referer. Not `no-referrer`: with it, Chrome sends `Origin: null` on a form posted before hydration, and the Server Actions CSRF check rejects the early Join / come-back tap on a slow phone with a 500 (`e2e/slow-phone.spec.ts` covers both).

## Changes after the draw

- **Joins lock** once the group is `DRAWN`.
- **Edit details** (organizer page, `updateGroupDetails` in `server/groups.ts`): while `OPEN` the name, party date, budget and themes; once `DRAWN` only the date and themes (the stored name and budget are kept whatever is posted); nothing once the reveal starts. Same `createGroupSchema` as creating; theme dates are recomputed from the party date.
- **Member removed after draw:** patch the loop. The person who had them now gets their receiver. No full redraw needed.
- **Redraw:** allowed before reveal, with a strong warning (everyone's monito changes).

## Theme weeks

- Current theme = the latest `ThemeWeek` whose `startDate` has passed. Computed on the fly, no job needed.
- Weeks count back from the party, so adding one moves Week 1 earlier. The create and edit forms tag each week "Tapos na" / "Ngayong linggo" and warn when some would already be over (`themeWeekStates`, `pastWeeksWarning` in `lib/theme-weeks.ts`); the organizer's list tags this week too.
- After the draw, the "Na-draw na!" and theme reminders end with the share link and "Nawala ang link mo? Buksan 'to tapos i-tap ang "Bumalik sa slip ko"" (the share link opens the closed page, so it's safe in the GC).
- **"Copy reminder for GC"** generates a ready-to-paste message ("This week's theme: Something soft 🧸 — budget ₱300 — party on Dec 19!"). This is the MVP reminder system: free and works everywhere.
- Email/push reminders come later via a daily Vercel Cron job.

## Reveal (`server/reveal.ts`)

- The organizer opens `/g/[slug]/reveal` (organizer only) and taps **Start the reveal**: the group becomes `REVEALING` at step 1.
- **Auto-refresh** (`reveal/auto-refresh.tsx`): while the reveal is open and the tab visible, a steady 2-second interval calls `router.refresh()`, one refresh in flight at a time; a refresh still pending after 8 seconds no longer blocks the next one, so a projector laptop never stops following the phone. A hidden tab stops and catches up when shown.
- **Next / Previous** move along the loop, starting with the first member to join. The step is stored on the group (`revealStep`), so a refreshed projector or another device (organizer link on a laptop) resumes at the same pair. Each move sends the step the screen was showing; if the server already moved (double tap, second device), nothing changes and the screen catches up.
- Next on the last pair ("Ilawan ang parol") sets the group to `REVEALED`. Then the reveal screen plays the finale and shows every pair, and each member's /me shows "Ang nagbigay sa'yo ay…" (their own giver only).
- Once the reveal starts, redraws and removals are blocked (the loop on screen must not change). There is no going back to `DRAWN`.
- **Leaks:** while `REVEALING`, the reveal screen receives the pair on screen and the ring (`server/reveal-window.ts`): up to 16 members every slip, above 16 a window of 12 around the pair on screen plus one hidden slip at each end. Revealed slips (pairs up to the current step) carry the giver and receiver; the others only a codename. A name from a pair that isn't revealed yet never leaves the server. Codenames are only ever shown to their owner elsewhere, so a codename on an unrevealed slip doesn't say who it is. The organizer page, join page, and /me stay as before (no giver) until `REVEALED`. The e2e leak tests check this at every stage, for 3 and for 30 members.

### The reveal screen (`components/reveal/`)

- **Stage:** drawn at 1920×1080 and scaled to fit the window (`reveal-stage.tsx`, `reveal.css`); controls sit in the window's corners, 5% in. Phones (portrait) get the stage on top and big buttons below: the organizer's phone is the remote. In landscape the corner controls fade out after 3 seconds without pointer movement (`use-idle.ts` sets `data-idle`, CSS hides `.rv-autohide` unless it holds keyboard focus); keys keep working. `e2e/reveal.spec.ts` covers hiding, Space while hidden, mouse, tap and focus, and the uncut group name at 1920×1080, 1366×768 and 1280×720.
- **State, then motion:** the stage always renders the exact state for the step (`ring.ts`), so a refresh mid-reveal is correct by construction. When the step or status changes while open (own tap, or the 2-second auto-refresh picking up the phone's tap), `transition.ts` works out what changed and a timeline animates from the old state into it: `reveal-timeline.ts` (GSAP, lazy-loaded after the screen is up) or, with reduced motion, `fade-transition.ts` (Web Animations cross-fades, no GSAP). Only `transform` and `opacity` animate (pre-painted gold outlines, the gold parol frame). Bulbs light by their `data-state` with a CSS transition and a per-bulb delay the timeline sets before the new state paints; no script runs per frame for them.
- **Confetti** (`stars.ts`, canvas-confetti, gold stars only) loads while the last pair is on screen; never with reduced motion.
- **Phone as remote** (`reveal-controls.tsx`, "Gawing remote ang phone mo", start screen only, landscape only): "Ipakita ang QR" shows a QR code of the organizer link (360px on the 1920 stage, about 6 cm on a 14" laptop; error correction L, so a link with a token is version 5, 37×37); "Itago ang QR" hides it; "I-send sa phone ko" / Copy stays as the fallback. Hidden until asked for, because the screen may already be on the projector. The reveal page encodes it on the server (`lib/qr.ts`, origin from `lib/request-origin.ts`) only after verifying the organizer cookie, so only the organizer's own screen ever gets it.
- **Sound** (`sound.ts`): optional Web Audio bells, off by default, remembered per device in `localStorage`.
- `/lab/reveal?n=3..150&step=0..n+1&speed=` shows the screen with made-up names (no database), for tuning and `scripts/perf/reveal-perf.mjs`.

## Demo (`server/demo.ts`)

One sandbox group per visitor (docs/PRODUCT.md, "Demo").

- **Making one:** `/demo` posts to `startDemoAction` (`app/demo/actions.ts`, a plain form action, so it works before hydration; errors come back as `/demo?e=limit|full|name|failed`). It checks the per-IP `demo` budget, then `startDemo`: delete expired demos, refuse past `MAX_ACTIVE_DEMOS` (200) live ones, then `createDemoGroup`. That builds the plan (`demoPlan`, pure and unit tested: members, wishlists, theme weeks relative to today, the bawal pair) in **one transaction**: group (`is_demo`, `demo_expires_at` = now + 24h), theme weeks, the visitor first, 8 made-up members (random token hashes nobody holds, no PIN), wishlists, the pair, then the same `drawInTransaction` as a real draw. The visitor gets both cookies (organizer and member) and lands on `/me`.
- **Reset demo:** `resetDemoAction` re-checks the organizer cookie, that the group is a demo and the rate limit; `resetDemo` deletes it (`deleteDemoGroup` matches `id AND is_demo`) and builds a new one with the visitor's current name. Old cookies are cleared.
- **Cleanup:** `deleteExpiredDemos` is the only bulk delete of groups: `is_demo AND demo_expires_at IS NOT NULL AND demo_expires_at <= now`. The check constraint `groups_demo_expiry` (`is_demo = (demo_expires_at is not null)`) means a real group can't have an expiry at all. It runs when a demo starts and daily from **Vercel Cron** (`vercel.json`, 19:00 UTC = 3 AM Manila; Hobby allows daily) at `GET /api/cron/demo-cleanup`, which needs `Authorization: Bearer $CRON_SECRET` (`server/cron.ts`; refused when the secret is missing or under 16 characters). `tests/demo.db.test.ts` checks that cleanup (even with every demo counted as expired) and reset never delete a real group.
- **Closed to others:** `joinGroup` refuses a demo (CLOSED), and its join page says "Demo group 'to" with a link to `/demo`. Come-back isn't offered. Demo pages are under `/g/*` (noindex); `/demo` is noindex too (metadata and `X-Robots-Tag`).
- **Guide:** `components/demo/demo-guide.tsx`, server-only (no client code, no `next/link`), so /me's JS budget is unchanged. Reset is a plain `<form action>`.
- **Leaks:** nothing changes: the visitor is an organizer and one member, with the same rules. `e2e/demo.spec.ts` runs the leak checks on /me, the organizer page, the reveal (before the start, at steps 1 and 4, after) and the closed join page.

## Offline and errors

- **`experimental.useOffline`** (next.config.ts): a navigation, refresh or Server Action whose fetch fails because the connection dropped stays pending and runs again once Next's connectivity check succeeds, instead of throwing. Buttons read `useOffline` through `lib/use-pending-label.ts` and say "Hinihintay ang signal…". The reveal's 2-second refresh simply waits too.
- **Offline banner:** a small inline script in the root layout (`lib/offline-banner.ts`) on the browser's `offline`/`online` events: works before hydration and adds no JS file to the join page or /me. It appends its live region to `<body>` after load (React 19 skips unknown nodes in `<body>` when hydrating).
- **Errors:** one boundary, `app/global-error.tsx` (self-contained: it ships with every page in place of Next's built-in one); `app/not-found.tsx` is server-only with plain links, because its client references load with every page (a `next/link` there put ~4 KB on /me).
- **Wishlist** is optimistic (`useOptimistic`): the server's answer replaces it, a failure rolls it back.
- **No PWA:** `app/manifest.ts` gives "Add to home screen" the name and icon, with `display: "browser"` and no service worker, so a full load offline still needs the network.

## Analytics (`server/analytics.ts`)

PostHog, sent **from the server only** (a `fetch` to PostHog's capture API inside `after()`, so it never slows down or breaks a request). There is no PostHog script in the browser, so there's no session recording, no autocapture of clicks or form inputs, no cookies, and no pageview URLs (which would contain slugs and tokens).

- **Events (the funnel):** `group_created`, `member_joined`, `names_drawn`, `slip_opened` (first unfold only), `wishlist_item_added`, `reminder_copied`, `reveal_started`, `reveal_finished`. Tracked in Server Actions after the change succeeds.
- **Demo groups are left out:** `track` checks the group (`isDemoGroup`, after the response) and drops funnel events from a demo; if that check fails, the event is dropped too. A demo sends only `demo_started` (`{ custom_name, reset }`) via `trackDemoStarted`.
- **Identity:** the distinct id is a SHA-256 hash of the group's internal UUID (`group` property too), so a PostHog funnel over distinct ids is a funnel of groups. No person profiles (`$process_person_profile: false`), GeoIP off.
- **Properties:** counts, booleans, or fixed words only, typed per event (e.g. `names_drawn: { members, redraw }`). Never names, PINs, tokens, slugs, wishlist text, or raw ids.
- **Landing views (`server/landing-view.ts`):** `landing_viewed` is sent from `proxy.ts` (inside `event.waitUntil`) for real page loads of `/` only, so the landing page stays static. Its one property is `referrer_domain`: the referrer reduced to a bare domain (`l.facebook.com` → `facebook.com`, `old.reddit.com` → `reddit.com`; `direct`, `internal`, `app:<android package>`, or `other`), never the full referrer URL. Router prefetches, RSC requests, link-preview fetchers (`facebookexternalhit`) and bots aren't counted. Each event has a random one-off distinct id (not stored, no cookie), so visits can't be linked.
- **Landing video (`server/landing-video.ts`):** `landing_video_played` when someone presses play on the landing's demo video: the button posts to `/api/landing-video` (`keepalive`), which answers 204 and sends the event in `after()`. Counted only for a same-origin POST (`Sec-Fetch-Site`, or the Origin host without it) that isn't a bot. No properties at all, a random one-off distinct id like `landing_viewed`.
- **Env vars:** `POSTHOG_KEY` (project API key) and optional `POSTHOG_HOST` (default `https://us.i.posthog.com`; EU: `https://eu.i.posthog.com`). Without a key (local dev, tests), nothing is sent.

## Landing video

Self-hosted, no third party. `components/landing/demo-video.tsx` (docs/DESIGN.md, "Landing video") renders the poster (`public/landing/poster-640.webp`, `poster-1280.webp`) as one button. The player, `components/landing/video-player.ts`, is a dynamic import (started on `pointerdown`/`keydown`, awaited on the click) that creates the `<video>`: `monito-monita-1080.mp4` from 1024px wide, `monito-monita-720.mp4` below, `preload="auto"`, native controls. Laptops and tablets play in place; phones go full screen after `play()` resolves (`requestFullscreen`; on iPhone the video has no `playsinline`, so `play()` opens iOS's own player, with `webkitEnterFullscreen` as the fallback), and `fullscreenchange` / `webkitendfullscreen` on the way out, or `ended`, remove the video and put the poster and focus back. If `play()` is refused, the video stays in place with its controls.
- **Files:** H.264 High, yuv420p, AAC 128k, `+faststart` (playback starts before the whole file is in), 13.2 MB (1080p, CRF 22) and 6.9 MB (720p, CRF 23), re-encoded from the master render by `npm run render:web` in `video/` (at the same quality they came out smaller than a direct Remotion render, 13.7 and 8.4 MB, with no visible difference). Served from `public/` by Vercel's CDN: Git deploys have no per-file limit, and the Hobby plan's 100 GB of Fast Data Transfer a month is about 7,500 full plays at 1080p or 14,500 at 720p (browsers fetch ranges, so a partial watch costs less).
- **Checks** (`e2e/landing.spec.ts`): the poster and "Create your group" fully visible at 1366×657 and 390×664; the poster eager, high priority and the largest paint; no `<video>` and no video request before the press; the keyboard and the focus ring; in place in the same box (laptop) or full screen (phones); the poster and focus back after the end or leaving full screen; one play counted; no layout shift.
- The site sends no Content-Security-Policy; if one is added, the landing needs `media-src 'self'` (and `img-src 'self'` for the poster).

## Landing bowl

The small bowl on the "Paano 'to?" list (docs/DESIGN.md §8, moment 1): `components/landing/try-bunutan.tsx` wraps the list (`[data-bunutan]`, `data-phase` idle / drawing / shown / folding / folded for tests) and draws the bowl button and the slip stage over it. Its first `pointerdown`, `focus` or `keydown` starts three plain `import()`s: `draw-timeline.ts` (GSAP, the mix, rise and unfold), `slip/slip-art.tsx` (the slip's markup) and, inside the drawer, `slip/sparkle.ts` (canvas-confetti). No IntersectionObserver or idle preload: scrolling to the bowl loads nothing. A click before the chunks arrive is awaited in `tap()` and then plays. The opened slip's button calls `drawer.fold()`, which tweens the paused draw timeline's `time` back to the start of the rise (its calls, the sparkle and onDone, are muted while folding). Phones (<600px) get `sparkle(x, y, { compact: true })`: 12 slower stars from the slip. Reduced motion loads only the slip's markup and cross-fades the open slip in 150ms (Web Animations). Sample names: `lib/sample-names.ts` ("Ate Joy" first, then never the same name twice in a row). Checks: `e2e/landing.spec.ts` (nothing loads on scroll or idle, the queued tap, the bowl on the list's corner, no text under the opened slip from 600px and nothing but the steps under it on phones, folding back and drawing again), `e2e/flow-1-setup-join.spec.ts`, `e2e/reduced-motion.spec.ts`, `e2e/layouts.spec.ts` and `scripts/perf/landing-perf.mjs`.

## Security basics

- Random, long slugs and tokens (`crypto.randomBytes`)
- Zod validation on every input
- Rate limit per IP (`server/rate-limit.ts`, Upstash): see below
- Limits: max members per group (e.g. 150), max wishlist items, text lengths
- No personal data required beyond a display name

## Rate limiting

Per IP, sliding windows in Upstash Redis via `@upstash/ratelimit`:

| Budget | Limit | Counts |
|---|---|---|
| Create group | 10 / hour | every create |
| Demo | 20 / hour | every demo started or reset |
| Join | 30 / 10 min | every join (generous for an office on one Wi-Fi) |
| Come back | 30 / 10 min | every name + PIN try |
| Failures | 10 / 15 min | taken-name results and failed come-backs; when used up, join and come-back stop for that IP |

- The IP is the first `x-forwarded-for` entry (set by Vercel).
- **Env vars:** `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (Vercel's Upstash integration names, `KV_REST_API_URL` / `KV_REST_API_TOKEN`, also work). If they're missing (local dev), the IP limit is skipped; the per-member PIN lockout still applies.
- If Redis errors or takes over 1.5 s, requests are let through (fail open).
- A rate-limited come-back shows the same "Mali ang pangalan o PIN"; a rate-limited join or create says to try again in a few minutes.

## Folder structure (suggested)

```
app/
  page.tsx                      landing page
  new/page.tsx                  create group
  g/[slug]/page.tsx             join page
  g/[slug]/me/page.tsx          member home (my monito, wishlist, theme)
  g/[slug]/admin/page.tsx       organizer page
  g/[slug]/reveal/page.tsx      reveal screen
  demo/page.tsx                 start a one-click demo
  api/cron/demo-cleanup/        daily cleanup of expired demos (Vercel Cron)
components/
  slip/, bowl/, reveal/         signature-moment components (lazy-loaded)
  ui/                           restyled shadcn components
server/
  draw.ts                       draw algorithm (pure functions, tested)
  auth.ts                       token create/verify, cookies
  groups.ts, members.ts, ...    data access + business rules
server/db/
  schema.ts                     Drizzle schema
  index.ts                      Neon + Drizzle client
drizzle/                        generated migrations
tests/
  draw.test.ts
e2e/
  flow-1 … flow-4 *.spec.ts     Playwright main flow (phones and a laptop)
  layouts.spec.ts               every page at 8 screen sizes
```

## Environments

- `.env` is never committed. Commit a `.env.example`.
- **Own URL:** `NEXT_PUBLIC_SITE_URL` (production: `https://monitomonita-ph.vercel.app`, set in Vercel for Production only). Every link people see, copy or share, and the share images, use it when set; otherwise the address the page was opened on (`lib/site-url.ts`). Never a hardcoded domain.
- Separate databases for development and production.
- **Cron:** `CRON_SECRET` (16+ characters, Production) for the daily demo cleanup; Vercel sends it as the Bearer token.
- Vercel preview deploys for every branch.
