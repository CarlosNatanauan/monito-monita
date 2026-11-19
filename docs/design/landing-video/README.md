# Handoff: Landing page, video in the first screen

## Overview

The Monito Monita landing page (monitomonita-ph.vercel.app) has a ~51-second demo video in a "See how it works" section below the fold. Most laptop visitors never scroll to it, and on phones it is further down. This change moves the video into the first screen without displacing the primary action.

The page serves two audiences:
- **Organizers**, who should press "Create your group" (the one primary button).
- **Portfolio visitors and recruiters**, who want to watch the video or try the demo (both secondary).

Three layout directions are included. **Build one.** The owner will pick; the recommendation is **1a Poster first**. If no pick is given, build 1a.

## About the design files

The files in this bundle are **design references created in HTML**, prototypes showing the intended look and layout. They are not production code to copy. Recreate the chosen direction in the existing landing page codebase, using its framework, components and styling patterns. The current landing page, its "Your groups" list, the bowl interaction and the light string already exist in the codebase. Reuse them; only the layout and the video entry point change.

`DESIGN.md` is the app's design system ("Handmade Pasko"). Its rules apply here: tokens, fonts, uneven hand-cut corners, no pills, no blur or glow, one filled ube button per screen.

## Fidelity

**High fidelity.** Colours, type, sizes and spacing are final. Match them exactly. Illustrations are the existing SVGs in `assets/`.

## Shared across all three directions

### Remove
- The bottom "See how it works" section (heading, copy and poster). The video now lives at the top. The footer stays.

### Keep unchanged (copy verbatim)
- Wordmark "Monito Monita"
- Headline "Isang link lang para sa buong bunutan."
- Sub (laptop only) "Sali ang lahat sa isang link, draw names, wishlists, weekly themes, at reveal sa party."
- Primary button "Create your group"
- Secondary button "Subukan ang demo"
- Helper "Titingin-tingin lang? Sa demo, ikaw na ang buong grupo: 2 minuto, walang kailangang kasama."
- "Your groups" listahan (only rendered when localStorage has groups; mocks show one: "Continue: test" / "organizer")
- "Paano 'to?" listahan. Laptop rows: "Gumawa ng group, i-share ang link sa GC." / "Sumali ang lahat, tapos draw names." / "Buksan ang slip mo. Sikreto hanggang party." Phone rows: "Gumawa ng group, i-share sa GC." / "Sali ang lahat, tapos draw names." / "Buksan ang slip mo. Sikreto muna!"
- Bowl interaction (DESIGN.md §8.1). Label: laptop "Click the bowl para bumunot", phone "Tap the bowl para bumunot"
- Footer: "Made by Carlos Natanauan", links "GitHub" and "kuyacarlos.is-a.dev"

### Fold targets
Everything named "above the fold" below must be fully visible at:
- **Laptop:** 1366×657 viewport (a 1366×768 screen with the browser open)
- **Phone:** 390×664 viewport (iPhone in Safari)

### Page frame
- Background `#EEE9F6`.
- **Laptop (≥1024px):** light string across the top: `light-string.svg` tiled at 360×40, starting at x 0, y 0. Content container 1120px wide, centred, padding-top 96px, padding-bottom 40px.
- **Phone (<600px):** one `light-string.svg` at 390×43 at the top. Content padding 56px top, 20px sides, 32px bottom. One column.
- **Tablet (600–1023px):** follow the phone order in a single centred column, max-width 560px. Poster/panel/scene grow to the column width at the same aspect ratio.

### Type (see DESIGN.md §3)
| Element | Laptop | Phone |
|---|---|---|
| Wordmark | Chelsea Market 24/1.1 | Chelsea Market 22/1.1 |
| Headline | Chelsea Market 52/1.1 | Chelsea Market 34/1.1 |
| Sub | Atkinson Hyperlegible 400 17/1.5, `#3F1F63` | not shown |
| Helper | Atkinson 400 15/1.45, `#5A4A6B` | same |
| Listahan title | Chelsea Market 22 | Chelsea Market 20 |
| Listahan row | Atkinson 400 16 | same |
| Footer | Atkinson 400 15/1.4, `#5A4A6B`; links Atkinson 700, `#3F1F63`, underlined | same |

