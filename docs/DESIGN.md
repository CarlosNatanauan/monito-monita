# Design

People use this once a year, a few times each. So every visit has to feel special. "Premium" here means **a few unforgettable moments, and everything else fast, calm, and obvious.**

Visual reference: the screen mockups in `docs/design/*.png` (`01-landing` to `09-party-reveal`, plus `10-components`).

## The concept: bunutan, after Simbang Gabi

The product is still **bunutan**: folded paper slips drawn from a glass bowl.

- Every person is a **folded paper slip** with their name handwritten on it
- The group is a **glass bowl** that fills with slips as people join
- Finding out your monito means **unfolding your slip**
- The party reveal lights up one by one, like a **parol** coming on

The look is the **puto bumbong stall outside the church**: ube purple, banana leaf green, white niyog, margarine gold, and a string of Christmas lights overhead. The lights are a second motif with one job: they show progress.

## Color

| Token | Hex | Use |
|---|---|---|
| `ube` | `#4B2472` | Text, primary buttons, theme card |
| `ube-soft` | `#5A4A6B` | Secondary text, placeholders |
| `ube-line` | `#8E7BA6` | Input borders, light wire, "off" light outline |
| `ube-mist` | `#D9D0E2` | Disabled button fill |
| `dahon` | `#1F6B45` | Hero panels (slip, landing arch), success text, numerals |
| `leaf-wash` | `#EDF3E6` | Page background, inset fields, chat bubble |
| `niyog` | `#FFFFFF` | Cards, slips, inputs |
| `margarine` | `#F4C542` | Light: on bulbs, glow, slip halo. Never text on light backgrounds |
| `margarine-core` | `#FFF3C4` | Centre of a glowing bulb |
| `margarine-edge` | `#9A6B00` | Outline of on/glowing bulbs on light backgrounds |
| `bilao` | `#C9A56B` / `#8C6A35` | The tray under the bowl only |
| `sili` | `#B3261E` | Errors only |
| `sili-wash` | `#FDECEA` | Error message background |
| `gabi` | `#0D2B1F` | Reveal screen background |
| `gabi-leaf` | `#1F4A36` | Unrevealed slips and off bulbs on reveal |
| `gabi-mist` | `#DCEBDD` | Text on `gabi` and `gabi-leaf` |
| `gabi-line` | `#7FA08C` | Off bulb outline on reveal |
| `ube-night` | `#2A1245` | Text on the margarine reveal button |

In code: `bilao` is split into `bilao` and `bilao-edge`. The reveal centre glow is `#18432F`.

### Contrast (WCAG AA, all pass)

| Text | Background | Ratio |
|---|---|---|
| `ube` | `leaf-wash` | 10.3 |
| `ube` | `niyog` | 11.7 |
| `ube-soft` | `leaf-wash` | 7.1 |
| `ube-soft` | `niyog` | 8.0 |
| `ube-soft` | `ube-mist` (disabled) | 5.4 |
| `dahon` | `niyog` | 6.5 |
| `dahon` | `leaf-wash` | 5.7 |
| white | `dahon` | 6.5 |
| white | `ube` | 11.7 |
| `margarine` | `ube` | 7.2 |
| `sili` | `niyog` | 6.5 |
| `sili` | `sili-wash` | 5.7 |
| `#DCEBDD` | `gabi-leaf` | 8.0 |
| `margarine` | `gabi` | 9.5 |
| `#2A1245` | `margarine` (reveal button) | 9.8 |
| white | `sili` ("!" in the error circle) | 6.5 |
| `gabi-mist` | `gabi` | 12.3 |
| `gabi-mist` | `#18432F` (reveal centre) | 9.0 |
| white | `gabi` | 15.2 |
| white | `#18432F` (reveal centre) | 11.2 |
| white | `gabi-leaf` | 10.0 |
| `margarine` | `#18432F` (reveal centre) | 6.9 |
| `gabi-line` | `gabi` (disabled button on reveal) | 5.3 |

