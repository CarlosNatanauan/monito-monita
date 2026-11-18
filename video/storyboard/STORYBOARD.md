# Monito Monita: portfolio demo video

Storyboard for a 60-second demo in the Handmade Pasko style, built in Remotion. No voiceover: English on-screen text, sound effects and music. Real app recordings plus animated illustrations from `final/svg/`. No AI-generated video.

Style frames: `frames/01-intro.png` to `frames/09-outro.png` (1920×1080). Scene 7 has two frames, `07a-reveal-tv.png` and `07b-finale.png`. The same frames, with notes beside them, are in `Monito Monita Storyboard.dc.html`.

---

## 1. Format

| | |
|---|---|
| Size | 1920×1080, 16:9 |
| Frame rate | 30 fps |
| Length | 60.0 s, 1800 frames |
| Music | 96 BPM, 4/4. One beat = 18.75 frames. One bar = 2.5 s = 75 frames. 24 bars |
| Rule | Every scene cut sits on a bar line. Bar *n* starts at frame (n − 1) × 75 |
| Export | H.264 master at CRF 16 for the web, ProRes 422 HQ for archive. Loudness −14 LUFS integrated, peaks −1 dBTP |

### Timeline

| # | Scene | Time | Length | Bars | Frames |
|---|---|---|---|---|---|
| 01 | Intro | 0:00.0–0:05.0 | 5.0 s | 1–2 | 0–149 |
| 02 | The problem | 0:05.0–0:10.0 | 5.0 s | 3–4 | 150–299 |
| 03 | Create a group (laptop) | 0:10.0–0:17.5 | 7.5 s | 5–7 | 300–524 |
| 04 | Join (phone) | 0:17.5–0:25.0 | 7.5 s | 8–10 | 525–749 |
| 05 | The slip unfold | 0:25.0–0:32.5 | 7.5 s | 11–13 | 750–974 |
| 06 | The organizer | 0:32.5–0:37.5 | 5.0 s | 14–15 | 975–1124 |
| 07 | Party reveal and finale (TV) | 0:37.5–0:45.0 | 7.5 s | 16–18 | 1125–1349 |
| 08 | How it's built | 0:45.0–0:55.0 | 10.0 s | 19–22 | 1350–1649 |
| 09 | Outro | 0:55.0–1:00.0 | 5.0 s | 23–24 | 1650–1799 |

Background rhythm: evening sky (01) → lilac page (02–04) → sky (05) → lilac (06) → dimmed room and night (07) → lilac (08) → sky (09). The sky bookends the video and frames the hero moment.

---

## 2. Visual rules for the video

The app's `DESIGN.md` applies. These are the additions for motion and for a 1080p screen.

### Type

| Role | Font | Size at 1080p | Colour |
|---|---|---|---|
| Title (intro) | Chelsea Market | 190 px, line 0.98 | white |
| Title (outro) | Chelsea Market | 128 px | white |
| Caption headline | Chelsea Market | 84 px (76 px in scene 07), line 1.06, at most 3 lines | ube `#3F1F63` on lilac, white on sky |
| Caption line | Atkinson Hyperlegible 400 | 38 px, line 1.35 | `#5A4A6B` on lilac, `#EBDFF8` on sky |
| Count, labels | Atkinson Hyperlegible 700 | 30–40 px | ube or white |
| Names on slips | Gochi Hand | 64 px and up (300 px on the hero slip) | ube on white paper |

- Nothing a viewer must read is smaller than 30 px. App text inside device frames is smaller; anything in a recording that matters is either zoomed to at least 30 px on screen or repeated in a caption or a vector callout (the GC bubble in 03, the PIN boxes in 04, the bulb string in 06).
- Names stay in Gochi Hand, everything else follows the app's type rules. No all caps, no italics.

### Reading time

- A caption stays fully visible for at least max(2.5 s, 0.3 s × words + 1 s). Every caption in this board meets that, counted from the end of its entrance to the start of its exit.
- Headline first, then the line under it. Two captions never animate at the same time.
- Captions leave with the scene (a cut, a pan or a wipe), never by fading out on their own.

### Layout

- Title-safe margin: 120 px left and right, 96 px top and bottom.
- Product scenes (03, 04, 06, 07) use the app's laptop rule: text left (x 130–760), picture right (x 760–1860). Never centred.
- Scenes 05 and 07b are full-bleed.
- One parol per frame at most, never recoloured.

### Devices

