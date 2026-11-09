# Tech

Goal: ship fast, keep it simple, but get the tricky parts (draw, anonymity, identity) right.

## Stack

| Layer | Choice | Why |
|---|---|---|
| App | Next.js (App Router) + TypeScript | One app for frontend + backend, fastest to ship |
| Database | PostgreSQL (Neon or Supabase, free tier) | Relational data, known tool |
| ORM | Prisma | Already familiar |
| Styling | Tailwind + shadcn/ui | Fast base components, restyled to match `docs/DESIGN.md` |
| Animation | Motion (motion.dev) + canvas-confetti | Signature moments (see `docs/DESIGN.md`), lazy-loaded |
| Validation | Zod | Validate every input on the server |
| Hosting | Vercel | Free tier, easy deploys |
| Scheduled jobs | Vercel Cron | Daily job for theme changes / reminders (later) |
| Email (later) | Resend | Only if we add optional email reminders |
| Tests | Vitest | At least for the draw algorithm |

Backend logic lives in **Server Actions** and **Route Handlers**, organized in a `lib/` or `server/` folder so it stays clean (and could move to a separate API later if needed).

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
server/
  draw.ts                       draw algorithm (pure functions, tested)
  auth.ts                       token create/verify, cookies
  groups.ts, members.ts, ...    data access + business rules
prisma/
  schema.prisma
tests/
  draw.test.ts
```

## Environments

- `.env` is never committed. Commit a `.env.example`.
- Separate databases for development and production.
- Vercel preview deploys for every branch.
