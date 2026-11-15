# Design

Monito Monita, "Handmade Pasko". This replaces the previous DESIGN.md.

Reference files:
- `Monito Monita Final.html`: every screen and state, static, tokens as CSS variables
- `final/png/`: screenshots, phone (390px) and laptop (1366px), 2x
- `final/svg/`: every illustration

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

Non-text (needs 3.0 where it carries meaning):

| Element | Pair | Ratio |
|---|---|---|
| Input / PIN border | `#3F1F63` on `#FFFFFF` | 13.2 |
| Off bulb outline | `#3F1F63` on `#FFFFFF` | 13.2 |
| Off bulb outline (reveal) | `#9C87C4` on `#1E1238` | 5.6 |
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

| Width | Layout |
|---|---|
| Phone, under 600px | One column, 20px gutters. Light string across the top |
| Tablet, 600 to 1023px | One column, max 560px, centred. The sky panel may grow to 420px tall. Organizer page may use two columns from 840px |
| Laptop, 1024px and up | Two columns inside a 1120px container: main column (flexible) and a 420px side column, 48px gap. Light string repeats in swags of about 340px across the full width |

What goes where on laptop:
- **Landing:** headline, button and "Paano 'to?" left; evening sky with bowl and parol right. Never centred.
- **Create group:** form left; live GC preview right.
- **Join:** group, parol and tags left; listahan form and button right.
- **/me:** greeting, sky panel with the slip, codename and personal link left; wishlists, theme sheet and tags right.
- **Organizer:** status, share, exclusions and actions left; members listahan right. Tabs sit on the right of the header line.
- **Reveal:** always a fixed 16:9 stage scaled to fit the screen.

On phone the same blocks stack in this order: heading, the hero or form, the main button, then lists.

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

### Theme sheet
- `--dahon` sheet with a cut fringe along the bottom edge. Lead-in in white bold 15, theme name in Chelsea Market 30 `--ilaw-lit`, meta in white 15.
- One per screen, on /me only.

### Private-link card
- `--tag-pink` paper, no border. Title, one line of explanation, the link in a dashed box with the secret part masked (`/o/••••••••••••`, `/me/••••••••••`), then "Ipakita" and "Copy".

### GC bubble and link box
- Bubble: white, 1.5px ube border, corners `4px 16px 16px 16px`. Shows exactly what will be pasted.
- Link box: white, 1.5px dashed ube border, bold, wraps anywhere.

### Tabs (organizer)
- Paper folder tabs on a 1.5px ube line. Active tab is white with a border on three sides. Chelsea Market 17.

### Light string
Wire: 1.3px ube line that sags (quadratic curve). Bulbs are ovals of slightly different sizes and tilts.
- **Decorative** (top of member pages): bulbs cycle gold, red, pale gold, green. One swag on phone, repeating swags on laptop.
- **Progress** (organizer): one bulb per member, left to right.
  - **Off:** white fill, ube outline.
  - **On:** `--ilaw` fill, ube outline.
  - **Newest:** `--ilaw-lit` fill with four short drawn rays.
  - Always paired with the count in words ("8 of 12 have opened their slip"). Over 12 members, bulbs shrink to fit one string up to 30, then wrap to a second string.
- **On the reveal:** off = `--gabi` fill with `--gabi-line` outline; on = `--ilaw`.

### The slip
- White paper, square corners, name in Gochi Hand, hanging from the white string by the clothespin, rotated about 3 degrees, flat offset shadow.
- **Folded:** smaller, with a diagonal fold and a second sheet behind. No rays yet; they arrive when the slip opens. A white paper label below reads "Tap to open your bunutan". The whole sky panel is the button.
- **Opened:** large, in front of a disc of gold rays. Heading "Ang monito mo ay…" sits top-left on the ube sky, clear of the rays.
- **After the reveal:** same panel, heading "Ang nagbigay sa'yo ay…".