### Buttons
- **Primary "Create your group":** `#3F1F63` fill, white Chelsea Market 20, height 60 (laptop) / 58 (phone), padding 0 24px on laptop, full width on phone, radius `10px 8px 12px 8px`. No wrapping (`white-space: nowrap; flex: none`).
- **Secondary "Subukan ang demo":** white, 1.5px `#3F1F63` border, Atkinson 700 16, height 60 on laptop (matches the primary in the same row), 48 on phone full width, padding 0 20px, radius `8px 6px 9px 6px`. No wrapping.
- Laptop: the two sit in one row with a 12px gap. Phone: stacked, 12px gap.
- Focus on everything: 3px `#F4C542` outline, 2px offset. Pressed: scale 0.98.

### Listahan (existing component)
White, 1px `#B9A6D9` edge, 3px radius. Red margin line 1.5px `#E08A93` at x 27. Rows exactly 40px, text starts at x 40, 1px `#B9C6E8` rule under each row except the last. "Paano 'to?" rows have `star.svg` 17×17 at x 5, y 11.

### The poster
- **Image:** `assets/poster.png` (1280×720) is the reference: the opened slip "Carlo" on the gold ray disc, captions hidden. Ship it as a WebP still rendered from the Remotion composition (`<Still>` at the frame after the name draws, captions off), 1280×720, about 40 KB. Also export a 640×360 version for `srcset`.
- One large subject stays readable at 140px wide; the previous poster (the 12-slip reveal ring) becomes unreadable below about 400px. Use the new still in every placement.
- `<img width="1280" height="720" alt="">` with `object-fit: cover`. It is above the fold in every direction: `loading="eager"`, and in 1a also `fetchpriority="high"` (it is likely the LCP element).

### The play label (shared component)
A white paper slip sitting on the poster, the visible affordance of the video button.
- Background `#FFFFFF`, radius 3px, flat shadow `3px 4px 0 rgba(30,18,56,.45)` (the slip shadow from DESIGN.md), `transform: rotate(-2deg)`.
- Contents in a row, `align-items: center`: ube play triangle (SVG path `M2 2L16 10L2 18Z`, fill and 2.5px round-join stroke `#3F1F63`), "Panoorin" in Chelsea Market, "0:51" in Atkinson 700 `#5A4A6B`.
- Sizes:
  | Placement | Height | Padding | Gap | Triangle | "Panoorin" | "0:51" | Offset |
  |---|---|---|---|---|---|---|---|
  | 1a laptop | 48 | 0 18 0 16 | 10 | 16×18 | 22 | 16 | left 22, bottom 22 |
  | 1a phone | 44 | 0 14 0 13 | 9 | 14×16 | 20 | 15 | left 12, bottom 12 |
  | 1c laptop TV | 42 | 0 13 0 12 | 8 | 13×15 | 19 | 15 | left 12, bottom 12 |
  | 1c phone TV | 38 | 0 10 | 7 | 11×13 | 17 | 14 | left 8, bottom 8 |
  (1b uses a different container, see below.)

### Video loading and markup (all directions)
- First paint is the poster only. No `<video>` element, no video bytes until the user clicks.
- The whole poster (or slip in 1b, or TV screen in 1c) is one `<button type="button">` with `aria-label="Panoorin ang demo video, 0:51"`. Illustrations inside are `aria-hidden="true"`.
- On click: create `<video controls autoplay playsinline preload="auto" poster="{same still}">` with `<source>` MP4 (H.264, 1080p for laptop, 720p for phones via a `media` check or `srcset`-like selection in JS). Play with sound; it is a user gesture.
- **Phones (<600px), all directions:** after `play()` resolves, go full screen: `video.requestFullscreen()`, falling back to `video.webkitEnterFullscreen()` on iOS. On exiting full screen, pause and return to the poster.
- When the video ends: return to the poster state and move focus back to the button.
- `prefers-reduced-motion`: no change needed (playback is user-started), but do not autoplay anything on load.
- Lazy-load the player code with a dynamic import on first click (DESIGN.md §9: lazy-load per screen).

