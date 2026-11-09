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
| Rate limiting | **Upstash Redis** + `@upstash/ratelimit` | Serverless-friendly, free tier, protects create/join endpoints |
| Hosting | **Vercel** | Free tier, preview deploy per branch, built-in OG images and cron |
| Node | **24 LTS** (pinned in `package.json` engines and `.nvmrc`) | Same version locally and on Vercel |

### Animation and graphics

Each tool has one clear job. Animation code is **lazy-loaded** only on the screens that use it.

| Tool | Job | Used for |
|---|---|---|
| **Motion** (motion.dev) | Everyday UI motion in React: state changes, layout animations, gestures | Buttons, wishlist add/remove, press-and-hold on the slip, page elements responding to taps |
| **GSAP** + plugins (100% free, including formerly paid plugins) | Cinematic, choreographed timelines | Slip unfold sequence, **DrawSVG** for the handwritten name being "written", **MotionPath** for gold light traveling along the reveal loop, **MorphSVG** for the slip folding/unfolding shapes |
| **Rive** (optional, decide after mockups) | Illustrated, interactive animations with state machines, tiny runtime | The bowl with slips tumbling, if SVG + GSAP isn't rich enough. Needs design time in the Rive editor |
| **canvas-confetti** | Particle bursts | Gold star/parol sparkles at big moments only |
| **View Transitions** (React / Next 16) | Smooth page-to-page transitions | Join → member home, member home → slip. Check Next 16 docs for current support |
| **opentype.js** | Turn text into SVG paths | Converts names into Gochi Hand paths so GSAP DrawSVG can "write" them |

**Not using three.js / 3D WebGL for v1.** It's heavy on budget phones and a big time sink. CSS 3D transforms + SVG + GSAP gets the paper-slip look. Revisit for the 2027 reveal screen.

### Quality and product

| Need | Choice |
|---|---|
| Unit tests | **Vitest** (draw algorithm, token helpers) |
| End-to-end tests | **Playwright** on a mobile viewport (create → join → draw → open slip) |
| Product analytics | **PostHog** (free tier): funnel of group created → members joined → drawn → slip opened |
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
  status: OPEN | DRAWN | REVEALED
  organizerTokenHash
  organizationId (nullable — reserved for future office plans)
  createdAt

Member
  id, groupId, displayName, codename
  tokenHash (for their personal link)
  email (optional, later)
  joinedAt, removedAt (nullable)

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

- **Joining** creates a `Member` with a random secret token.
- The token is saved in an **httpOnly cookie** (so returning on the same phone just works).
- The member also gets a **personal link** (`/g/[slug]/me?t=TOKEN`) to save and open on another device. Show it clearly with a "Save this link" message.
- The **organizer** gets a separate organizer link with its own token.
- Only **hashes** of tokens are stored in the database (like passwords).
- Lost link? Organizer can generate a new personal link for that member (later).

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
- Organizer pages show who has joined and the draw status, **not** the pairs.
- Before reveal, nothing in page HTML, JSON, or network responses should contain other people's pairs. Check this in the browser's Network tab.

## Changes after the draw

- **Joins lock** once the group is `DRAWN`.
- **Member removed after draw:** patch the loop. The person who had them now gets their receiver. No full redraw needed.
- **Redraw:** allowed before reveal, with a strong warning (everyone's monito changes).

## Theme weeks

- Current theme = the latest `ThemeWeek` whose `startDate` has passed. Computed on the fly, no job needed.
- **"Copy reminder for GC"** generates a ready-to-paste message ("This week's theme: Something soft 🧸 — budget ₱300 — party on Dec 19!"). This is the MVP reminder system: free and works everywhere.
- Email/push reminders come later via a daily Vercel Cron job.

## Reveal

- Organizer opens the reveal screen (or it unlocks at a set time).
- Group becomes `REVEALED` and all pairs become visible.
- Reveal screen: big, projector-friendly, goes one by one along the loop.

## Security basics

- Random, long slugs and tokens (`crypto.randomBytes`)
- Zod validation on every input
- Rate limit join and create endpoints (simple per-IP limit)
- Limits: max members per group (e.g. 150), max wishlist items, text lengths
- No personal data required beyond a display name

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
  main-flow.spec.ts             Playwright
```

## Environments

- `.env` is never committed. Commit a `.env.example`.
- Separate databases for development and production.
- Vercel preview deploys for every branch.