### Evening sky panel
- Ube with rays in a second ube tone, fanning from the parol's position. Holds the parol top-right and one subject: the bowl (landing) or the slip (/me).
- Landing only: the simbahan silhouette along the bottom.
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
| `simbahan.svg` | Church silhouette, lit windows | Bottom of the landing sky and the reveal. Nowhere else |
| `parol-rays.svg` | Disc of gold rays | Behind the opened slip. In CSS: `repeating-conic-gradient(#F4C542 0 10deg, transparent 10deg 20deg)` on a circle |
| `light-string.svg`, `light-bulbs.svg` | Decorative string; bulb states | See Light string |
| `clothespin.svg` | Sipit | Holds the slip to the string |
| `capiz-pattern.svg` | 66 by 22 tile | Top band of the capiz card (CSS gradients give the same result) |
| `tag-shapes.svg` | Three tag tints | Reference for the CSS `clip-path` tag |
| `theme-fringe.svg` | 8 by 12 tile | Fringe under the theme sheet |

Do not add other Christmas clip art (snowflakes, Santa, pine trees, reindeer).

## 8. The four signature moments

All motion uses `transform` and `opacity` only.

1. **Landing bowl.** Tap the bowl: slips jiggle (200ms), one rises out (350ms, ease-out), unfolds (rotateX, 400ms) and shows a sample name. Each tap gives a new name. The parol sways a few degrees on a slow loop.
2. **Join drop.** On "Join the group", the name on the listahan lifts off as a slip (250ms), folds (300ms) and drops into the bowl (350ms, ease-in), then the page goes to /me. On the organizer page a new bulb lights as "newest".
3. **Slip unfold.** Tap the folded slip: it unfolds on the string in 3D (600ms), the name is drawn like pen strokes (SVG stroke animation, 900ms), the ray disc scales in from 0.6 and fades in (500ms), a short vibration on Android. Plays once per person; later visits show the opened state.
4. **Reveal.** A fixed 16:9 stage on a dark ube night.
   - **Start:** all slips show codenames, bulbs off, "Handa na?" and "Simulan ang reveal".
   - **Each Next** (button, Space or right arrow): the giver's slip flips to the real name (rotateY, 700ms) and gets the gold outline; the bulbs toward the receiver light one after another, 120ms apart; the centre shows "Si [codename] ay si… [Name]!".
   - **Large groups:** the ring always holds 12 slips. Past 12 members it is a moving window: on each step the oldest revealed slip slides out and the next codename slides in. A small 30-bulb string and "19 of 30" show overall progress.
   - **Finale:** after the last slip the button reads "Ilawan ang parol". Every bulb lights in a sweep, the parol frame behind the text turns gold, every slip gets a gold outline, and "Maligayang Pasko!" appears on a white paper banner in the centre (ube text, so it stays readable over the gold frame). Gold paper stars fall for 3 seconds.
   - Readability: at 1920 by 1080 nothing is smaller than 24px; the name is about 190px.

Everywhere else there is no entrance animation. Motion only answers what the user did.

Reduced motion (`prefers-reduced-motion`): no flips, drops or sweeps. States cross-fade in 150ms.

## 9. Performance on budget phones

- Textures are CSS gradients: sky rays and ray disc (`repeating-conic-gradient`), listahan rules, capiz band, fringe. No raster images.
- No `filter`, no `backdrop-filter`, no blurred `box-shadow`, no `background-attachment: fixed`.
- Inline the SVG symbols once in the document. Do not load them as separate requests on first paint.
- Animate `transform` and `opacity` only, on at most a dozen elements at a time. On the reveal, light bulbs by toggling a class with a transition delay, not with a JS loop per frame.
- Four font files, Latin subset, `font-display: swap`.
- Lazy-load animation code per screen (landing, /me unfold, reveal).
- Target: mobile Lighthouse performance 90 or higher, under 150 KB of JS on the join and /me routes.

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
- Keep the landing and laptop layouts asymmetric: text left, picture right.
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
