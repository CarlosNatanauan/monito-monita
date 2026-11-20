# Design

Monito Monita, "Handmade Pasko". This replaces the previous DESIGN.md.

Reference files:
- `docs/design/reference.html`: every screen and state, static, tokens as CSS variables
- `docs/design/*.png`: screenshots, phone (390px) and laptop (1366px), 2x
- `docs/design/svg/`: every illustration

Where the build differs from the reference screens, section 14 says how and why.

## 1. Concept

People use this once a year, a few times each. Every visit should feel like something a person made for the party.

The product is still **bunutan**: folded paper slips drawn from a glass bowl, and a parol that lights up at the reveal.

The setting is **the evening before Simbang Gabi**. A paper parol hangs over the key screens and is the only strong colour. Its light is painted as rays. Everything else is paper someone prepared: listahan notebook pages, gift tags, a capiz-pane card, a fringed papel de japon sheet. The slip hangs from the light string by a sipit (clothespin).

Three rules hold the look together:
1. **Colour is light.** Parol red, green and gold appear only where light passes through paper: the parol, the bulbs, the pale tags, the rays. Controls are ube.
2. **Different jobs, different materials.** A list is a listahan. A fact is a tag. A status is a capiz card. The weekly theme is a papel de japon sheet. Never one box style for everything.
3. **Nothing is blurred.** No soft shadows, no glows. Light is drawn with flat rays and flat tints.

## 2. Colour

| Token | Hex | Use |
|---|---|---|
| `--takipsilim` | `#EEE9F6` | Page background (dusk lilac) |
| `--ube` | `#3F1F63` | Text, primary buttons, outlines, evening sky |
| `--ube-sky` | `#4A2873` | Second tone of the sky rays |
| `--ube-soft` | `#5A4A6B` | Secondary text, placeholders |
| `--ube-line` | `#B9A6D9` | Listahan edge, dashed border of hidden slips |
| `--ube-mist` | `#D9D0E2` | Disabled button fill |
| `--dahon` | `#1F6B45` | Success text, field labels on listahan, theme sheet, parol tails |
| `--pula` | `#C4283A` | Parol ring and one bulb colour. Illustration only |
| `--pula-lit` | `#E4606E` | Lit inner ring of the parol |
| `--ilaw` | `#F4C542` | Light: rays, lit bulbs, focus ring, reveal highlights |
| `--ilaw-lit` | `#FFE9A3` | Lit paper: parol facets, gold tag, newest bulb, focused PIN box |
| `--tag-pink` | `#F9D5D9` | Budget tag, private-link card |
| `--tag-green` | `#D7ECDD` | Member-count tag |
| `--papel` | `#FFFFFF` | Slips, listahan, inputs, capiz card |
| `--rule-blue` / `--rule-red` | `#B9C6E8` / `#E08A93` | Listahan ruled lines and margin |
| `--sipit` | `#D9A860` | Clothespin, bilao tones |
| `--sili` / `--sili-wash` | `#B3261E` / `#FDECEA` | Errors only |
| `--gabi` / `--gabi-2` | `#1E1238` / `#251746` | Reveal background and its ray tone |
| `--gabi-text` | `#EBDFF8` | Secondary text on the reveal |
| `--gabi-line` | `#9C87C4` | Off-bulb outline on the reveal |

### Contrast (WCAG 2.1, computed)

Text pairs. AA needs 4.5 for body text, 3.0 for text 24px and larger.

| Text | Background | Ratio |
|---|---|---|
| Ube text `#3F1F63` | page `#EEE9F6` | 11.1 |
| Ube text `#3F1F63` | paper `#FFFFFF` | 13.2 |
| Soft text `#5A4A6B` | page `#EEE9F6` | 6.7 |
| Soft text `#5A4A6B` | paper `#FFFFFF` | 8.0 |
| Soft text `#5A4A6B` | disabled button `#D9D0E2` | 5.4 |
| Dahon text `#1F6B45` | page `#EEE9F6` | 5.4 |
| Dahon text `#1F6B45` | paper `#FFFFFF` | 6.5 |
| White `#FFFFFF` | ube (buttons, sky) `#3F1F63` | 13.2 |
| White `#FFFFFF` | sky ray tone `#4A2873` | 11.4 |
| White `#FFFFFF` | dahon (theme sheet) `#1F6B45` | 6.5 |
| Lit gold `#FFE9A3` | dahon (theme name) `#1F6B45` | 5.4 |
| Ube text `#3F1F63` | gold tag `#FFE9A3` | 11.0 |
| Ube text `#3F1F63` | pink tag / secret card `#F9D5D9` | 9.8 |
| Ube text `#3F1F63` | green tag `#D7ECDD` | 10.7 |
| Soft text `#5A4A6B` | pink secret card `#F9D5D9` | 5.9 |
| Error text `#B3261E` | error wash `#FDECEA` | 5.7 |
| Error text `#B3261E` | paper `#FFFFFF` | 6.5 |
| White `#FFFFFF` | gabi (reveal) `#1E1238` | 17.5 |
| White `#FFFFFF` | gabi ray tone `#251746` | 16.3 |
| Gabi text `#EBDFF8` | gabi `#1E1238` | 13.7 |
| Gabi text `#EBDFF8` | hidden slip (ube) `#3F1F63` | 10.4 |
| Ilaw gold `#F4C542` | gabi `#1E1238` | 10.8 |
| Gabi ink `#1E1238` | gold button `#F4C542` | 10.8 |
| Ube text `#3F1F63` | current slip `#FFE9A3` | 11.0 |
| Soft text `#5A4A6B` | video label on hover/focus `#FFE9A3` | 6.6 |
| Gabi text `#EBDFF8` | gabi ray tone `#251746` (phone reveal) | 12.7 |
| Ilaw gold `#F4C542` | gabi ray tone `#251746` (phone reveal header, name) | 10.0 |

Non-text (needs 3.0 where it carries meaning):

