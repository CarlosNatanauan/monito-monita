# CLAUDE.md

Instructions for AI coding assistants working in this repo.

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
- Don't add new libraries or services without a clear reason.
- Don't build features marked "Later" or "Future" in the docs unless asked.
- Keep UI copy short, warm, and a little Taglish.

## Design rules

- Follow `docs/DESIGN.md`: its colors, type, and the bunutan (paper slip) motif.
- Heavy animation only in the 4 signature moments. Everywhere else, motion only responds to user actions.
- Animate only `transform` and `opacity`. Lazy-load animation code.
- Always respect `prefers-reduced-motion`.
- Gochi Hand is only for names on slips and codenames.
- Restyle shadcn/ui components; don't ship the default look.

## Commands

(Fill in once the project is set up.)

- `npm run dev`: start dev server
- `npm test`: run tests
- `npx prisma migrate dev`: run migrations