Drawn flat in the app's own vocabulary, no photoreal mockups.
- **Laptop:** ube bezel 20 px, corners `22 18 24 18`, screen 960×600 (16:10). Base: `#D9D0E2` slab with a 2.5 px ube outline and a `#B9A6D9` notch.
- **Phone:** ube body 438×915, corners `58 52 60 52`, 14 px bezel, screen 410×887 with a small ube pill at the top.
- **TV:** `#1E1238` bezel with a 3 px `#9C87C4` outline, screen 1120×630, two short feet on a `#2C1548` cabinet.
- No shadows on devices. The only shadow is the slip's flat offset, scaled for video: `6px 8px 0 rgba(30,18,56,.45)`.

### Motion vocabulary

All motion is 2D `transform` and `opacity`, plus one CSS 3D rotation for the slip unfold.

| Name | What | Remotion |
|---|---|---|
| `paper` | Entrances: rise 40 px, settle to resting angle, fade in | 18 f, `Easing.bezier(0.16, 1, 0.3, 1)` |
| `lettering` | Headlines: word by word, 4 f apart, each rises 12 px and fades in | 10 f per word, `paper` easing |
| `hang` | Anything on a string (parol, slips, tags): swings from ±12–14° to rest | `spring({fps, frame, config: {damping: 9, stiffness: 90, mass: 1}})`, origin at the clip point, about 40 f with two visible overshoots |
| `drop` | Falling: paper into the bowl, things leaving the frame | 10–12 f, `Easing.bezier(0.55, 0, 0.85, 0.35)` |
| `camera` | Pushes, pulls, pans, tilts | `Easing.bezier(0.45, 0, 0.2, 1)` |
| `drift` | Slow push or pull over a whole scene | linear |
| `bulb` | Off → newest (`#FFE9A3` plus four drawn rays) → on (`#F4C542`) when the next bulb lights. Fill swaps, no fades | 0 f transition, rays hold 12 f |
| `sway` | Parol at rest | ±3° sine, period 3.2 s, wherever the parol appears |

Never: blur, motion blur, glow, lens flare, light leaks, particle confetti, 3D camera, depth of field, bouncy UI scale-pops over 1.05. Movement reads as paper on string: it falls, catches and swings.

### Camera

A single `<Camera>` wrapper per scene with `scale` and `translate` interpolated from keyframes. Vector layers stay sharp at any zoom. Recordings are captured at 2× (phone 3×) so pushes up to 1.8× stay crisp.

### Transitions

All transitions are physical: paper moving, a camera move, or lights going down. Every cut lands on a bar line.

| Out of | Into | Transition | Frames |
|---|---|---|---|
| 01 | 02 | **Tilt down.** Sky slides up, lilac page rises from below | 141–159, 18 f, `camera` |
| 02 | 03 | **Clean-up.** Slips and bubbles drop off the bottom, staggered 2 f; caption stays to the cut. Hard cut to an empty page; bulbs switch on | 286–300, cut at 300 |
| 03 | 04 | **Link hand-off.** Camera pans right 1920 px; the GC bubble stays in screen space and lands on the phone | 510–528 |
| 04 | 05 | **Push through the screen.** Camera pushes into the phone's sky panel; at 750 the recording is swapped for the vector rebuild at identical framing | 738–762, swap at 750 |
| 05 | 06 | **Cut-paper wipe.** A lilac sheet with a hand-cut edge slides in from the right, carrying scene 06 on it | 962–978, cut at 975 |
| 06 | 07 | **Lights down.** Page colour sinks lilac → ube, caption turns white, then caption and laptop slide out left; the lit bulb string stays | 1104–1132 |
| 07 | 08 | **Fringe wipe.** A lilac papel de japon sheet with a cut fringe drops from the top and lands on the downbeat; fringe strips flutter | 1336–1360 |
| 08 | 09 | **Tilt up.** Mirror of the intro tilt | 1641–1659 |
| 09 | end | Hold. No fade, so the last frame works as a thumbnail | — |

The cut-paper edge and the fringe are SVG paths drawn once (`<PaperEdge variant="cut" | "fringe">`). The fringe is 8 by 12 px strips scaled 4× (32 by 48 px), each with its own small rotation on a staggered sine for the last 10 frames.

---

## 3. Recordings

Record with seeded demo data so the recordings match the style frames: group "Barkada Christmas 2026", party Sat, Dec 19, budget ₱500, three weekly themes, 12 members (Joy, Marco, Carlo, Bea, Paolo, Tita Luz, Jun, Aira, Migs, Kuya Ben, Lia, Nico), codenames as in the reference screens. Joy is the organizer and draws Carlo.