| Element | Pair | Ratio |
|---|---|---|
| Input / PIN border | `#3F1F63` on `#FFFFFF` | 13.2 |
| Off bulb outline | `#3F1F63` on `#FFFFFF` | 13.2 |
| Off bulb outline (reveal) | `#9C87C4` on `#1E1238` | 5.6 |
| Off bulb outline (reveal, ray tone) | `#9C87C4` on `#251746` | 5.2 |
| Focused PIN box border | `#3F1F63` on `#FFE9A3` | 11.0 |
| Gold outline on the reveal slip | `#F4C542` on `#1E1238` | 10.8 |
| Listahan edge (decorative) | `#B9A6D9` on `#EEE9F6` | 1.9 |
| Focus ring gold vs page (paired with ube border) | `#F4C542` on `#EEE9F6` | 1.4 |

Rules:
- Gold is never text on a light background, and never the only sign of a state. Lit bulbs always sit next to a count in words.
- Text never sits on the gold rays or on the parol. Keep headings on the ube part of the sky.
- `--pula` is not used for buttons, text or errors. Errors use `--sili`.
- One filled ube button per screen.

## 3. Type

| Role | Font | Notes |
|---|---|---|
| Headings | **Chelsea Market** 400 | Hand-lettered, upright, mixed case. Never all caps. Never below 17px |
| Everything else | **Atkinson Hyperlegible** 400 / 700 | Body, labels, buttons marked secondary, helper text |
| Names and codenames | **Gochi Hand** 400 | People's names and codenames only. Never below 20px |

Keeping Chelsea Market and Gochi Hand apart:
- A person's name or codename is **always** Gochi Hand, even inside a Chelsea Market heading: "Hi, *Joy*!", "Wishlist ni *Carlo*". Inline names are set at 1.18em of the surrounding text.
- Chelsea Market never sets a person's name. Group names ("Barkada Christmas 2026") are not people, so they stay in Chelsea Market.
- Gochi Hand is ube ink on white paper (slips, listahan lines, the name field) or inline in a sentence. It is never used for buttons, labels or headings.

Scale (phone / laptop):

| Token | Size | Font | Use |
|---|---|---|---|
| display | 34 / 52, line 1.1 | Chelsea Market | Page headline, greeting |
| title | 28 / 40, line 1.12 | Chelsea Market | Group name on organizer, "Names drawn" |
| section | 20 / 22, line 1.2 | Chelsea Market | Card and list titles |
| button | 20 | Chelsea Market | Primary buttons |
| brand | 22 / 24 | Chelsea Market | Wordmark |
| body | 16 / 17, line 1.5 | Atkinson 400 | Body |
| label | 16 bold; 14 bold on listahan | Atkinson 700 | Field labels, tag labels |
| small | 15 | Atkinson 400 | Helper and meta text. Nothing smaller than 14 |
| slip name | 64 / 92 | Gochi Hand | Opened slip |
| sample slip | 28 / 36 | Gochi Hand | Landing |
| list name | 30 | Gochi Hand | Name written on a listahan line |

Load: Chelsea Market 400, Atkinson Hyperlegible 400 and 700, Gochi Hand 400. Latin subset, `font-display: swap`. Four files.

## 4. Spacing and shape

- Base unit 4px. Common steps: 6, 10, 12, 18, 22, 32, 48.
- Phone gutters 20px. Gap between blocks 18px (22px on laptop).
- Listahan line height is exactly 40px. Every row is one line (40px) or two (80px). Text on it must fit one line; write shorter copy for phones.
- Corners are slightly uneven, as if cut by hand: primary button `10px 8px 12px 8px`, secondary `8px 6px 9px 6px`, inputs `6px 5px 7px 5px`, sky panel `14px 10px 16px 10px`. Paper (listahan, slips, capiz, tags) has square or 3px corners. No pills, no circles for controls.
- Outlines are 1.5px ube. The only shadow is a flat offset under a slip: `3px 4px 0 rgba(30,18,56,.45)`. Buttons and cards have none.
- Tags and slips are rotated 1 to 4 degrees. Nothing else is.
- Tap targets are at least 44px.

## 5. Layout

What is built (`components/page.tsx`, checked by `e2e/layouts.spec.ts`):

| Width | Layout |
|---|---|
| Phone, under 600px | One column, 20px gutters. Light string across the top (one swag between two nails, the wire running on past them) |
| Tablet, 600 to 1023px | One column, max 560px, centred (phones turned sideways too). The organizer page uses two columns from 840px (side column 340px, 32px gap) |
| Laptop, 1024px and up (iPad landscape included) | Two columns inside a 1120px container (32px gutters when the window is narrower): main column (flexible) and a 420px side column, 48px gap. Light string: one continuous wire across the full width, sagging between nails every 360px |