## Direction 1a: Poster first (recommended)

The poster replaces the sky panel as the hero picture. The bowl moves below the fold into its own smaller sky panel.

### Laptop
- **Row 1:** CSS grid, columns `440px 632px`, column-gap 48, `align-items: start`.
  - **Left column**, top to bottom: wordmark; 22px; headline (wraps to 3 lines at 440); 18px; sub; 26px; button row; 12px; helper; 26px; "Your groups" (440 wide). Ends about y 633, above the fold.
  - **Right column:** margin-top 48 (poster top aligns with the headline). Poster button 632×355.5, radius `14px 10px 16px 10px`, overflow hidden, background `#3F1F63`, play label bottom-left. 14px below: caption "Mula sa GC hanggang sa reveal sa party, sa loob ng isang minuto." Atkinson 400 15/1.45 `#5A4A6B`.
- **Row 2:** margin-top 56, same grid. Left: "Paano 'to?" (440 wide). Right: bowl sky panel 632×280, radius `14px 10px 16px 10px`, background `repeating-conic-gradient(from 0deg at 632px 0px, #3F1F63 0deg 6deg, #4A2873 6deg 12deg)` (rays from the top-right corner). Contents: `simbahan.svg` 420×126 at right 0, bottom 0; label at left 26, top 26 (Atkinson 700 17/1.2 white); `bilao.svg` 240×50 at left 196, top 220; `bowl-on-dark.svg` 200×150 at left 216, top 90. **No parol in this panel** (the poster already has one).
- Footer: margin-top 48, 1px `#B9A6D9` top border, padding-top 22, items in a row with 20px gap.
- **Playback:** in place. The poster button is replaced by the `<video>` at exactly 632×355.5 in the same box; nothing else moves. Native controls.

### Phone (order)
1. Wordmark
2. 14px, headline (3 lines)
3. 18px, poster button 350×197 (full column width, 16:9), same radius, play label bottom-left
4. 18px, primary button
5. 12px, secondary button
6. 12px, helper. Everything to here is above the 664 fold.
7. 22px, "Your groups"
8. 18px, "Paano 'to?"
9. 18px, bowl sky panel 350×280: rays from `350px 0px`; `simbahan.svg` 350×105 at left 0, bottom 0; label "Tap the bowl para bumunot" at left 20, top 22 (Atkinson 700 16/1.2 white); `bilao.svg` 228×47.5 at left 61, top 218; `bowl-on-dark.svg` 190×142.5 at left 80, top 94
10. 32px, footer (name on its own line, links below, 8px row gap, 18px column gap)

## Direction 1b: Pinned to the sky

The live layout stays. A video slip with a poster thumbnail hangs from a white string inside the sky panel and opens a pop-up player.

### Laptop
- Grid columns `652px 420px`, gap 48.
- **Left column:** wordmark; 22px; headline (2 lines); 18px; sub (max-width 440); 26px; button row; 12px; helper; 26px; "Your groups" (440 wide); 22px; "Paano 'to?" (440 wide).
- **Right column:** sky panel 420×520, radius `14px 10px 16px 10px`, rays `repeating-conic-gradient(from 0deg at 328px 95px, #3F1F63 0deg 6deg, #4A2873 6deg 12deg)`. Layers, back to front:
  - `simbahan.svg` 420×126, left 0, bottom 0
  - white string: SVG 420×80 at 0,0, path `M-10 14Q200 70 430 10`, stroke `#FFFFFF` 2px
  - `parol.svg` 140×198.3 at left 258, top 0
  - label "Click the bowl para bumunot" at left 24, top 240
  - `bilao.svg` 288×60 at left 66, top 430; `bowl-on-dark.svg` 240×180 at left 90, top 274
  - **Video slip** (a separate `<button>`, not inside the bowl button): left 25, top 40, width 210, padding 10 10 0, white, radius 3, slip shadow, `rotate(-3deg)` with `transform-origin: 105px 0`. Inside: poster thumbnail 190×107 (`object-fit: cover`), then a 46px row: triangle 14×16, "Panoorin" Chelsea Market 20, "0:51" Atkinson 700 15 `#5A4A6B`, gap 9. `clothespin.svg` 18×52 at left 96, top −28 inside the slip, so it grips the string.