| ID | Device | Viewport | Capture | Flow | Used in |
|---|---|---|---|---|---|
| R1 | Laptop | 1366×854 at 2× (2732×1708) | 60 fps | `/new`: type group name, date, budget, organizer name "Joy", PIN, keep 3 themes → "Create group" → ready page → "Copy link" | 03 |
| R2 | Phone | 390×844 at 3× (1170×2532) | 60 fps | `/g/barkada-2026`: type "Joy", PIN 4 digits → "Join the group" → app's join-drop → `/me` folded slip | 04 |
| R3 | Laptop | 1366×854 at 2× | 60 fps | Organizer page after the draw, members ticking to "Opened" one by one (drive it with a script on the same eighth-note cadence, or overlay vector ticks on a still frame) | 06 |
| R4 | TV | 1920×1080 at 2× (3840×2160) | 60 fps | `/reveal`: start "Handa na?" → Space → two pairs → jump to the last pair → "Ilawan ang parol" finale with falling stars | 07 |

- Capture with OBS or Playwright plus CDP screencast on a 4K display. Hide the system cursor. Disable notifications and the browser UI.
- Private links stay masked, as in the app.
- Play recordings with `<OffthreadVideo>`, trimmed and retimed with `playbackRate` (typing at 1.5×).
- Cursor and taps are drawn in Remotion: an ube arrow cursor (36 px, 2.5 px white edge). Click: cursor scales to 0.9 for 4 f and a 3 px ube ring expands 24 → 64 px and fades over 12 f. Phone taps use the ring only.
- The slip unfold (05) is not a recording. It is a vector rebuild from `parol.svg`, `clothespin.svg` and the slip spec, framed to match the last frame of R2's sky panel exactly.

---

## 4. Music and sound

### Music

An instrumental in a rondalla style: bandurria and octavina melody, guitar, bass, soft cajón and shaker, glockenspiel accents. Warm and acoustic, about 96 BPM. Commission or license it; do not use recordings or arrangements of copyrighted carols without a license.

| Bars | Time | Music |
|---|---|---|
| 1–2 | 0:00–0:05 | Solo bandurria tremolo, sparse. Glockenspiel run with the bulbs |
| 3–4 | 0:05–0:10 | A pizzicato figure tries to start and stumbles. Half a beat of silence before bar 5 |
| 5–10 | 0:10–0:25 | Full groove enters on the downbeat with the laptop. Builds gently |
| 11 | 0:25–0:27.5 | Drops to one held chord under the folded slip |
| 12–13 | 0:27.5–0:32.5 | Melody returns on the bar 12 downbeat, exactly as "Carlo" starts drawing |
| 14–15 | 0:32.5–0:37.5 | Glockenspiel plays one rising pentatonic note per bulb, on eighth notes |
| 16–17 | 0:37.5–0:42.5 | Thinner, room murmur underneath. Cajón builds through bar 17 |
| 17 beat 3 – 18 | 0:41.25–0:45 | Full ensemble on the finale |
| 19–22 | 0:45–0:55 | Lighter: guitar and bass, glockenspiel note per tag |
| 23–24 | 0:55–1:00 | Intro melody returns. Final chord on bar 24 (0:57.5), rings out |

### Mix

- Music bed at −18 LUFS short-term under SFX, up to −14 when nothing else plays.
- Duck music −4 dB under the slip unfold (f800–850) and the finale cheer (f1238–1270).
- SFX sit 3–6 dB above the bed at their moment. All SFX are acoustic: paper, wood, glass, a small room of people. No digital whooshes, no app notification sounds, no laughs.
- Ambient bookends: crickets (kuliglig) at −30 dB in 01 and 09.

---

## 5. Scenes

Frame numbers are absolute (0–1799).

### 01 Intro · 0:00.0–0:05.0 · 5.0 s · bars 1–2 · f0–149

**Frame:** `frames/01-intro.png`

**On screen:** Evening sky, full-bleed: ube `#3F1F63` with rays in `#4A2873` fanning from the parol. Light string across the top. The parol hangs top-right (330 px wide) on a short lilac string. Simbahan silhouette along the bottom right, with a matching ground strip to the left edge. Title left.

**Text**
- "Monito Monita" (two lines, Chelsea Market 190 px, white)
- "The Filipino exchange gift, in one link" (Atkinson 50 px, `#EBDFF8`, two lines, break after the comma)

**Motion**
| Frames | What | Easing |
|---|---|---|
| 0 | Sky, church and string are already there, bulbs off, church windows dark. No black open | — |
| 0–149 | Rays rotate 0.4°/s | linear |
| 0–14 | Parol drops in on its string from y −700 | `drop` |
| 14–54 | Parol catches and swings from −14° to rest, then `sway` | `hang` |
| 18–42 | Bulbs switch on left to right, one every half frame (pairs per frame) | `bulb` |
| 24–40 | "Monito Monita" letters in | `lettering` |
| 40 | Church windows light, all at once | cut |
| 44–58 | Subtitle rises in | `paper` |
| 58–141 | Hold (subtitle readable 3 s) | — |

