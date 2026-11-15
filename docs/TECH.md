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
| **Motion** (motion.dev) | Everyday UI motion in React: state changes, layout animations, gestures | Not on member pages any more: /me must stay under 150 KB of JS, so its press feedback and fade-ins are CSS transitions and Web Animations |
| **GSAP** + plugins (100% free, including formerly paid plugins) | Cinematic, choreographed timelines | Slip unfold sequence, the bowl draw and join drop, the party reveal (slip flips, bulbs lighting along the loop, the turning window, the parol finale) |
| **Rive** (optional, decide after mockups) | Illustrated, interactive animations with state machines, tiny runtime | The bowl with slips tumbling, if SVG + GSAP isn't rich enough. Needs design time in the Rive editor |
| **canvas-confetti** | Particle bursts | Gold star/parol sparkles at big moments only |
| **View Transitions** (React / Next 16) | Smooth page-to-page transitions | Join → member home, member home → slip. Check Next 16 docs for current support |
| ~~opentype.js~~ | Not used | The slip's handwriting is an ink reveal moved with transforms (docs/DESIGN.md, section 8), so no font outlines ship to /me |

**Not using three.js / 3D WebGL for v1.** It's heavy on budget phones and a big time sink. CSS 3D transforms + SVG + GSAP gets the paper-slip look. Revisit for the 2027 reveal screen.

### Quality and product

| Need | Choice |
|---|---|
| Unit tests | **Vitest** (draw algorithm, token helpers) |
| End-to-end tests | **Playwright** on a mobile viewport (create → join → draw → open slip) |
| Product analytics | **PostHog** (free tier), server-side events only: see "Analytics" below |
| Share previews | `next/og` (built into Next.js) |
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

### Name + PIN (`server/pin.ts`)

For people who joined in Messenger's browser and later open the link elsewhere.

- **Storage:** the PIN is hashed with salted **scrypt** (N=2^14, r=8), never stored in plain text. PINs aren't unique and are never compared across members. No hash can make a 4-digit PIN strong against an offline attack, so the real protection is the online limits below; the hash keeps a leaked database from showing PINs at a glance.
- **Joining with a taken name** (case-insensitive, extra spaces ignored, same matching as the unique-name index) creates nothing and returns the come-back form. Taken-name results count toward the IP failure limit.
- **Coming back:** active member with that name + correct PIN → a **new device token** in `member_sessions` (hash only), set as the member cookie. The member's original token keeps working, so the old device stays logged in. Session tokens work everywhere a member token does, including as a personal link.
- **One failure for everything:** unknown name, wrong PIN, locked, removed, no PIN set, rate limited, bad input: all return exactly "Mali ang pangalan o PIN", and each runs one scrypt so timing doesn't tell them apart. Works in every group status (only new joins close at the draw).
- **Lockout per member** (pure logic, unit tested): 5 wrong → `pinLockedUntil` = now + 15 min; 10 wrong → `pinLockedAt` (until the organizer unlocks). Tries during a lock aren't checked or counted. A correct PIN or an unlock resets the count. The member row is locked (`SELECT … FOR UPDATE`) while checking, so parallel guesses are counted one by one.
- **Organizer:** sees "Na-lock ang PIN ni {name}" + Unlock for fully locked members; "Get new link" has a **Reset PIN** option (clears the PIN and lock).
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

## Changes after the draw