Non-text: `ube-line` on white is 3.8:1, `margarine-edge` on white is 4.7:1. Bulb state never carries meaning alone; a text count always sits next to it.

Rules:
- One filled ube button per screen: the main action.
- Gold is light. Bulbs, halo, sparkles. Never a fill for cards, never text on light.
- Green panels are for the slip moments (landing arch, /me hero). Not for ordinary cards.
- Red appears only when something went wrong.

## Type

| Role | Typeface | Sizes | Notes |
|---|---|---|---|
| Large headings | **Instrument Serif Italic** | 30 / 38 / 46 | 30px minimum. Page title, group name, "Ang monito mo ay…", theme name, "Names drawn", step numerals |
| Everything else | **Manrope** | 14 / 16 / 20 | Card titles 20/800. Body 16/400. Labels and buttons 16–17/700. Small text 14/500, never 14/400 |
| Names and codenames | **Gochi Hand** | 20 / 26 / 30 / 64 | Slips, codenames, and the name field as the user types. Nowhere else |

- Sentence case everywhere. No all-caps labels.
- Body is 16px. 14px is for helper text and meta only, always weight 500 or 700.
- Line height: 1.5 for Manrope, 1.0 for Instrument Serif headings.
- Load: Manrope 400/500/700/800, Instrument Serif italic 400, Gochi Hand 400. Latin subset, `font-display: swap`. That is 6 small files; do not add more weights.

## Textures (kept light)

Two textures, both pure CSS, no images:

1. **Leaf veins (page):** `repeating-linear-gradient(115deg, rgba(31,107,69,.08) 0 1px, transparent 1px 14px)` over `leaf-wash`.
2. **Leaf veins (green panels):** `repeating-linear-gradient(115deg, rgba(255,255,255,.1) 0 1px, transparent 1px 12px)` over `dahon`.

Budget phone rules:
- No `background-attachment: fixed`, no `backdrop-filter`, no SVG noise filters, no blur filters.
- Paint the page texture once on `body`. Cards are flat white on top.
- Glows are `box-shadow` on small elements only (bulbs, the slip). Never animate `box-shadow` on more than a handful of elements at once; for the header twinkle, cross-fade the `opacity` of a pre-glowing layer instead.
- Animate only `transform` and `opacity`.

## Components

### Buttons
- **Primary:** `ube` fill, white 17/700 text, height 58, radius 999. One per screen.
- **Secondary:** white fill, 1.5px `ube` border, `ube` 16/700 text, height 48–52, radius 999.
- **Disabled:** `ube-mist` fill, `ube-soft` text. Always pair with a line saying why.
- **Text link:** `ube` 16/700, underlined, at least 44px tall tap area.
- Pressed: scale to 0.98. Focus: 4px `margarine` ring at 80% opacity outside a 2px `ube` border.

### Cards
- White, radius 24, padding 20, no border, no shadow. Gap between cards 16.
- Title: Manrope 20/800. Rows inside are divided by `1.5px dashed rgba(75,36,114,.25)`.
- **Detail rows** (party, budget): label in `ube-soft`, 2px dotted leader, value in bold.
- **Theme card:** `ube` fill, "Ngayong linggo" in `margarine` 14/700, theme name in Instrument Serif Italic 38 white.
- **Empty state:** inside the card, a `1.5px dashed ube-line` box, radius 16, padding 16, `ube-soft` text. One sentence, says what to do next.

### Inputs
- Height 58 (52 inside cards), radius 18, white, 1.5px `ube-line` border, 18px side padding.
- Label above: Manrope 16/700. Helper below: 14/500 `ube-soft`.
- The name field renders typed text in Gochi Hand 26.
- Focus: 2px `ube` border plus the 4px gold ring.