**Camera:** Drift push 1.00 → 1.04 around the frame centre, f0–141.

**Transition out:** Tilt down, f141–159.

**Sound**
| Frame | Cue |
|---|---|
| 0 | Crickets (−30 dB), bandurria tremolo begins |
| 2 | Soft bamboo chime as the parol drops |
| 14 | Rope creak as it catches |
| 18–42 | Glass tinks following the bulb sweep, with a glockenspiel run |
| 40 | Tiny wooden click for the church windows |
| 141 | Soft paper air for the tilt |

---

### 02 The problem · 0:05.0–0:10.0 · 5.0 s · bars 3–4 · f150–299

**Frame:** `frames/02-problem.png`

**On screen:** Lilac page. The light string is there but every bulb is off (white with ube outline). Torn and folded paper slips scattered at the bottom left: "Joy", "Tita Luz", "Marco" scribbled out (picked his own name), "Bea?", three folded slips. Chat bubbles stacked messily on the right, offset left and right and overlapping (white, 2 px ube border, corners `4 24 24 24`; sender in Gochi Hand 32 px, message in Atkinson 36 px). Bubbles are generic, not any real messenger's style.

**Text**
- Caption: "Bunutan on paper." · "Chaos in the group chat." (Chelsea Market 84 px, ube)
- Bubbles (diegetic): Marco "Wait, I picked my own name" · Bea "Redo the bunutan?" · Tita Luz "Who picked me? Asking lang" · Jun "Can Migs still join?" · Aira "Budget ulit? 500 or 1000?" · Carlo "Lost my slip, sorry" · Kuya Ben "Kailan party ulit?"

**Motion**
| Frames | What | Easing |
|---|---|---|
| 150–159 | Page arrives via the tilt | `camera` |
| 156–186 | Seven slips flutter down, 5 f apart, each lands and settles its rotation | `drop` then `hang` (small) |
| 168–182 | "Bunutan on paper." letters in | `lettering` |
| 186–246 | Bubbles pop in from the right, gaps shrinking 14 → 6 f. Scale 0.92 → 1, 6 f. From the 4th on, they overlap the one above | `paper` (short) |
| 196–216 | "Chaos in the group chat." letters in | `lettering` |
| 286–300 | Clean-up: slips and bubbles drop off the bottom, 2 f apart. Caption stays | `drop` |
| 300 | Hard cut | — |

**Camera:** Drift push 1.00 → 1.03.

**Transition out:** Clean-up, cut at 300 on the bar 5 downbeat.

**Sound**
| Frame | Cue |
|---|---|
| 150 | Pizzicato figure starts |
| 156–186 | Seven paper flutters, varied |
| 186–246 | Soft chat pops, rising in pitch, the last three overlapping |
| 236 | Pizzicato stumbles (one wrong note, then stops) |
| 286 | Paper sweep as everything falls |
| 290–300 | Silence |

---

### 03 Create a group · 0:10.0–0:17.5 · 7.5 s · bars 5–7 · f300–524

**Frame:** `frames/03-create-group.png`

**On screen:** Lilac page, light string lit along the top. Laptop on the right playing R1. Caption left. In the key moment, the GC message lifts out of the laptop as a large paper bubble.

**Text**
- "Start a group." (Chelsea Market 84 px)
- "Set the party date, budget and weekly themes. Then share one link in the GC." (Atkinson 38 px, `#5A4A6B`)
- Bubble (Atkinson 34 px): "Hi barkada! Sali na dito:" / **"monitomonita-ph.vercel.app/g/barkada-2026"** (bold)

**Motion**
| Frames | What | Easing |
|---|---|---|
| 300 | Bulbs switch on, all at once, on the downbeat | cut |
| 300–318 | Laptop rises in from +220 px | `paper` |
| 306–328 | "Start a group." letters in | `lettering` |
| 334–350 | Line rises in | `paper` |
| 330–420 | R1: form typed (1.5×), GC preview on the right updates as she types | — |
| 420 | Cursor clicks "Create group" | click |
| 424 | R1: ready page "Ready na ang group mo!" | — |
| 456 | Cursor clicks "Copy link" | click |
| 456–476 | Vector bubble lifts from the link box: scale 0.4 → 1, moves to lower left, overlapping the laptop's corner | `paper` (20 f) |
| 476–510 | Hold | — |