What goes where on laptop. Asymmetric: text left, picture right, never centred.
- **Landing** (direction 1a "Poster first", `docs/design/landing-video/`, simplified Nov 20, 2026: one hero picture, no second row). From 1180px: one row of two columns inside the 1120px container, `minmax(0, 440fr) minmax(0, 632fr)` with a 48px gap, both starting at the top. Left: brand, headline, line of copy, "Create your group" with "Subukan ang demo" (secondary) beside it, the small line under them ("Titingin-tingin lang? …") and "Your groups" (returning visitors). Right: the demo video's poster (632×355.5 at 1366px, its top level with the headline; see Landing video) with "Mula sa GC hanggang sa reveal sa party, sa loob ng isang minuto." under it, then "Paano 'to?" (32px down) with the small bowl on its corner (§8, moment 1). Then the footer: "Made by Carlos Natanauan" with links to the GitHub repo and kuyacarlos.is-a.dev, small soft text over a 1px `--ube-line` rule, on the landing only. Under 1180px: one centred column, 640px wide from 600px (phones: the full width less 20px each side): brand, headline, poster (the column's full width, 16:9), "Create your group", "Subukan ang demo" (one row from 600px, side by side), the small line, "Your groups", "Paano 'to?", the footer (phones: the name, then the links). The line of copy and the poster's caption show from 1180px only. The longer "Paano 'to?" lines show once the list is 640px wide (680px windows); phones get the short ones. The space above "Paano 'to?" is the bowl's 36px overhang and a little air: 40px on phones, 48px from 600px, 32px from 1180px. Fold targets: the poster and "Create your group" above a 1366×657 fold (laptops) and a 390×664 fold (phones); at 1366×657 "Paano 'to?" ends about 70px below the fold, a short scroll.
- **Create group:** form and "Create group" left; "Preview sa GC" (the bubble and the share card) right. Phones show the preview under the form, above the button.
- **Group ready:** heading with the parol and the capiz "Link ng group" card left; the organizer link card and "Pumunta sa group ko" right.
- **Join, come back, closed:** heading, parol and tags left (with "Kasali ka na? Bumalik dito"); the listahan form, its error and the button right.
- **/me:** greeting, the sky panel with the slip and the codename line left (after the draw, the theme sheet too, under the codename, so the columns end close together); the receiver's wishlist, tags, own wishlist and the personal link right (before the draw, the theme sheet as well). Right after joining the personal link comes first, under the greeting (its "I-send sa sarili mo" is the filled button then). Phones put it last otherwise.
- **Organizer:** the header line holds the wordmark and, for someone who is also a member, the folder tabs on the right. Status, share, draw, reminder and the other cards left; the members listahan right. Below 840px everything stacks.
- **Demo** (`/demo`): like join: "Subukan ang demo" with the parol and a "Nasa loob" listahan left; the name on a listahan, "Simulan ang demo" and a link to a real group right. On demo pages the guide sits at the top of the right column on /me (phones: right after the slip) and first on the organizer page's left column.
- **Reveal:** a fixed 16:9 stage scaled to fit any landscape window. A phone held upright gets the follow-along view instead (section 8).

Kept from the responsive pass:
- **/me:** the slip panel (with the codename line and, after the draw, the theme sheet) stays in view (sticky) while the right column scrolls, only on laptops and only when the window is at least 640px tall (not on a phone turned sideways).
- **Organizer:** the order of cards depends on the stage. Before the draw: share and join count, exclusions, the draw, then the rest. Right after the draw: "Names drawn" with the announcement, the slip count, then the rest. Later: the slip count, the reminder, then the rest. Phones read them in that order; laptops place each in a column.
- **Organizer:** the members listahan scrolls inside its card past about 14 rows on laptop, so a big group doesn't push the page down.
- **Every page fits:** no sideways scrolling at 360×740, 390×844, 430×932, 844×390, 768×1024, 1024×768, 1366×768 and 1920×1080.

The DOM keeps the phone order; the grid places each block on wider screens. On phone the blocks stack: heading, the hero or form, the main button, then lists.

## 6. Components

### Buttons
- **Primary:** ube fill, white Chelsea Market 20, height 58 (60 on laptop). Full width on phone, content width in the main column on laptop.
- **Secondary:** white, 1.5px ube border, Atkinson 700 16, height 48.
- **Text button / link:** Atkinson 700, underlined, 44px tall hit area ("Alisin", "Edit", "Kasali ka na? Bumalik dito").
- **Disabled:** `--ube-mist` fill, `--ube-soft` text, always followed by one line saying why.
- **Focus:** 3px `--ilaw` outline, 2px offset, on top of the ube fill or border.
- **Pressed:** scale 0.98.
- **Gold button:** reveal screen only. `--ilaw` fill, `--gabi` text.

### Inputs
- Height 54, white, 1.5px ube border, uneven 6px corners, label above in Atkinson 700.
- The name field shows typed text in Gochi Hand 28.
- Placeholder in `--ube-soft`. Focus: gold outline. Error: 2.5px `--sili` border plus the error message.
- Inside a listahan, inputs are 48px tall and sit in a two-line row.

### PIN boxes
- Four boxes, 54 by 60, white, 1.5px ube border, 4px corners, 10px gap.
- **Empty:** blank. **Filled:** 12px ube dot. **Focused:** `--ilaw-lit` fill, 2.5px border. **Error:** 2.5px `--sili` border on all four.
- `inputmode="numeric"`, auto-advance, paste fills all four.

### Error message
- `--sili-wash` box, 1.5px `--sili` border, `--sili` bold 15px text, a round "!" badge. `role="alert"`.
- Directly under the thing that failed. Says what happened and what to do.

### Tags
- Gift-tag shape (pointed left end, punched hole), no border. Label in Atkinson 700 14, value in Chelsea Market 19.
- Gold = party date, pink = budget, green = member count. One fact per tag. Not clickable.

### Listahan (notebook paper)
- White, blue rules every 40px, red margin line at 27px, 1px `--ube-line` edge, 40px left padding.
- Used for every list and the join form: wishlists, members, exclusions, weekly themes, "Paano 'to?".
- Title row in Chelsea Market 20. Rows: text left, status or text buttons right.
- Field labels on it are `--dahon` 14 bold. Names written on it are Gochi Hand 30.
- Empty state: one or two lines of `--ube-soft` text written on the lines, then the add row. No separate empty box.
- "Paano 'to?" uses a small star in the margin, not numbers.

### Capiz card
- White, 1.5px ube border, a 22px band of capiz panes along the top (pale gold, pale lilac, white, with ube lattice lines).
- For status and sharing: "Names drawn", join progress, group link, the announce card. At most one per column.