- **Joins lock** once the group is `DRAWN`.
- **Member removed after draw:** patch the loop. The person who had them now gets their receiver. No full redraw needed.
- **Redraw:** allowed before reveal, with a strong warning (everyone's monito changes).

## Theme weeks

- Current theme = the latest `ThemeWeek` whose `startDate` has passed. Computed on the fly, no job needed.
- **"Copy reminder for GC"** generates a ready-to-paste message ("This week's theme: Something soft 🧸 — budget ₱300 — party on Dec 19!"). This is the MVP reminder system: free and works everywhere.
- Email/push reminders come later via a daily Vercel Cron job.

## Reveal (`server/reveal.ts`)

- The organizer opens `/g/[slug]/reveal` (organizer only) and taps **Start the reveal**: the group becomes `REVEALING` at step 1.
- **Next / Previous** move along the loop, starting with the first member to join. The step is stored on the group (`revealStep`), so a refreshed projector or another device (organizer link on a laptop) resumes at the same pair. Each move sends the step the screen was showing; if the server already moved (double tap, second device), nothing changes and the screen catches up.
- Next on the last pair ("Ilawan ang parol") sets the group to `REVEALED`. Then the reveal screen plays the finale and shows every pair, and each member's /me shows "Ang nagbigay sa'yo ay…" (their own giver only).
- Once the reveal starts, redraws and removals are blocked (the loop on screen must not change). There is no going back to `DRAWN`.
- **Leaks:** while `REVEALING`, the reveal screen receives the pair on screen and the ring (`server/reveal-window.ts`): up to 16 members every slip, above 16 a window of 12 around the pair on screen plus one hidden slip at each end. Revealed slips (pairs up to the current step) carry the giver and receiver; the others only a codename. A name from a pair that isn't revealed yet never leaves the server. Codenames are only ever shown to their owner elsewhere, so a codename on an unrevealed slip doesn't say who it is. The organizer page, join page, and /me stay as before (no giver) until `REVEALED`. The e2e leak tests check this at every stage, for 3 and for 30 members.

### The reveal screen (`components/reveal/`)

- **Stage:** drawn at 1920×1080 and scaled to fit the window (`reveal-stage.tsx`, `reveal.css`); controls sit in the window's corners, 5% in. Phones (portrait) get the stage on top and big buttons below: the organizer's phone is the remote.
- **State, then motion:** the stage always renders the exact state for the step (`ring.ts`), so a refresh mid-reveal is correct by construction. When the step or status changes while open (own tap, or the 2-second auto-refresh picking up the phone's tap), `transition.ts` works out what changed and a timeline animates from the old state into it: `reveal-timeline.ts` (GSAP, lazy-loaded after the screen is up) or, with reduced motion, `fade-transition.ts` (Web Animations cross-fades, no GSAP). Only `transform` and `opacity` animate (pre-painted gold outlines, the gold parol frame). Bulbs light by their `data-state` with a CSS transition and a per-bulb delay the timeline sets before the new state paints; no script runs per frame for them.
- **Confetti** (`stars.ts`, canvas-confetti, gold stars only) loads while the last pair is on screen; never with reduced motion.
- **Sound** (`sound.ts`): optional Web Audio bells, off by default, remembered per device in `localStorage`.
- `/lab/reveal?n=3..150&step=0..n+1&speed=` shows the screen with made-up names (no database), for tuning and `scripts/perf/reveal-perf.mjs`.

## Analytics (`server/analytics.ts`)

PostHog, sent **from the server only** (a `fetch` to PostHog's capture API inside `after()`, so it never slows down or breaks a request). There is no PostHog script in the browser, so there's no session recording, no autocapture of clicks or form inputs, no cookies, and no pageview URLs (which would contain slugs and tokens).

- **Events (the funnel):** `group_created`, `member_joined`, `names_drawn`, `slip_opened` (first unfold only), `wishlist_item_added`, `reminder_copied`, `reveal_started`, `reveal_finished`. Tracked in Server Actions after the change succeeds.
- **Identity:** the distinct id is a SHA-256 hash of the group's internal UUID (`group` property too), so a PostHog funnel over distinct ids is a funnel of groups. No person profiles (`$process_person_profile: false`), GeoIP off.
- **Properties:** counts, booleans, or fixed words only, typed per event (e.g. `names_drawn: { members, redraw }`). Never names, PINs, tokens, slugs, wishlist text, or raw ids.
- **Landing views (`server/landing-view.ts`):** `landing_viewed` is sent from `proxy.ts` (inside `event.waitUntil`) for real page loads of `/` only, so the landing page stays static. Its one property is `referrer_domain`: the referrer reduced to a bare domain (`l.facebook.com` → `facebook.com`, `old.reddit.com` → `reddit.com`; `direct`, `internal`, `app:<android package>`, or `other`), never the full referrer URL. Router prefetches, RSC requests, link-preview fetchers (`facebookexternalhit`) and bots aren't counted. Each event has a random one-off distinct id (not stored, no cookie), so visits can't be linked.
- **Env vars:** `POSTHOG_KEY` (project API key) and optional `POSTHOG_HOST` (default `https://us.i.posthog.com`; EU: `https://eu.i.posthog.com`). Without a key (local dev, tests), nothing is sent.

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
- Vercel preview deploys for every branch.