**Camera**
| Frames | Move |
|---|---|
| 336–372 | Push 1.00 → 1.35, centred on the GC preview, so the live text reads |
| 432–456 | Pull to 1.15, centred on the link box |
| 456–476 | Back to 1.00 as the bubble lifts |

**Transition out:** Link hand-off, f510–528. Camera pans right one frame width; the bubble stays in screen space.

**Sound**
| Frame | Cue |
|---|---|
| 300 | Full groove enters |
| 300 | Soft wooden slide for the laptop |
| 330–420 | Light laptop typing, −8 dB under music |
| 420 | Trackpad click |
| 456 | Click, then a paper pop as the bubble lifts |
| 510 | Paper air for the pan |

---

### 04 Join · 0:17.5–0:25.0 · 7.5 s · bars 8–10 · f525–749

**Frame:** `frames/04-join.png`

**On screen:** Lilac page, light string lit. Phone on the right playing R2. Glass bowl on a bilao between the caption and the phone (`bowl.svg`, `bilao.svg`, 400 and 480 px wide). In the key moment the slip "Joy" breaks out of the phone and drops into the bowl.

**Text**
- "Join with a name and a PIN." (Chelsea Market 84 px, two lines)
- "No account, no app to install." (Atkinson 38 px)
- Slip: "Joy" (Gochi Hand 68 px)

**Motion**
| Frames | What | Easing |
|---|---|---|
| 510–528 | Arrive via the pan | `camera` |
| 528–544 | GC bubble shrinks into the phone and becomes the message in a chat | `camera` |
| 544 | Tap ring on the link | tap |
| 548 | R2: join page | — |
| 552–572 | Headline letters in | `lettering` |
| 576–590 | Line rises in | `paper` |
| 585–608 | "Joy" typed (appears in Gochi Hand in the field) | — |
| 612, 618, 624, 630 | Four PIN taps, auto-advance | tap |
| 656 | Tap "Join the group" | tap |
| 658–666 | "Joy" lifts off the listahan as a vector slip | `paper` (8 f) |
| 666–675 | Slip folds in half (scaleY flip) as it leaves the screen past the bezel | `camera` |
| 675–687 | Slip arcs down into the bowl | `drop` |
| 687–693 | Slips in the bowl jiggle (±2°, 3 cycles) | linear |
| 700 | R2: `/me` folded slip on the phone | — |

**Camera**
| Frames | Move |
|---|---|
| 560–600 | Push 1.00 → 1.25 on the form so the name and PIN boxes read large |
| 658–682 | Pull back to 1.00 to include the bowl |
| 738–762 | Push into the phone's sky panel (to about 3.2×) |

**Transition out:** Push through the screen. At f750 the recording is swapped for the vector rebuild at identical framing.

**Sound**
| Frame | Cue |
|---|---|
| 528 | Soft paper tok as the bubble lands |
| 544 | Phone tap |
| 585–608 | Three soft keyboard taps |
| 612–630 | Four wooden PIN taps, rising in pitch |
| 656 | Tap |
| 658 | Paper lift (crinkle) |
| 666 | Paper fold |
| 687 | Slip lands in glass: paper plus a light clink |
| 689 | Small glass rattle |
| 738 | Air pull into the push |

---

### 05 The slip unfold · 0:25.0–0:32.5 · 7.5 s · bars 11–13 · f750–974

The hero moment. Zoomed in, slow, with the music almost gone.

**Frame:** `frames/05-slip-unfold.png` (opened state)

**On screen:** Evening sky, full-bleed, rays fanning from the parol top-right (250 px). A white string sags across the frame. The slip hangs from it by the sipit, rotated 3°, with the flat offset shadow. Before the tap: a small folded slip with a second sheet behind and a white paper label "Tap to open your bunutan". After: the large opened slip (900×470) in front of a 1000 px disc of gold rays.

**Text**
- "Ang monito mo ay…" (Chelsea Market 84 px, white, two lines)
- "Your monito is…" (Atkinson 38 px, `#EBDFF8`)
- Label before the tap: "Tap to open your bunutan" (Atkinson 700, 36 px, ube on white)
- Name: "Carlo" (Gochi Hand 300 px)
- "Only you can see who you got." (Atkinson 700, 40 px, white, two lines)

Text never sits on the gold rays.