### PIN boxes
- Four circles, 60×60, 12px gap, white, 1.5px `ube-line` border. Filled digit shows a 14px `ube` dot.
- Focused box: 2px `ube` border plus gold ring.
- Error: all four get a 2px `sili` border.
- Use `inputmode="numeric"` and `autocomplete="one-time-code"` off; move focus automatically.

### Error message
- `sili-wash` box, radius 14, padding 10/12, `sili` 14/700 text, a 20px `sili` circle with a white "!". `role="alert"`.
- Sits directly under the field it belongs to. Says what happened and what to do: "Mali ang PIN. Subukan ulit, o tanungin ang organizer."

### The lights
One wire, a row of bulbs. Bulb: 12×16 ellipse on light screens, 28×28 circle on the reveal at 1080p.

| State | Light background | Reveal screen | Meaning |
|---|---|---|---|
| Off | white fill, 1.5px `ube-line` outline | `gabi-leaf` fill, 1.5px `#7FA08C` outline | Not yet |
| On | `margarine` fill, 1.5px `margarine-edge` outline | `margarine` fill | Done |
| Glowing | `margarine-core` fill, same outline, `0 0 10px 4px rgba(244,197,66,.9)` | `margarine-core`, `0 0 28px 10px rgba(244,197,66,.9)` | Newest / active |

Where they appear:
- **Header string** (landing, join, /me): 7 bulbs under a 2px `ube-line` wire. All on; one in three glows, shifting every ~1.1s. Static under reduced motion.
- **Progress** (organizer): one bulb per member. Join progress: on per member, newest glows. After the draw: on = opened, off = not yet, most recent glows. Always next to the text count ("8 of 12 have opened their slip").
- **Reveal ring:** see below.

Lights are never decoration inside cards and never a loading spinner.

### The slip
- White paper, radius 6, two faint crease lines (`rgba(75,36,114,.12)`, 1px, centred both ways), rotated -2° to -5°.
- Name in Gochi Hand between tildes: `~ Carlo ~`.
- **Folded:** 190×96, a diagonal flap line, a second sheet peeking behind at +3°, soft gold glow, on a `dahon` panel with "May nabunot ka na!" and an outlined pill "Tap to open your bunutan". The whole panel is one button.
- **Opened (hero):** 300×160, name at 64px, 3px `margarine` outline, `0 0 50px 10px rgba(244,197,66,.75)` halo plus a drop shadow. It hangs 44px below the bottom edge of the green panel so it clearly sits on top of the card, not inside it. Three or four small gold diamonds around it.
- **Small slips** (bowl, reveal): 56×26 and 136×64, same paper, no creases.
- The unfold animation plays once. Later visits show the opened state.

### The bowl
- Glass: translucent white gradient, 1.5px white outline, an elliptical rim, one vertical highlight streak. Slips inside at mixed angles, two poking over the rim.
- Sits on a `bilao` ellipse.
- **Landing only:** inside a `dahon` arch (radius 160 on top, 24 at the bottom) with an inset 2px `margarine` line. Tapping the bowl draws a sample slip above it.
- The arch is not used anywhere else.

### Segmented control (My slip / Manage group)
White pill track, 4px padding. Active segment: `ube` fill, white text. Inactive: `ube-soft` text.

## The 4 signature moments

1. **Landing:** tap the bowl in the arch, a slip rises and unfolds with a sample name. Then "Create your group".
2. **Joining:** the name you type is already handwriting. On submit the slip folds and drops into the bowl; a new bulb lights on the organizer's string.
3. **Your monito:** folded slip on the green panel. Tap, it unfolds in 3D, the name is drawn like pen strokes, the gold halo fades in, short buzz on Android.
4. **Party reveal:** below.

## Reveal screen (projector / TV, 1920×1080)

