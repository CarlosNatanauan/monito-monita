# Product

## One-liner

Monito Monita runs your whole exchange gift from one link: draw names, wishlists, theme weeks, and the party reveal.

## The problem

Every December, offices, schools, barkadas, and families do "Monito Monita". It usually runs on:

- Paper names in a cup (someone always draws themselves, or the absent people get skipped)
- A messy GC where wishlists get buried
- Someone manually announcing the theme every week
- No easy way to do the reveal

Global tools (DrawNames, Elfster) handle the draw, but none are built around how Filipinos actually play: **weekly theme rounds, codenames, and a big reveal at the Christmas party**.

## Our edge

The draw is table stakes. What makes this worth using:

1. **Theme weeks** — built into the group, not an afterthought
2. **Codenames** — everyone gets a fun alias ("Bibingka Bandit")
3. **The reveal** — a screen made for projecting at the party
4. **Zero friction** — one link, a name and a 4-digit PIN, works on any phone
5. **Premium feel** — it's used once a year, so every visit should feel special. A few polished moments (unfolding your slip, the party reveal), with everything else fast and simple. See `docs/DESIGN.md`.

## Who it's for

| User | What they need |
|---|---|
| **Organizer** (HR, class officer, the tita who always plans) | Set it up in 2 minutes, draw fairly, keep everyone on track |
| **Member** | Find out who they got, see the wishlist, know this week's theme |

## Core user flows

**Organizer**
1. Creates a group: name, budget, party date, theme weeks
2. Gets two links: a **share link** (for the GC) and a private **organizer link**
3. Watches people join, adds exclusions (couples, siblings)
4. Taps **Draw names** when everyone's in
5. Posts theme reminders to the GC each week
6. On party day, opens the **reveal screen**

**Member**
1. Opens the share link, enters their name and a 4-digit PIN
2. Gets a codename and a **personal link**, with a button to send it to themselves (Messenger, Notes)
3. On another phone or browser (e.g. joined inside Messenger, later opens Chrome): taps "Kasali ka na? Bumalik dito" and enters name + PIN. Works before and after the draw
4. Adds a wishlist
5. After the draw, sees who they got and that person's wishlist
6. Checks this week's theme
7. Sees the reveal at the party

## Features

### Must-have (launch, Nov 28)
- Create group (name, budget, party date, theme weeks)
- Join by link with a name and a 4-digit PIN, no account
- Come back on any device: personal link, or name + PIN (see "Coming back" below)
- Exclusions (who can't draw whom)
- Fair draw (one big loop, nobody draws themselves)
- Wishlists
- "My monito" page (who I got + their wishlist)
- Current theme week display
- "Copy reminder for GC" button for the organizer
- Organizer page (members, status, draw, remove member)
- Codenames
- Signature moments: unfolding your slip, the bowl, landing page demo (see `docs/DESIGN.md`)
- Mobile-first design, landing page

### Must-have before the first parties (Dec 1–7)
- Party reveal screen (lighting the parol)

### Nice-to-have (if ahead of schedule, or during December)
- Anonymous chat between giver and receiver
- Guessing game: guess your giver before the reveal, leaderboard after
- Share cards (nice previews when links are pasted into Messenger)
- Optional email reminders

### Later (after the first season)
- AI gift ideas (wishlist + budget + theme → suggestions)
- AI theme generator and playful hints
- Office/company plans (big groups, CSV import, custom branding)
- Shopee/Lazada links on gift ideas (affiliate)
- Other occasions: Valentine's, birthdays, kris kringle any time of year
- Installable app (PWA) with push notifications
- Tagalog language option

## Coming back (name + PIN)

Many people join inside Messenger's browser and later open the link in Chrome or Safari, where the app doesn't know them. Name + PIN gets them back without asking the organizer.

- **Joining** asks for a name and a 4-digit PIN ("para makabalik ka kahit sa ibang phone"). PINs don't have to be unique.
- **Taken name** in the join form: nothing is created. "May {name} na sa group. Ikaw ba 'yan?" with two equal buttons: "Ako 'yan, ilalagay ko ang PIN" (the come-back form, PIN only) and "Hindi ako 'yan, gagamit ako ng ibang pangalan" (back to the join form with the name kept and a hint: "May Migs na. Lagyan ng initial, hal. “Migs R.”"). Only the name they typed is said back; the taken result itself already tells them it exists.
- **Come-back form** (from "Kasali ka na? Bumalik dito" on the join page, open or closed): name + PIN. Every failure says the same thing, "Mali ang pangalan o PIN", so it never reveals whether a name exists. The join page never lists member names. Under the form, always: "Isulat ang pangalan na ginamit mo noong sumali (kasama ang Kuya, Ate, Tita kung meron)" and "Nakalimutan ang PIN? I-message ang organizer, bibigyan ka niya ng bagong link." After 3 failures in that browser the second hint grows ("Huminto muna…").
- **Forgotten honorifics:** "Ben" finds "Kuya Ben" (and "Tita Nena" ↔ "Nena") when exactly one member fits without a leading Kuya, Ate, Tita, Tito, Sir or Ma'am. The error is identical either way.
- **Guessing:** 5 wrong PINs lock that member for 15 minutes (the organizer sees "Maraming maling PIN kanina" under their row, with "Get new link"); 10 lock them until the organizer taps **Unlock** ("Na-lock ang PIN ni …"). There's also a per-network limit.
- **Forgot the PIN:** the organizer's "Get new link" has a **Reset PIN** option; the member sets a new PIN after opening the new link.
- **Members from before PINs** see a one-time "Mag-set ng PIN" card on their page until they set one.
- Coming back on a new device doesn't log out the old one.

## What we're NOT building (for now)

- User accounts and passwords
- Payments
- Native mobile apps
- Buying gifts inside the app

## Success for season 1

Honest goal: real groups using it, not millions of users.

- 20+ groups created
- 300+ members joined
- At least a few groups we don't personally know (it spread on its own)
- Feedback collected for the 2027 version

## Copy and tone

Warm, playful, a little Taglish. Think "Sino kaya monito mo?" (Who could your monito be?), not corporate. Keep instructions plain and short.