### Demo guide (demo groups only)
- A gold gift tag, rotated -1°: "Demo group 'to. Mabubura after 24 hours." (Atkinson 700 15).
- Under it a listahan with stars in the margin, never numbers: **My slip** · buksan ang slip mo, **Manage group** · ang dashboard, **Reveal** · hanggang sa finale, **Gumawa ng totoong group**, then the text button "Reset demo". The current page is bold text with "· nandito ka" instead of a link.
- On the reveal screen: the tag (at most 17vw wide, two lines) beside "Back to organizer page", and "My slip" / "Reset demo" before the sound button. A demo has at most 9 slips; with 3 to 9 the ring leaves that header row free (left of the top slip, above 16vh). `e2e/demo.spec.ts` checks they never overlap a slip.

### Theme sheet
- `--dahon` sheet with a cut fringe along the bottom edge. Lead-in in white bold 15, theme name in Chelsea Market 30 `--ilaw-lit`, meta in white 15.
- One per screen, on /me only.

### Private-link card
- `--tag-pink` paper, no border. Title, one line of explanation, the link in a dashed box with the secret part masked, then "Ipakita" and "Copy" (and "I-send sa sarili mo" where the phone can share).
- The links are the real ones with only the token masked: `monitomonita-ph.vercel.app/g/barkada-2026/admin?t=••••••••••` (organizer) and `…/g/barkada-2026/me?t=••••••••••` (personal). The slug is the public share link, so it shows.
- "Ipakita" shows the whole link until tapped again ("Itago"). Copy and Share always use the whole link.

### GC bubble and link box
- Bubble: white, 1.5px ube border, corners `4px 16px 16px 16px`. Shows exactly what will be pasted.
- Link box: white, 1.5px dashed ube border, bold, wraps anywhere.

### Tabs (organizer)
- Paper folder tabs on a 1.5px ube line. Active tab is white with a border on three sides. Chelsea Market 17.

### Light string
Wire: 1.3px ube line that sags (quadratic curve). Bulbs are ovals of slightly different sizes and tilts.
- **Decorative** (top of member pages, `LightString` in `components/page.tsx`): strung like real Christmas lights along a wall.
  - **One continuous wire** across the full width: a single path that sags between nails every 360px (a small ube nail head with a pale dot at each hanging point). It is drawn at true pixel size on a 3960px strip centred on the page and clipped to the window, so it never stretches and has no seams at any width. The middle of the window is the middle of a sag: a 390px phone shows one swag with a nail 15px in from each edge, and wider windows show more swags, the wire running off both edges.
  - **Bulbs**, 12 per swag, 30px apart, cycle gold, red, pale gold, green. Each hangs from the wire by a small dark ube socket cap.
  - **On:** bright glass with a small white highlight, like light on glass, and a flat painted halo behind it: two pale circles of the bulb's colour (14% and 22%; gold for pale-gold bulbs, which would vanish on the page), no blur, no box-shadow.
  - **Off:** a darker, unlit version of its colour (gold `#8C6F24`, red `#64202E`, pale gold `#A8976A`, green `#1C3B2D`), no highlight, no halo.
  - **Layers:** every bulb unlit at the bottom; four lit layers over them, one per bulb group by position (bulb i is in group i % 4, so the groups run along the wire, and since the colours cycle every 4 each group is one colour, like a real 4-channel set); the wire, nails and caps on top. A pattern animates only the four lit layers' opacity, picked by `data-mode` on the string (CSS keyframes in `globals.css`); no script runs per frame.
  - **Controller** (landing and /me): the string is a full-width button, "Palitan ang ilaw", like the button box on a real string. Every 8 seconds it moves to the next mode, and a tap moves on at once (the 8 seconds start again): **steady** (all on) → **alternate** (every other bulb, swapping every 0.8s) → **chase** (two neighbouring groups lit, running left to right, a step every 0.5s) → **fade** (all together, 2.5s down to a faint 30% glow and 2.5s back) → **twinkle** (irregular dips, each group on its own clock of 2.8–4.1s) → steady. It starts on steady, which is also the first paint before any JavaScript, and the 8 seconds start on page load, no tap needed. While the page is hidden the string is steady and lit (the animations are off, not frozen mid-pattern) and the cycle waits. Phones don't always say when a page is visible again (back from the back/forward cache, app switches in Messenger's in-app browser), so the controller reads the visibility again on `visibilitychange`, `pageshow`, `focus` and `resume`, once a second while it thinks the page is hidden, and before every mode change: a missed event can't leave the string dark or stuck. Keyboard focus: the gold ring, drawn inside the string (3px `--ilaw` over a thin ube band), since the string touches the top of the window. The controller (`components/light-controller.tsx`) is the only client code: it switches the attribute; the SVG is rendered on the server.
  - **Forms** (join, come back, create group): no controller and not a button, only a slow, calm twinkle: each group breathes from fully lit down to 55% and back over 4.2s, 5.4s, 6.6s and 7.8s, out of sync, so a bulb never goes off. (The organizer page has no decorative string, only the progress lights.)
  - **Never dark:** an off group keeps a faint glow (15% of its lit layer over the unlit bulb; 30% at the bottom of the fade, where every bulb dims together). Alternate and chase always have half the bulbs lit; twinkle's groups dip on their own clocks, so the whole string is never off at once.
  - **Safety:** each bulb flashes at most about once a second (worst measured: 0.77 a second in twinkle), every on/off edge is a 110–140ms ramp rather than a cut, and the string is a 44px band, never a full-screen flash. Measured by `scripts/perf/lights-perf.mjs`, with the frame rate (60 fps at 4x CPU throttling in every mode, landing and /me).
  - **Reduced motion:** no modes and no twinkle: every bulb steady and lit. The string is plain decoration there, not a button, so a tap does nothing.
- **Progress** (organizer): one bulb per member, left to right.
  - **Off:** white fill, ube outline.
  - **On:** `--ilaw` fill, ube outline.
  - **Newest:** `--ilaw-lit` fill with four short drawn rays.
  - Always paired with the count in words ("8 of 12 have opened their slip"). Over 12 members, bulbs shrink to fit one string up to 30, then wrap to a second string (balanced: 31 is 16 + 15), up to 60 members.
  - Over 60 members each bulb stands for a share (61 is 31 bulbs of 2, 150 is 50 bulbs of 3) with a small line under the strings: "Bawat ilaw: 3 tao". A share's bulb lights in proportion and never all until everyone is done. The count in words stays exact. See `/lab/lights`.