- Background: `gabi` with a soft `#18432F` centre and faint leaf veins. Dark, but green and gold, not black and neon.
- **Outer ring:** 12 slips on an ellipse (radius about 744×392 at 1080p), each 272×128, rotated ±2–3°. Unrevealed: `gabi-leaf` with the codename in Gochi Hand 32. Revealed: white, real name in Gochi Hand 52, "→ kay [receiver]" in Manrope 24/700.
- **Inner ring:** a string of bulbs on a smaller ellipse, 4 bulbs between each pair of slips.
- **Centre:** "Si [codename] ay si…" in Instrument Serif Italic 64, the name in Gochi Hand ~184 in `margarine`, "Ang monito niya: [receiver]" in Manrope 40/700.
- **Next** (organizer taps, or Space / →):
  1. The giver's slip flips (rotateY, 0.7s) and gets the gold outline and halo.
  2. The 4 bulbs toward the receiver light one after another (140ms apart) and glow.
  3. Bulbs from earlier steps settle to "on".
- **Finale:** after the 12th, the button reads "Ilawan ang parol". Every bulb goes to glowing in a sweep around the ring, every slip gets its halo, a gold radial glow fades in behind, and the centre reads "Maligayang Pasko!". Gold star confetti only.
- Minimum text size on this screen: 24px at 1080p. Nothing important in the outer 5% of the frame.
- Reduced motion: no flip or travel; slips and bulbs cross-fade.

### Large groups (planned for Phase 3, not built yet)

The ring is drawn for 12 slips. Groups of up to 16 keep every slip on the ring. **Above 16:**

- The ring shows a **moving window of 12 slips centred on the current pair**: the giver on screen sits in the same spot on the ring, with the 5–6 slips before and after it in loop order around it.
- **Next** rotates the window by one slip (transform only: the ring turns, the slip leaving the window fades out and the one entering fades in), then the usual flip and bulb travel play. **Previous** turns it back.
- Slips in the window keep their state: earlier pairs show revealed, later ones show codenames. The loop still reads person to person.
- A small count stays in the corner ("23 of 40") so the room knows how far along it is.
- After the last pair, the finale plays on the window, then the screen shows the **full list of pairs** (giver → receiver, in loop order), in columns that fit 1080p at 24px minimum.
- Reduced motion: the window swaps slips with a cross-fade, no rotation.
- Same rule as now: the screen only ever receives the pair on screen until `REVEALED`.

## Everything else: quiet

- Forms, wishlists and the organizer page are plain and fast. No entrance animations.
- Motion only answers what the user did.
- One column, left-aligned, max width 480px for member pages. The organizer page can go wider on desktop.

## Copy

Warm, short, a little Taglish. Sentence case. Buttons say exactly what happens, and the confirmation uses the same words ("Draw names" → "Names drawn").

| Instead of | Write |
|---|---|
| Submit | Join the group |
| Log in | Buksan ang slip ko |
| Generate assignments | Draw names |
| Wrong PIN | Mali ang PIN. Subukan ulit, o tanungin ang organizer. |
| No items | Wala pang wishlist. Add something para hindi mahirapan ang monito mo. |

## Do

- Use Instrument Serif Italic for one large heading per card or screen section.
- Keep cards flat white. Let the green panel and the gold halo do the work.
- Pair every row of lights with a number in text.
- Keep tap targets at 44px or more.
- Test on a real budget Android phone opened from Messenger.

## Don't

- Don't set Instrument Serif below 30px, or use it upright.
- Don't use Gochi Hand for anything that isn't a name or codename.
- Don't use gold for text or fills on light backgrounds.
- Don't add shadows to cards, gradients to buttons, or a third texture.
- Don't use red for anything but errors, or more than one filled button per screen.
- Don't add other light colours. Bulbs are gold or off.
- Don't use rainbow confetti, snowflakes, or Santa. This is a Filipino Christmas.
- Don't animate anything other than `transform` and `opacity`.

## Tools, performance, accessibility

Unchanged from the previous version: Motion for everyday UI, GSAP for the unfold, handwriting and reveal timelines, lazy-load animation code per screen, mobile Lighthouse 90+, `prefers-reduced-motion` shows final states with a simple fade, every animated moment is a real button, visible keyboard focus.
