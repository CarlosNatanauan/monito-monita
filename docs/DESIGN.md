# Design

People use this once a year, a few times each. So every visit has to feel special. But "premium" here doesn't mean animating everything. It means **a few unforgettable moments, and everything else fast, calm, and obvious.**

## The concept: bunutan

The whole design is built on the most familiar part of the tradition: **bunutan**, drawing folded paper slips from a bowl.

- Every person is a **folded paper slip** with their name handwritten on it
- The group is a **glass bowl** that fills with slips as people join
- Finding out your monito means **unfolding your slip**
- The party reveal lights the slips up one by one, like a **parol** (Christmas lantern) coming on

One motif, used everywhere. If a screen doesn't need the slip, it stays plain.

## Color

Inspired by Simbang Gabi (the dawn Masses): indigo sky, capiz windows, parol light.

| Name | Hex | Use |
|---|---|---|
| Simbang Gabi | `#1F1B4D` | Text, dark surfaces, reveal screen background |
| Capiz | `#F3F0F7` | Main background (pearly, slightly cool, not cream) |
| Slip | `#FFFFFF` | Paper slips, cards |
| Parol red | `#D6283B` | Primary buttons, the "your monito" moment |
| Parol gold | `#F2B630` | Light, glow, highlights (never for text on white) |
| Dahon | `#2F7A4F` | Success states, "joined" and "done" |

Rules:
- Red is for the one main action on a screen. Not for decoration.
- Gold is light: glows, sparkles, the lit-up state. It's what makes the moments feel magical, so keep it rare.
- Check contrast on every text/background pair (WCAG AA).

## Type

| Role | Typeface | Notes |
|---|---|---|
| Everything (UI, headings, body) | **Plus Jakarta Sans** | Friendly, clear, Southeast Asian roots. Headings in ExtraBold, body in Regular/Medium |
| Names on slips only | **Gochi Hand** | Looks like a name written in pen on a scrap of paper. Only on slips and codenames, nowhere else |

- Sentence case everywhere. No all-caps labels.
- Type scale: 14 / 16 / 20 / 28 / 40 (mobile). Body 16px minimum.
- Subset fonts to Latin to keep them small.

## The 4 signature moments

This is where the time and polish goes. Everything else stays simple.

### 1. Landing page: "Try a bunutan"
The hero isn't a headline with a screenshot. It's a **small bowl of slips you can draw from right away**. Tap it, a slip comes out, unfolds, and shows a sample name. Then the button underneath: "Create your group."

```
┌─────────────────────────┐
│  Monito Monita          │
│                         │
│  Bunutan, wishlists,    │
│  and the big reveal.    │
│  Isang link lang.       │
│                         │
│        ╭─────╮          │
│       │ ▱ ▱▱ │  ← tap   │
│       │▱▱ ▱ ▱│          │
│        ╰─────╯          │
│                         │
│  [ Create your group ]  │
│                         │
│  How it works (3 steps) │
└─────────────────────────┘
```

### 2. Joining: your slip goes into the bowl
After entering a name, you see your codename written onto a slip, which then folds and **drops into the group's bowl**. The bowl on the group page shows every slip, so you can see the group filling up ("12 na ang sumali", 12 have joined).

### 3. Your monito: unfolding the slip (the most important moment)
The first time you open your page after the draw, you get a **folded slip**. Tap (or press and hold) to unfold it. The paper opens in 3D, the name appears like it's being written, a soft gold glow, and a short buzz on Android.

```
┌─────────────────────────┐
│  Christmas Party 2026   │
│                         │
│     ┌───────────┐       │
│     │  ╲     ╱  │       │
│     │   folded  │       │
│     │   slip    │       │
│     └───────────┘       │
│   Tap to open your      │
│   bunutan               │
└─────────────────────────┘
        ↓ after
┌─────────────────────────┐
│  Ang monito mo ay…      │  (Your monito is…)
│  ┌───────────────────┐  │
│  │   ~ Ate Joy ~     │  │  ← handwritten
│  └───────────────────┘  │
│  Wishlist               │
│  • Mug na cute          │
│  • Plant (small lang)   │
│                         │
│  This week: Something   │
│  soft 🧸 · ₱300 budget  │
└─────────────────────────┘
```

It plays the full animation **once**. On later visits the slip is already open.

### 4. Party reveal: lighting the parol
For the projector. All slips sit in a **ring** on the dark indigo background. The organizer taps "Next": a line of gold light travels from one person to the next along the loop, and each slip flips to show who gave to whom. When the last one is revealed, the whole ring glows like a lit parol.

```
┌───────────────────────────────────────┐
│            ▢       ▢                  │
│        ▢               ▢              │
│      ▣ ━━━━━━━━━━━▶ ▣                 │  ← revealed so far
│        ▢               ▢              │
│            ▢       ▢                  │
│                                       │
│     Si Bibingka Bandit ay si… Marco!  │
│                       [ Next ▶ ]      │
└───────────────────────────────────────┘
```

## Everything else: quiet

- Forms, wishlists, and the organizer page are **plain and fast**. No entrance animations, no hover effects on every card.
- Motion only **answers what the user did**: an item added slides in, a removed one collapses, a button confirms.
- Layout: one column, left-aligned text, max width ~480px on mobile and desktop for member pages. The organizer page can go wider on desktop.

## Tools

See the "Animation and graphics" table in `docs/TECH.md`. In short:

- **Motion** for everyday UI responses and gestures
- **GSAP** (DrawSVG, MotionPath, MorphSVG) for the signature timelines: unfold, handwriting, light along the loop
- **Rive** (optional) for an illustrated, interactive bowl
- **canvas-confetti** with custom gold star/parol shapes (never rainbow confetti)
- **Haptics:** `navigator.vibrate()`, Android only (iPhone ignores it)
- **Sound:** optional, off by default, reveal screen only

### The handwritten name
Convert the name to SVG paths in Gochi Hand (opentype.js), draw the outline with GSAP DrawSVG like a pen stroke, then fade in the ink fill. Reduced-motion: show the finished name.

## Performance rules (premium means fast too)

Most users open the link from Messenger on a mid-range Android phone over mobile data.

- Animate only `transform` and `opacity` (smooth on cheap phones)
- Load animation code **only on the screens that need it** (lazy-load the reveal screen and the slip)
- Test on a real budget Android phone, not just your laptop
- Mobile Lighthouse performance score of 90 or higher on the landing and member pages
- Pages should be usable even before animations load

## Accessibility

- `prefers-reduced-motion`: skip the unfold and light-up animations and show the final state with a simple fade
- Every animated moment has a button alternative (the "tap to open" slip is a real button)
- Visible keyboard focus
- The reveal screen is readable from the back of a room: big text, high contrast

## Copy

Warm, short, a little Taglish. Sentence case. Buttons say exactly what happens.

| Instead of | Write |
|---|---|
| Submit | Join the group |
| Generate assignments | Draw names |
| Error: invalid input | Pakilagay ang pangalan mo (Please enter your name) |
| No items | Wala pang wishlist. Add something para hindi mahirapan ang monito mo. (No wishlist yet. Add something so your monito doesn't struggle.) |

The same action keeps the same name throughout: if the button says "Draw names", the confirmation says "Names drawn."

## Before building: quick mockups

Before coding the signature moments, sketch the 4 screens above (Figma or paper). Prototype the slip unfold alone first: it's the moment people will screenshot and talk about.