- Footer as in 1a.

### Phone (order)
1. Wordmark
2. 14px, headline
3. 18px, sky panel 350×360, rays from `286px 70px`. Layers: `simbahan.svg` 350×105 bottom; string SVG 350×80 path `M-10 12Q170 60 360 8`; `parol.svg` 100×141.7 at left 236, top 0; label "Tap the bowl para bumunot" right-aligned at right 16, top 158, width 120, Atkinson 700 15/1.3 white; `bilao.svg` 192×40 at left 49, top 308; `bowl-on-dark.svg` 160×120 at left 65, top 204; **video slip** at left 18, top 34, width 156, padding 8 8 0, thumbnail 140×79, 40px row (triangle 12×14, "Panoorin" Chelsea Market 18, "0:51" Atkinson 700 14, gap 7), clothespin 16×46 at left 70, top −26, `rotate(-3deg)` origin `78px 0`
4. 18px, primary button (above the fold)
5. 12px, secondary; 12px, helper; 22px, "Your groups"; 18px, "Paano 'to?"; 32px, footer

### Pop-up player (laptop and tablet)
- Native `<dialog>` opened with `showModal()`. `::backdrop` solid `#1E1238` (no blur, no transparency effects). The dialog itself is transparent and fills the viewport.
- Top row: "See how it works" Chelsea Market 28 white at the left edge of the video; "Isara" button at the right edge: height 44, padding 0 16, 1.5px `#EBDFF8` border, radius `8px 6px 9px 6px`, white Atkinson 700 16, with a 13px × icon (two 2.5px white round-cap strokes), gap 10.
- Video: width `min(912px, 100vw − 64px)`, 16:9, centred horizontally, 16px under the top row, radius 4px, native controls.
- Under the video, 16px: "Mula sa GC hanggang sa reveal sa party, sa loob ng isang minuto." Atkinson 400 16/1.4 `#EBDFF8`.
- Behaviour: on open, focus "Isara" and start playback; Esc (native), "Isara" and a click on the backdrop close it. On close: pause, remove the `<video>`, return focus to the video slip. Lock page scroll while open.
- Phones skip the dialog and go straight to full screen (see shared rules).

## Direction 1c: Bowl and TV

One wide evening scene holds the bowl and a TV showing the poster, both above the fold.

### Laptop
- **Row 1:** grid `640px 432px`, gap 48. Left: wordmark; 22px; headline (2 lines). Right: margin-top 48; sub; 20px; button row; 12px; helper.
- **Row 2:** margin-top 26. Scene 1120×280, radius `14px 10px 16px 10px`, rays from `1015px 82px`. Layers:
  - ground strip `#2C1548`, full width, 34px tall, bottom 0
  - `simbahan.svg` 280×84 at right 0, bottom 34
  - `parol.svg` 110×155.8 at left 960, top 0
  - label "Click the bowl para bumunot" at left 28, top 22 (Atkinson 700 17/1.2 white)
  - `bilao.svg` 252×52.5 at left 89, top 201; `bowl-on-dark.svg` 210×157.5 at left 110, top 65
  - TV feet: two `#1E1238` rects 34×12 at (512, 236) and (734, 236)
  - **TV** (the video button): left 452, top 16, 376×222, background `#1E1238`, 3px `#9C87C4` border, radius `12px 9px 14px 9px`, padding 9. Screen 352×198 with the poster and the play label.
  - Scene ends at about y 643, above the fold.