**Motion**
| Frames | What | Easing |
|---|---|---|
| 750–762 | End of the push, settling into the vector stage | `camera` |
| 762–804 | Folded slip sways gently on the string | `hang` (small) |
| 770–790 | "Ang monito mo ay…" letters in | `lettering` |
| 790–804 | "Your monito is…" rises in | `paper` |
| 804 | Tap ring on the slip | tap |
| 804–814 | Label drops away | `drop` |
| 806–824 | Slip unfolds in 3D: lower half rotateX 180° → 0° on a 1600 px perspective, back face flat `#F3EEF9`. Slip grows to full size | `camera` (18 f = 600 ms) |
| 816–831 | Ray disc scales 0.6 → 1 and fades in, then rotates 6°/s | `paper` |
| 825–852 | "Carlo" draws as pen strokes, on the bar 12 downbeat | linear (27 f = 900 ms) |
| 856–870 | "Only you can see who you got." rises in | `paper` |
| 870–962 | Hold | — |

Pen strokes: trace "Carlo" as single-line centreline paths in the Gochi Hand style (a one-time illustration task), stroke 18 px, animate `stroke-dashoffset`. In the last 4 frames cross-fade to the real Gochi Hand text so the name is crisp.

**Camera**
| Frames | Move |
|---|---|
| 762–804 | Drift 1.00 → 1.06 toward the slip |
| 806–830 | A small kick, +0.02 on a spring, as the slip opens |
| 830–962 | Drift back to 1.00 |

**Transition out:** Cut-paper wipe from the right, f962–978.

**Sound**
| Frame | Cue |
|---|---|
| 750 | Music drops to one held chord, crickets return faintly |
| 762 | Soft clothespin creak with the sway |
| 804 | Tap |
| 806–824 | Long paper unfold (two creases opening) |
| 825 | Melody returns |
| 825–852 | Pen scratch following the strokes |
| 962 | Paper slide for the wipe |

---

### 06 The organizer · 0:32.5–0:37.5 · 5.0 s · bars 14–15 · f975–1124

**Frame:** `frames/06-organizer.png` (8 of 12, matching the reference screen)

**On screen:** Lilac page. The page's light string has become the progress string: one large bulb per member (12), across the full width. The count in words sits under the lowest point of the string. Laptop on the right playing R3, its members list ticking to "✓ Opened" in sync. Caption left.

**Text**
- Count: "0 of 12 have opened their slip" → … → "12 of 12 have opened their slip" (Atkinson 700, 40 px), updated with each bulb
- "Watch the lights fill up." (Chelsea Market 84 px)
- "See who opened their slip. Never who got whom." (Atkinson 38 px)

**Motion**
| Frames | What | Easing |
|---|---|---|
| 962–978 | Arrive via the wipe, all bulbs off, count "0 of 12" | `camera` |
| 978–998 | Headline letters in | `lettering` |
| 1000–1014 | Line rises in | `paper` |
| 994, 1003, 1013, 1022, 1031, 1041, 1050, 1059, 1069, 1078, 1088, 1097 | Bulbs 1–12 light on eighth notes (bulb 7 on the bar 15 downbeat). Each becomes "newest" with rays, then plain gold when the next lights. Count and R3 tick in sync | `bulb` |
| 1097–1099 | All 12 bulbs show pale `#FFE9A3` for 2 f, then gold | cut |
| 1104–1120 | Lights down begins (see transition) | `camera` |

**Camera:** Drift push 1.00 → 1.05.

**Transition out:** Lights down. Page `#EEE9F6` → `#3F1F63` with `interpolateColors`, wire ube → `#9C87C4`, bulb outlines → `#1E1238`, caption ube → white, f1104–1120. Caption and laptop slide out left, f1118–1132. The lit string stays and becomes the string over the TV.

**Sound**
| Frame | Cue |
|---|---|
| 975 | Paper settles from the wipe |
| 994–1097 | Glockenspiel note per bulb, rising pentatonic, plus a soft glass tink |
| 1097 | Small chord swell |
| 1104 | Light-switch click (room lights off) |
| 1104–1125 | Small party murmur fades in (8–12 people, −28 dB) |

---

### 07 Party reveal and finale · 0:37.5–0:45.0 · 7.5 s · bars 16–18 · f1125–1349

**Frames:** `frames/07a-reveal-tv.png` (reveal in the room), `frames/07b-finale.png` (finale, TV screen is the frame)

**On screen:** The dimmed living room: ube wall, the 12 lit bulbs across the top, a TV on a low cabinet playing R4. Caption left. The camera pushes in until the TV screen is the frame, for the finale.

**Text**
- "Reveal it together at the party." (Chelsea Market 76 px, white, three lines)
- Then only the app's own copy: "Si Hamon Hero ay si… Jun!", and at the finale "Maligayang Pasko!" / "Buo na ang parol. Bigayan na ng regalo!" on the white paper banner.