- **On the reveal:** off = `--gabi` fill with `--gabi-line` outline; on = `--ilaw`.

### The slip
- White paper, square corners, name in Gochi Hand, hanging from the white string by the clothespin, rotated about 3 degrees, flat offset shadow.
- **Folded:** smaller, with a diagonal fold and a second sheet behind. No rays yet; they arrive when the slip opens. A white paper label below reads "Tap to open your bunutan". The whole sky panel is the button.
- **Opened:** large, in front of a disc of gold rays. Heading "Ang monito mo ay…" sits top-left on the ube sky, clear of the rays.
- **After the reveal:** same panel, heading "Ang nagbigay sa'yo ay…".

### Landing video
- The 51-second demo video, self-hosted: MP4 (H.264, AAC), 1080p for laptops and 720p for phones and tablets, in `public/landing/` (13.2 and 6.9 MB; in `video/`, `npm run render:web`).
- **Poster first:** the hero picture is a still of the opened slip "Carlo" on the gold ray disc (the Remotion `LandingPoster` still, WebP 1280×720, 800×450 and 640×360, 39, 22 and 16 KB, `scripts/landing/make-poster.mjs`), `loading="eager"`, `fetchpriority="high"`: the page's largest paint. First paint is the poster only: no `<video>` and no video bytes until it's pressed.
- The whole poster is one `<button>` ("Panoorin ang demo video, 0:51") in a 16:9 box with the sky panel's corners and an ube fill. The play label is a white paper slip bottom left, tilted -2°, with the slip shadow: an ube play triangle, "Panoorin" in Chelsea Market and "0:51" in Atkinson 700 soft text (laptop 48px tall, 22px in from the corner; phone 44px, 12px in). Hover lifts the label 2px; keyboard focus draws the gold ring inside the poster's edge. Nothing else on the page has a new hover effect, and the page's one filled button stays "Create your group".
- Pressing it loads the player code (a dynamic import, started as the press begins) and plays with sound, native controls: in place on laptops and tablets, exactly in the poster's box, so nothing moves; full screen on phones (`requestFullscreen`, or the iPhone's own player). Leaving full screen pauses and brings the poster back; so does the end of the video, and the focus returns to the poster.

### Evening sky panel
- Ube with rays in a second ube tone, fanning from the parol's position. Holds the parol top-right and one subject: the slip (/me) or the bowl (the join drop, the demo start).
- One per screen.

## 7. Illustrations

All are small inline SVG, a few KB in total. Inline them once as `<symbol>`s and reference with `<use>`.

| File | What | Use |
|---|---|---|
| `parol.svg` | Paper parol with tails | Top-right of the sky panel; beside the group name on join and ready. Never smaller than 72px wide, never recoloured, at most one per screen |
| `parol-outline.svg` | Bamboo frame only | Behind the reveal centre text: dim (`#3D2A68`) during the reveal, `--ilaw` at the finale |
| `star.svg` | Gold star | "Names drawn" mark; margin bullet on "Paano 'to?" |
| `bowl.svg`, `bowl-on-dark.svg` | Glass bowl of slips | Ube lines on light backgrounds, lilac lines on the sky |
| `bilao.svg` | Woven tray | Under the bowl, always |
| `simbahan.svg` | Church silhouette, lit windows | Bottom of the reveal. Nowhere else |
| `parol-rays.svg` | Disc of gold rays | Behind the opened slip. In CSS: `repeating-conic-gradient(#F4C542 0 10deg, transparent 10deg 20deg)` on a circle |
| `light-string.svg`, `light-bulbs.svg` | Decorative string; bulb states | See Light string |
| `clothespin.svg` | Sipit | Holds the slip to the string |
| `capiz-pattern.svg` | 66 by 22 tile | Top band of the capiz card (CSS gradients give the same result) |
| `tag-shapes.svg` | Three tag tints | Reference for the CSS `clip-path` tag |
| `theme-fringe.svg` | 8 by 12 tile | Fringe under the theme sheet |

Do not add other Christmas clip art (snowflakes, Santa, pine trees, reindeer).

## 8. The four signature moments

All motion uses `transform` and `opacity` only.