- **Row 3:** margin-top 48, grid `536px 536px`, gap 48: "Your groups" left, "Paano 'to?" right.
- Footer as in 1a.
- **Playback:** the `<video>` replaces the poster inside the TV screen (352×198); its native full-screen control is the way to watch large.

### Phone (order)
1. Wordmark
2. 14px, headline
3. 18px, scene 350×300, rays from `292px 58px`. Layers: ground strip `#2C1548` 26px at bottom; `parol.svg` 84×119 at left 250, top 0; label "Tap the bowl para bumunot" at left 16, top 196, width 150, Atkinson 700 15/1.3 white; `bilao.svg` 192×40 at left 158, top 246; `bowl-on-dark.svg` 160×120 at left 174, top 142; **TV** at left 16, top 14, 212×126, padding 6, 2px `#9C87C4` border, radius `10px 7px 11px 7px`, screen 196×110 with the poster and play label (no feet, wall-hung)
4. 18px, primary; 12px, secondary (both above the fold)
5. 12px, helper; 22px, "Your groups"; 18px, "Paano 'to?"; 32px, footer

## Interactions and behaviour

| Element | Action | Result |
|---|---|---|
| Poster / video slip / TV | click, Enter, Space | Loads and plays the video (in place, dialog, or TV per direction; full screen on phones) |
| Bowl | click/tap | Existing bunutan animation (DESIGN.md §8.1). Unchanged |
| "Create your group" | click | `/new` (existing) |
| "Subukan ang demo" | click | existing demo route |
| "Continue: test" | click | existing group route |
| Dialog "Isara", Esc, backdrop (1b) | | Close, pause, remove video, focus back to the slip |

Hover: the play label lifts 2px (`translateY(-2px)` added to its rotation, 120ms). Cursor pointer over the whole video button. No other new hover states.

## State

- `videoState`: `'poster' | 'loading' | 'playing'` per page (one video).
- 1b only: `dialogOpen: boolean`.
- `yourGroups`: existing, from localStorage. If empty, the "Your groups" listahan is not rendered and the blocks below move up.

## Design tokens used

Colours: `#EEE9F6` page, `#3F1F63` ube, `#4A2873` sky ray tone, `#5A4A6B` soft text, `#B9A6D9` listahan edge and footer rule, `#B9C6E8` listahan rules, `#E08A93` margin line, `#FFFFFF` paper, `#F4C542` focus ring and ray disc, `#1E1238` night (dialog backdrop, TV body), `#9C87C4` TV outline, `#EBDFF8` text on night, `#2C1548` ground strip.

Radii: primary `10px 8px 12px 8px`; secondary and Isara `8px 6px 9px 6px`; sky panel, poster and scene `14px 10px 16px 10px`; TV `12px 9px 14px 9px` (phone `10px 7px 11px 7px`); paper (slip, label, listahan) 3px.

Shadow: only the slip shadow `3px 4px 0 rgba(30,18,56,.45)` on the play label and video slip.

Spacing steps used: 12, 14, 18, 22, 26, 48, 56.

Fonts: Chelsea Market 400, Atkinson Hyperlegible 400/700, Gochi Hand 400 (only inside the poster image).

## Assets

`assets/`, all existing illustrations from the app:
- `poster.png`: reference for the poster still (re-render from Remotion as WebP, see above)
- `light-string.svg`, `parol.svg`, `bowl-on-dark.svg`, `bilao.svg`, `simbahan.svg`, `clothespin.svg`, `star.svg`

Inline the SVGs as `<symbol>`s as the app already does (DESIGN.md §7).

## Files

- `Landing Video Directions.html`: self-contained reference showing all three directions (laptop and phone), the 1b pop-up player and the poster still. Open in a browser and pan around; the red dashed lines mark the fold.
- `DESIGN.md`: the full Handmade Pasko design system.
- `assets/`: images listed above.