**Motion**
| Frames | What | Easing |
|---|---|---|
| 1125–1143 | TV rises onto the cabinet; screen shows "Handa na?" | `paper` |
| 1128–1148 | Caption letters in | `lettering` |
| 1150 | R4: reveal starts (Space) | — |
| 1160–1178 | Pair 1: slip flips to the real name, bulbs run to the receiver, centre text | recording |
| 1178–1196 | Pair 2 | recording |
| 1208–1222 | Caption slides out left | `drop` |
| 1238 | Finale pressed, on beat 3 of bar 17 | — |
| 1238–1258 | Bulbs sweep, parol frame turns gold, every slip gets a gold outline | recording |
| 1258 | "Maligayang Pasko!" banner lands | recording |
| 1258–1348 | Gold paper stars fall for 3 s | recording |
| 1258–1336 | Hold on the banner (2.6 s) | — |

**Camera**
| Frames | Move |
|---|---|
| 1125–1196 | Locked |
| 1196–1236 | Push into the TV until its 1120×630 screen fills 1920×1080 (×1.714), the bezel leaves the frame |
| 1236–1349 | Locked on the full screen. R4 must be recorded at 3840×2160 for this |

**Transition out:** Fringe wipe, f1336–1360. Lands on the bar 19 downbeat (f1350).

**Sound**
| Frame | Cue |
|---|---|
| 1125 | Soft low thump as the TV comes on |
| 1150 | Small "ooh" from the room |
| 1160, 1178 | Paper flip, quick glockenspiel run, a short cheer ("ayy!") for each name |
| 1196–1238 | Cajón builds with the push |
| 1238 | Full ensemble hit, bulbs-sweep glissando |
| 1258 | Barkada cheer and applause (a living room, not a stadium) |
| 1258–1348 | Many soft paper flutters for the stars |
| 1336 | Paper drop and fringe rustle for the wipe |

---

### 08 How it's built · 0:45.0–0:55.0 · 10.0 s · bars 19–22 · f1350–1649

**Frame:** `frames/08-how-its-built.png`

