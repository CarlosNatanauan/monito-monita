# Roadmap

**Launch target: Friday, November 28, 2026.**

Why this date: most groups draw names in late November so theme weeks can run before mid-December parties. Launching later means missing this season.

Part-time reality: plan for about 2 hours on weekdays and longer sessions on weekends. If behind, cut from the cut list, never move the launch.

**Key insight for design time:** the party reveal isn't needed on launch day. Groups only use it at their party (mid to late December). So it ships in the first week of December, which frees launch weeks for polishing the moments people see first.

---

## Week 1: Foundation + look (Nov 9–15)

Goal: a group can be created, people can join, names can be drawn, and the design system exists.

- [x] Create repo, Next.js + TypeScript + Tailwind + shadcn/ui setup
- [x] Design tokens from `docs/DESIGN.md`: colors, fonts (Plus Jakarta Sans, Gochi Hand), type scale
- [x] Repo hygiene: `.gitattributes` (LF endings), `.env.example`, pinned Node 24, remove starter page and assets
- [x] Neon Postgres + Drizzle schema + first migration
- [x] Deploy empty app to Vercel (deploy on day 1, not day 20)
- [x] Token + cookie helpers (`server/auth.ts`)
- [x] Create group page → returns share link + organizer link
- [x] Join page → name only → creates member, sets cookie, shows personal link
- [x] Organizer page: member list, remove member
- [x] Exclusions UI (pick two members)
- [x] **Draw algorithm + unit tests**
- [x] Draw button → saves assignments, locks joins
- [ ] Weekend: quick mockups of the 4 signature screens (Figma or paper), and decide: SVG + GSAP only, or Rive for the bowl

✅ Done when: you can create a group, join from 3 phones, and draw, with the right colors and fonts.

## Week 2: The member experience + the slip (Nov 16–22)

Goal: everything a member needs between the draw and the party, plus the most important moment.

- [x] **Paper slip component** (folded / unfolded states)
- [x] **Signature moment: unfolding your slip** (3D unfold, handwritten name, gold glow, haptic, plays once, reduced-motion version)
- [x] Member home: open slip + their wishlist + this week's theme
- [x] Wishlist add / edit / delete
- [x] Theme weeks: set up on group creation, current theme shown
- [x] "Copy reminder for GC" button
- [x] Codenames (random generated list, Filipino-flavored)
- [x] Remove member after draw → patch the loop
- [x] Anonymity check: inspect network responses, confirm no leaks
- [ ] **Weekend: test with a real group** (family, friends, or office), on real Android phones

✅ Done when: a real group can use it start to finish (except the reveal), and people react to the slip unfold.

## Week 3: First impression + launch (Nov 23–28)

Goal: the moments strangers see first, then launch.

- [ ] **Signature moment: the bowl** on the group page (fills with slips as people join, your slip drops in)
- [x] **Signature moment: landing page "Try a bunutan"** (draw a demo slip from the bowl)
- [x] Landing page copy: how it works in 3 steps, "Create your group"
- [x] Share previews (Open Graph image + title for Messenger/FB links)
- [x] Joining: your slip folds and drops into the bowl before /me
- [x] Personal link shown masked on /me (screenshots); progress lights scale to 150 members
- [x] Landing analytics: `landing_viewed` with the referrer domain only
- [ ] Performance pass: Lighthouse mobile 90+, test on a budget Android
- [x] Basic rate limiting + input limits (Upstash per-IP on create, join, come-back)
- [x] Name + PIN: come back on any device (join with PIN, come-back form, lockout, organizer unlock / reset PIN, "send this link to yourself")
- [x] PostHog analytics (create → join → draw → slip opened funnel), server-side only
- [x] Playwright test of the main flow on a mobile viewport
- [x] Responsive layouts for tablets and laptops (two columns, organizer dashboard), checked at 8 sizes
- [x] "Handmade Pasko" look (docs/DESIGN.md): new tokens and fonts, paper materials, the evening sky and parol, every page and the 4 moments restyled
- [ ] Fix everything from the test group's feedback
- [ ] **Launch Nov 28:** post in your own GCs, Facebook, Reddit (r/Philippines), LinkedIn

✅ Done when: strangers can create a group without asking you anything, and the landing page makes them want to.

### Cut list (if behind, drop in this order)
1. Share preview images
2. Landing page demo bowl (use a short screen recording of the slip unfold instead)
3. Bowl animation on the group page (show a simple slip count)
4. Codenames

**Never cut:** the draw, wishlists, theme weeks, and the slip unfold.

## Dec 1–7: The party reveal

Ship before the first parties.

- [x] Reveal logic: start, Next / Previous stored on the server, REVEALED at the end, "Ang nagbigay sa'yo ay…" on /me (plain screen for now)
- [x] Reveal screen: ring of slips on gabi, bulbs light along the loop, slips flip one by one (`/lab/reveal` to try it)
- [x] Final "parol lights up" moment when everyone is revealed ("Ilawan ang parol", gold stars)
- [x] Large groups: a window of 12 slips turns around the current pair; the full list of pairs at the end
- [x] Projector check: 24px+ at 1080p, nothing in the outer 5%, at 1920×1080, 1366×768 and 1280×720
- [x] Phone as remote: the projector plays each step it picks up from the phone
- [x] Reduced-motion cross-fades and the plain list of pairs
- [x] Optional sound (off by default)

## December: Live season

The real usage happens now. Priority is **keeping it working**, then adding the fun stuff.

- [ ] Watch errors and fix fast
- [ ] Anonymous chat (giver ↔ receiver)
- [ ] Guessing game + leaderboard at reveal
- [x] Organizer can reissue a lost personal link
- [ ] Collect feedback (short form after reveal)

## January–February: Look back and level up

- [ ] Write a short retro: numbers, what worked, what didn't
- [ ] Write a launch post / case study for portfolio and LinkedIn
- [ ] AI gift ideas (wishlist + budget + theme → suggestions), with per-group limits
- [ ] AI theme generator and hints for the guessing game
- [ ] Optional email reminders (Vercel Cron + Resend)

## Future (2027 season and beyond)

- **Office plans:** big groups, CSV import, custom branding, multiple groups per company
- **Other occasions:** Valentine's exchange, birthday gift pools, kris kringle anytime
- **Gift links:** Shopee/Lazada affiliate links on gift ideas
- **PWA:** installable, push notifications
- **Tagalog** language option
- Buy a domain (monitomonita.app was available as of Nov 9, 2026; the app runs at https://monitomonita-ph.vercel.app until then)