1. **Landing bowl** (small, on the "Paano 'to?" listahan). The glass bowl (`bowl.svg` with ube lines, 80px wide) on its bilao (96px), tilted 2.5°, set on the list's top-right corner as if someone put it down on the notebook: it overhangs the corner (36px above the list, 12–16px past its right edge) and sits on the title row, so the list's 40px rows never change. Beside it, "Bumunot ka" (Atkinson 700, 14px, ube; "Bumunot ulit" after a draw), on the title row (under 380px, just above the list, so it stays clear of "Paano 'to?"). Bowl and label are one `<button>` ("Bumunot ka: sample na bunutan"). Hover: the bowl lifts 2px, nothing more. Tap and the bowl is mixed, like shaking the bowl before a real bunutan (700ms): the bowl rocks side to side on its foot (-5°, 4.5°, -3.5°, 2.5°, -1°, still) while the slips inside tumble and swap places: each hops, spins 120–480° and lands in another slip's spot, tilted as that spot is (the four inside reorder so none stays put; the two over the rim swap). A short buzz on Android (30, 60, 30, 60, 40ms; iPhone has none). Then one slip rises out of the bowl (350ms, ease-out, from a quarter of its size), unfolds (the same unfold as /me) and shows a sample name in Gochi Hand, with the slip's flat shadow, its -3° tilt and the gold sparkle. Where it lands: from 600px on the list's right half under the bowl, 200×107, covering no text (the list's lines end about 370px in; the list is 560px or wider); on phones on the list itself, left, 170×91, over the title row's lower edge and the first two steps, above them in z-order (the person tapped for it). Never over the poster, the caption or the buttons. On phones the sparkle is smaller (12 slower stars, a shorter life) so it stays around the slip, clear of the poster and the headline. The opened slip is a button too ("Ibalik ang slip"): tapping it folds it back into the bowl (the draw played backwards at twice the speed: the name un-writes, the slip folds and sinks into the bowl; no sparkle), and focus goes to the bowl. Tapping the bowl draws again: if a slip is open it drops back first, then the bowl mixes from where the slips landed and a new name comes up. Each slip in the bowl is its own element between the glass and the rim (`BOWL_SLIPS` in `components/bowl/bowl-art.tsx`), so the mix is composited transforms only. None of the bowl's animation code comes with the page: GSAP, the timeline (`components/landing/draw-timeline.ts`), the slip's markup and the sparkle (canvas-confetti) load on the bowl's first pointer down, focus or key down, never on scroll or idle. The bowl is a real button from first paint; a tap before the code arrives waits for it and then plays. Reduced motion: no shake or tumble; the slip appears open with the name, a 150ms cross-fade (and fades out the same way when it's put back), and GSAP never loads.
2. **Join drop.** On "Join the group", the name on the listahan lifts off as a slip (250ms), folds (300ms) and drops into the bowl (350ms, ease-in), then the page goes to /me. On the organizer page a new bulb lights as "newest".
3. **Slip unfold.** Tap the folded slip: it unfolds on the string in 3D (600ms), the name is written left to right like wet ink (about 900ms), the ray disc scales in from 0.6 and fades in (500ms), a short vibration on Android. Plays once per person; later visits show the opened state.
   - **Handwriting: kept as an ink reveal, not SVG strokes.** A window over the name opens letter by letter with a soft leading edge, moved with transforms only, pausing at spaces. An SVG stroke version needs each name turned into Gochi Hand outlines in the browser (opentype.js and the font file, well over 100 KB on /me) and Gochi Hand is a filled font, so stroking its outlines draws the edge of each letter twice instead of a pen line. The ink reveal costs nothing extra and reads as handwriting at slip size.
4. **Reveal.** A fixed 16:9 stage on a dark ube night.
   - **Start:** all slips show codenames, bulbs off, "Handa na?" and "Simulan ang reveal".
   - **Each Next** (button, Space or right arrow): the giver's slip flips to the real name (rotateY, 700ms) and gets the gold outline; the bulbs toward the receiver light one after another, 120ms apart; the centre shows "Si [codename] ay si… [Name]!".
   - **Large groups:** the ring always holds 12 slips. Past 12 members it is a moving window: on each step the oldest revealed slip slides out and the next codename slides in. A small 30-bulb string and "19 of 30" show overall progress.
   - **Finale:** after the last slip the button reads "Ilawan ang parol". Every bulb lights in a sweep, the parol frame behind the text turns gold, every slip gets a gold outline, and "Maligayang Pasko!" appears on a white paper banner in the centre (ube text, so it stays readable over the gold frame; at most 800px wide on the 1920 stage, so it stays inside the ring and never covers a slip). Gold paper stars fall for 3 seconds.
   - Readability: at 1920 by 1080 nothing is smaller than 24px; the name is about 190px.
   - **Projector mode** (landscape): after 3 seconds without the mouse, the controls fade out (back link, sound, fullscreen, "Lahat ng pairs", Start / Next / Previous), so the projected stage is clean. A mouse move or a tap brings them back; keyboard focus shows them too, and Space and the arrows keep working while they're hidden. They stay clickable, so a tap where a button is still presses it. The phone held upright is the remote and never hides its buttons.
   - The group name and count sit bottom left: the name on its own line (it wraps if it must, never cut short), the count under it. They stay while the controls are hidden.
   - **Phone as remote** (start screen, landscape): "Gawing remote ang phone mo" inside the ring. "Ipakita ang QR" shows the QR code: ube-black modules on white with a quiet zone, 360px on the stage, left of the title, "I-scan gamit ang phone mo." and the buttons ("Itago ang QR", "I-send sa phone ko" or "Copy organizer link"). The line "N slips, N sikreto…" steps aside while it shows, so "Handa na?" and the QR fit inside the ring. Hidden by default (the screen may already be projected).
   - **Phone follow-along** (any window taller than wide): no stage. The group name and "7 of 12" in gold top-left, the parol top-right, the centre text ("Handa na?", "Si … ay si… Jun!", "Maligayang Pasko!") in a column, then "Nabunyag na": the latest six revealed pairs as white slips in two columns ("Huling 6 lang ang ipinapakita. 11 pa ang nakatiklop."), every pair after the finale. Big groups add the small progress string. The organizer's buttons (Start, Previous, Next) sit under it, so the phone is still the remote.
   - The stage keeps the state for each step in its markup; motion only plays the change. Bulbs light by switching their state attribute, with a CSS transition and a delay per bulb; no script runs per frame for them.

Everywhere else there is no entrance animation. Motion only answers what the user did. The one ambient exception is the light string (see Light string): its controller modes on the landing and /me and its calm twinkle on forms, four opacity-only layers, about one flash a second per bulb at most, and none of it under reduced motion. Two small answers to a tap are described in section 15: the page transition on navigation and the demo's "Inihahanda" bowl.

Reduced motion (`prefers-reduced-motion`): no flips, drops or sweeps. States cross-fade in 150ms.

## 9. Performance on budget phones

- Textures are CSS gradients: sky rays and ray disc (`repeating-conic-gradient`), listahan rules, capiz band, fringe. No raster images, except the landing video's poster (the hero picture, WebP, 16 to 22 KB on phones, 16 or 39 KB on laptops).
- No `filter`, no `backdrop-filter`, no blurred `box-shadow`, no `background-attachment: fixed`.
- Inline the SVG symbols once in the document. Do not load them as separate requests on first paint.
- Animate `transform` and `opacity` only, on at most a dozen elements at a time. On the reveal, light bulbs by toggling a class with a transition delay, not with a JS loop per frame.
- Four font files, Latin subset, `font-display: swap`.
- Lazy-load animation code per screen (landing, /me unfold, reveal).
- Target: mobile Lighthouse performance 90 or higher, under 150 KB of JS on the join and /me routes.
- Where it stands (`scripts/perf/js-weight.mjs`, Lighthouse 12 on a production build): join 146.4 KB, /me 149.8 KB (0.2 KB left), landing performance 93–95 locally; PageSpeed Insights on the live site (Nov 19, 2026): 98 mobile, 100 desktop, and 100 for accessibility, best practices and SEO. The in-between states (section 15) cost about 1.5 KB on every page (the offline retry in Next's router, and the branded error page in place of Next's own); /me paid for them by loading its rare cards on demand (Mag-set ng PIN, switch member, monito updated) and keeping the paper module out of its JS. Anything new on /me needs a saving first. The framework alone is about 135 KB, so member pages keep their own code small: no Motion on /me (press and fade-ins are CSS transitions and Web Animations), a small class merger in `lib/utils.ts` instead of a full tailwind-merge, the join drop loads only after joining, and nothing on /me imports `next/link`. (Cards with buttons stay in the main bundle: a lazy one shows before it can be tapped.)

## 10. Accessibility

- All text pairs meet WCAG AA (table above).
- State is never colour alone: bulbs come with a count, errors with text and an icon, "Opened" with a tick and the word.
- Every animated moment is a real `<button>` with a text label (bowl, folded slip, Next).
- Visible focus on everything: 3px gold outline over an ube edge.
- Names in Gochi Hand are real text, not images.
- Illustrations are decorative: `aria-hidden="true"`.
- Reveal stage works with keyboard (Space, arrows) and announces each pair in an `aria-live` region.
- Tap targets 44px or more. Body text 16px or more.

## 11. Copy

Warm, short, a little Taglish. Sentence case. Buttons say exactly what happens, and the confirmation uses the same words.

| Instead of | Write |
|---|---|
| Submit | Join the group |
| Log in | Buksan ang slip ko |
| Generate assignments | Draw names → Names drawn |
| Success | Ready na ang group mo! |
| Wrong PIN | Mali ang PIN. Subukan ulit, o tanungin ang organizer. |
| Registration closed | Tapos na ang bunutan |
| No items | Wala pang laman ang wishlist mo. Add something para sa monito mo. |
| Exclusions | Bawal magkabunot |

Sample links use `monitomonita-ph.vercel.app`. Private links are always shown masked until "Ipakita".

## 12. Do

- Put the parol on landing, join, ready, /me and the reveal.
- Set every person's name and codename in Gochi Hand.
- Give each kind of content its own material.
- Keep the landing and laptop layouts asymmetric: text left, picture right. On the landing the one picture is the video's poster, beside the headline, with "Paano 'to?" and its small bowl under it; no second hero, no second row.
- Pair lights with words.
- Test on a real budget Android phone opened from Messenger.

## 13. Don't

- No italic display serifs. No all-caps headings.
- No identical rounded cards, no pill buttons, no circular PIN boxes.
- No blur, glow or soft shadow anywhere. No gradient fills on controls.
- No stripe or grain textures on the page background.
- No numbered 1-2-3 steps, no centred hero.
- No thick outlines or hard offset shadows on buttons and cards.
- No parol red, green or gold as flat fills on controls or cards. The theme sheet is the one green surface.
- No text on the gold rays.
- No emoji, snowflakes, Santa or rainbow confetti.
- No Gochi Hand for anything that is not a name. No Chelsea Market for a person's name.

## 14. Where the build differs from the reference screens

The screens in `docs/design/` were drawn before some product rules were settled. The build keeps the product rules:

- **Create group** has no organizer name and PIN. The organizer joins like everyone else ("Kasali ka rin ba?" on the organizer page). Theme weeks stay editable inputs on the listahan (two-line rows), not fixed text.
- **One filled button per screen.** The group-ready screen draws two; "Copy link" stays filled and "Pumunta sa group ko" is the secondary button.
- **Coming back** says "Mali ang pangalan o PIN" for every failure (wrong PIN, unknown name, locked), never "Mali ang PIN", so the page can't be used to find out who is in a group.
- **Names are always Gochi Hand**, also in list rows (members, bawal pairs), on the reveal slips ("→ kay *Marco*") and on the phone follow-along view, where the screens set some in bold Atkinson. Inline names are 1.18em, never under 20px.
- **More states than the screens show** use the same materials: before the draw /me shows the codename on the slip in the sky panel; the organizer page keeps share, exclusions, theme weeks, party details and the reveal link after the draw (as listahan, tags and capiz cards); "My slip / Manage group" and the reminder type ("Na-draw na" / "Theme reminder") are folder tabs; small one-card states (not your group, removed, switch device) sit in a 560px column.
- **After the reveal** /me follows screen 11: the giver on the slip, "Tapos na ang reveal", the tags and the greeting. Wishlists and the theme sheet are gone by then.
- **Join drop**: the overlay is the evening sky panel with the bowl, the parol and "Kasali ka na!".
- **/me on laptops**: the personal link sits at the end of the right column, not under the slip as in screen 09. The slip block stays in view while the page scrolls (kept from the responsive pass), and with the link under it the left column was taller than a 768px window.

## 15. In-between states

Every wait, failure and dead end uses the same materials as the page it belongs to. Nothing generic: no spinners, no grey skeleton bars, no raw error text.

### Loading (`components/loading-shapes.tsx`)
Each page streams in behind its own materials, empty, with one line of copy in a `role="status"`: "Sandali lang…" in Chelsea Market display, then what's happening in soft text.

| Page | Placeholder | Line |
|---|---|---|
| Join, come back, closed | The parol, three tags with their labels and "…", the listahan form with blank lines and four empty PIN boxes | Binubuksan ang listahan ng group. |
| /me | The evening sky with the string, the sipit and a dashed `--ube-line` slip outline (the slip isn't here yet), the party and budget tags, a blank "Wishlist mo" listahan | Hinahanap ang slip mo. |
| Organizer | The capiz card with 12 unlit progress bulbs ("Ilan na kaya?"), a dashed link box, a blank "Members" listahan | Binibilang ang mga kasali. |
| Reveal | The dim parol frame (`#3D2A68`) on the night | Inaayos ang entablado para sa reveal. |

Server-only markup and CSS: no JS, no motion.

### Pending buttons (`lib/use-pending-label.ts`)
Every form action is disabled while it runs, so nobody submits twice, and its label says what is happening, with the button's own verb:

| Button | Pending |
|---|---|
| Join the group | Sumasali… |
| Buksan ang slip ko | Binubuksan ang slip mo… |
| Create group | Ginagawa ang group… |
| Simulan ang demo | Inihahanda ang demo group… |
| Oo, i-draw na / Oo, i-redraw / Tanggalin at i-redraw | Nagbubunot… / Nagbubunot ulit… |
| I-save, I-save ang PIN | Sine-save… |
| Add (bawal pair) | Dinadagdag… |
| Oo, gumawa ng bago (new link) | Gumagawa ng link… |
| Oo, tanggalin | Tinatanggal… |
| Oo, simulan na (reveal) | Sinisimulan… |

While the connection is down, any pending label reads **"Hinihintay ang signal…"** instead: the action waits and runs once the connection is back (Next's `experimental.useOffline`).

### Demo start ("Inihahanda ang demo group…")
Over the /demo page while the demo is built: the evening sky card of the join drop (parol, bowl on the bilao) with three paper slips dropping into the bowl one after another (a 1.35s loop, transform and opacity, CSS keyframes), the title in Chelsea Market and "Naglalagay ng 9 na slip sa bowl." Reduced motion: the slips rest in the bowl.

### Wishlist (optimistic)
- Add, edit and Alisin show at once. A wish that's saving shows "Sine-save…" (or "Hinihintay ang signal…") in place of Edit and Alisin.
- If the server says no, the list rolls back by itself and the error message says what didn't save ("Hindi na-save ang “Mug”. …", "Hindi naalis ang “Payong”. …"). A failed add or edit puts what was typed back in its field with the field errors, so trying again is one tap.
- Success is one line on the listahan in `--dahon` bold: "Na-save!" or "Naalis na!", announced (the full sentence is screen-reader text). The cursor returns to the add field.

### Offline
- A paper strip pinned to the bottom of the window: white, 1.5px ube border, 3px corners, an unlit bulb and "**Offline ka.** Itutuloy namin ang ginagawa mo pagbalik ng signal." When the connection returns: a lit gold bulb and "Balik na ang signal!" in `--dahon` for 3 seconds. A polite live region; no motion.
- It is a small inline script in the root layout (`lib/offline-banner.ts`), so it works before hydration and costs no JS file.
- Actions and navigations that fail offline wait and run again once the connection is back (never an error screen); their buttons say "Hinihintay ang signal…". A full page load offline still needs the network (no service worker).

### Errors
- **404** (`app/not-found.tsx`): the light string, the wordmark, a fallen slip under an empty sipit on the wire, "Naligaw ang slip na 'to", "Wala rito ang hinahanap mo. Baka kulang ang link, o may typo." and a hint to copy the GC link again; "Bumalik sa home" (filled) and "Gumawa ng group".
- **Something broke** (`app/global-error.tsx`): a tipped slip, "Ay, may sumabit." and "Ligtas ang group at ang slip mo, subukan lang ulit.", or, offline, "Nawala ang signal"; "Subukan ulit" (filled, re-fetches) and "Bumalik sa home". Never the error text.

### Link states (each says what to do next)
- **Old personal link or saved login** (the organizer issued a new one): the fallen slip, a capiz card "Hindi na gumagana ang link na 'to", "Baka gumawa na ng bagong link ang organizer…", "Bumalik gamit ang PIN" (filled) and "Walang PIN o nakalimutan? Hingin ang bagong link sa organizer."
- **Removed member**: "Wala ka na sa group na 'to", "Tinanggal ka ng organizer…", "Kung mali, i-message ang organizer.", "Bumalik sa home".
- **Expired demo** (a group this browser was in, now gone; only demos are ever deleted): the fallen slip, "Tapos na ang demo na 'to", "Simulan ulit ang demo" (filled) and "Gumawa ng totoong group".
- These pages show the wordmark as a plain link home.

### Page transitions
On navigation between the landing, /demo, /new, the organizer page and the 404, React's `<ViewTransition>`: the old page fades out (120ms), the new one fades in rising 8px (200ms). Only on navigation (refreshes and saved changes don't animate), and the light string holds still. Never on the signature moments: not on the reveal, and not on the join page or /me (the join drop hands off between them, and the slip unfolds on /me). Chromium (most Android phones, Chrome and Edge) and Firefox only: on WebKit (Safari, every iPhone browser) the page crashed during view transitions in testing, so a small inline script (`lib/view-transition-guard.ts`) turns them off there and pages just swap. None with reduced motion.

### Icons and colour
- Tab icon: the parol's disc and star (`app/icon.svg`, `favicon.ico`). Home screen: the whole parol on the ube evening sky (`apple-icon.png`, `public/icons/`), from `scripts/icons/make-icons.mjs`.
- `theme-color` is ube `#3F1F63`. The manifest names the app "Monito Monita" and opens in the browser (`display: "browser"`): a standalone window on iPhone keeps its own cookies and would log people out of their group.

### Feedback words
Copy buttons say **"Copied!"** with a tick; saves say **"Na-save!"** (or "Na-save ang PIN mo!", "Na-save ang details."); removals say what's gone. A confirmation uses the same words as its button.