**On screen:** Lilac page. A light string sags across the upper third with decorative bulbs. Four gift tags hang from it on twine, one fact per tag (the app's rule: a fact is a tag). Tags are 400 px wide, pointed top with a punched hole, rotated −3°, 2°, −2°, 3°. Tints: gold `#FFE9A3`, pink `#F9D5D9`, green `#D7ECDD`, white.

**Text**
- Heading: "How it's built" (Chelsea Market 84 px)
- Tag 1: "Fair draw" / "Draw algorithm verified against brute force"
- Tag 2: "No leaks" / "Pairs never leak, with automated leak tests"
- Tag 3: "Lighthouse 95" / "Fast on budget phones"
- Tag 4: "Usability tested" / "With AI personas"
- Tag titles Chelsea Market 46 px, lines Atkinson 34 px, all ube.

**Motion**
| Frames | What | Easing |
|---|---|---|
| 1336–1360 | Sheet lands with the fringe wipe, string already on it | `drop` |
| 1356–1372 | Heading letters in | `lettering` |
| 1378 → 1388 | Tag 1 drops from above and catches on the wire on beat 3 | `drop` then `hang` |
| 1415 → 1425 | Tag 2, catches on the bar 20 downbeat | same |
| 1453 → 1463 | Tag 3 | same |
| 1490 → 1500 | Tag 4, catches on the bar 21 downbeat | same |
| 1536–1641 | All four still (3.5 s); tag 1 has been readable for 8 s | — |

**Camera:** Locked. The string-and-tags layer drifts 20 px right to left over the scene for a little parallax against the page.

**Transition out:** Tilt up into the sky, f1641–1659.

**Sound**
| Frame | Cue |
|---|---|
| 1350 | Lighter arrangement starts |
| 1388, 1425, 1463, 1500 | Paper flick as each tag catches, plus one glockenspiel note (rising) |
| 1641 | Paper air for the tilt |

---

### 09 Outro · 0:55.0–1:00.0 · 5.0 s · bars 23–24 · f1650–1799

**Frame:** `frames/09-outro.png`

**On screen:** Evening sky with rays, light string lit across the top, parol top-right (360 px) swaying, simbahan bottom right. A white string sags across the frame. The live link is printed on a white slip that hangs from it by the sipit, rotated −2°, with the flat offset shadow. The GitHub repo below.

**Text**
- "Monito Monita" (Chelsea Market 52 px, `#EBDFF8`)
- "Try the demo" (Chelsea Market 128 px, white)
- Slip: "monitomonita-ph.vercel.app" (Atkinson 700, 54 px, ube on white)
- "Code on GitHub" (Atkinson 700, 30 px, `#EBDFF8`)
- "github.com/your-handle/monito-monita" (Atkinson 40 px, white). **Replace with the real repo URL.**

**Motion**
| Frames | What | Easing |
|---|---|---|
| 1641–1659 | Arrive via the tilt, parol already swaying | `camera` |
| 1656–1672 | "Try the demo" letters in ("Monito Monita" is already there) | `lettering` |
| 1672–1682 | Link slip drops onto the string | `drop` |
| 1682–1708 | Slip swings to rest | `hang` |
| 1696–1710 | GitHub lines rise in | `paper` |
| 1710–1799 | Hold, everything lit (link readable 3.6 s, GitHub 3 s) | — |

**Camera:** Drift pull 1.04 → 1.00, f1659–1799.

**End:** Hold the last frame. No fade to black.

**Sound**
| Frame | Cue |
|---|---|
| 1650 | Intro melody returns |
| 1682 | Wooden clothespin click and a paper flap |
| 1725 | Final chord, rings out to the end |
| 1740 | Crickets return (−30 dB) |

---

## 6. Sound effects list

All acoustic and recorded close. Suggested files in `public/sfx/`:

`bamboo-chime`, `rope-creak`, `glass-tink` (×12 pitches), `wood-click`, `paper-air`, `paper-flutter` (×7 variants), `chat-pop` (×7, rising), `paper-sweep`, `wood-slide`, `laptop-typing`, `trackpad-click`, `paper-pop`, `phone-tap`, `phone-key` (×3), `pin-tap` (×4, rising), `paper-crinkle`, `paper-fold`, `slip-in-glass`, `glass-rattle`, `air-pull`, `clothespin-creak`, `paper-unfold`, `pen-scratch`, `paper-slide`, `light-switch`, `room-murmur` (loop), `tv-thump`, `room-ooh`, `paper-flip`, `room-ayy` (×2), `barkada-cheer`, `paper-stars` (loop), `fringe-rustle`, `paper-flick` (×4), `crickets` (loop).

---

## 7. Remotion build notes

```
src/
  Root.tsx              <Composition id="MonitoDemo" width={1920} height={1080} fps={30} durationInFrames={1800} />
  MonitoDemo.tsx        all scenes as absolute <Sequence from=… durationInFrames=…>, overlapping where transitions overlap
  lib/time.ts           BPM = 96; beat = 18.75; bar = (n) => (n - 1) * 75
  lib/easing.ts         paper, drop, camera (Easing.bezier values above); hang spring config
  lib/colors.ts         the DESIGN.md palette
  components/
    Camera.tsx          scale/translate from keyframes
    Sky.tsx             repeating-conic-gradient rays, origin prop
    Parol.tsx           parol.svg inline, sway + hang props
    LightString.tsx     wire + bulbs; props: count, lit, newest, variant ('deco' | 'progress' | 'night')
    Slip.tsx            folded / opening / opened; name; 3D unfold
    PenName.tsx         centreline stroke animation + text cross-fade
    Clothespin.tsx, Bowl.tsx, Bilao.tsx, Simbahan.tsx
    GiftTag.tsx         pointed-top tag with hole and twine
    ChatBubble.tsx
    Laptop.tsx, Phone.tsx, TV.tsx
    Cursor.tsx, TapRing.tsx
    Caption.tsx         headline (lettering) + line (paper)
    PaperEdge.tsx       'cut' and 'fringe' wipes
  scenes/S01Intro.tsx … S09Outro.tsx
public/
  rec/R1-create.mp4, R2-join.mp4, R3-organizer.mp4, R4-reveal.mp4
  music/monito-96bpm.wav
  sfx/…
```

- Load fonts with `@remotion/google-fonts` (Chelsea Market; Atkinson Hyperlegible 400 and 700; Gochi Hand) and hold the render with `delayRender` until they are ready.
- Inline the SVGs from `final/svg/` as React components (strip the metadata block). Keep their colours.
- Use plain `<Sequence>`s with manual overlaps rather than `TransitionSeries`, so the transition overlap never shifts a cut off its bar line.
- SFX: `<Sequence from={f}><Audio src={staticFile('sfx/…')} volume={…} /></Sequence>`. Music: one `<Audio>` with a `volume` callback for the ducks.
- Render: `npx remotion render MonitoDemo out/monito-demo.mp4 --codec h264 --crf 16`.

---

## 8. Still to do

- Real GitHub repo URL for scene 09.
- Music: commission or license the rondalla track at 96 BPM, 24 bars.
- Record R1–R4 with the seed data above.
- Trace "Carlo" as centreline strokes for the pen animation.
- The real illustration pass on the parol, bowl, bilao and simbahan (from DESIGN.md) should land before the final render, since all of them appear large here.
