# Monito Monita: demo video

The 52-second portfolio demo, built in [Remotion](https://www.remotion.dev) from `storyboard/STORYBOARD.md`. A separate project with its own `package.json`: nothing here is part of the app's bundle (the app's `tsconfig.json` and ESLint config ignore `video/`).

Outputs go to `out/` (gitignored):
- `monito-monita-demo.mp4`: 1920×1080, 30 fps, H.264 (CRF 16), AAC 320k, about -14 LUFS.
- `monito-monita-loop.webm` (1280×720) / `.gif` (640×360, 15 fps, under 5 MB): the README loop (slip unfold and party reveal, about 11 s, silent, seamless).

## How it's made

1. **Recordings** (`scripts/record/`): the real app, captured frame by frame on a virtual clock (Playwright's fake clock for timers, rAF and GSAP; every CSS/Web Animation pinned to the same clock; canvas-confetti kept on the main thread), at 2x laptop (1366×854), 3x phone (390×844) and 4K for the TV (1920×1080 at 2x; the reveal in projector mode, so its controls are hidden). No browser UI, no system cursor: pointer moves and taps are logged and drawn in Remotion. Data is seeded through the app's own server functions in the dev database: the group "Barkada Christmas 2026" is created on camera, 11 members join, Joy joins on the phone, the real draw runs until Joy draws Carlo.
2. **Audio** (`scripts/audio/`): `analyze-music.py` found the track's grid (110 BPM, 4/4, B major; bar = 2.1818 s). `build-audio.mjs` edits the track on bar lines (`src/data/music.json`), cutting just before detected strums, and synthesizes every sound effect except the crowd cheer: paper from shaped noise, taps and clicks as short transients, glass, glockenspiel and chimes in B major pentatonic.
3. **Composition** (`src/`): one Sequence per scene, cuts on bar lines (`src/lib/time.ts`), each transition one continuous move across the cut (scenes overlap by a few frames, `PRE`/`POST` in `src/scenes/common.tsx`). Zooms inside a device screen scale the recording itself (it is captured at 2x to 4x, so it stays sharp). Scene 05 runs the app's own slip markup and unfold timeline (GSAP, seeked by frame) at 3x, including its ink reveal for the name.

## Rebuild from scratch

From the repo root (the app installed, `.env.local` pointing at the dev database):

```bash
NEXT_PUBLIC_SITE_URL=https://monitomonita-ph.vercel.app npm run build
npx next start -p 3100                                  # keep running
npx tsx video/scripts/record/record.ts all              # R1, seed, R2, draw, R2b, R3, R4 -> video/public/rec/ (about 15 min)
npx tsx video/scripts/record/record.ts cleanup          # deletes the recording group from the dev DB
```

Then in `video/`:

```bash
npm install
node scripts/audio/build-audio.mjs                      # public/audio/
npm run studio                                          # preview
npm run render                                          # out/monito-monita-demo.mp4, then loudness to -14 LUFS
npm run render:loop                                     # out/monito-monita-loop.webm and .gif
npm run render:preview                                  # quick half-size check: out/preview.mp4
npm run render:web                                      # the landing's MP4s (1080p, 720p) into ../public/landing/
npx remotion still LandingPoster out/landing-poster.png # the landing poster still (then scripts/landing/make-poster.mjs)
```

The recordings themselves (`public/rec/*.mp4`, `r3/*.png`) and the audio (`public/audio/`) are not in git; their logs (`public/rec/*.json`: marks, pointer moves, the link box) are, since the scenes import them.

`scripts/record/record.ts` steps can run one by one (`r1 seed-members r2 seed-draw r2b r3 r4`; `seed-reveal r4` re-records just the reveal on a freshly seeded group); state (slug, cookies) lives in `video/.rec/` (gitignored). R1 creates a new group each time, so run `cleanup` before re-recording R1. If R1 is re-recorded, the slug changes: the GC bubble reads it from `public/rec/r1-create.json`. If R4 is re-recorded, check its marks in `public/rec/r4-reveal.json` against the anchors in `src/scenes/S07Reveal.tsx` (Joy's text at R4 140, the finale at 440, the banner at 525) and `src/Loop.tsx`.

To change the music edit, edit `src/data/music.json` (video bar to song bar) and the scene lengths in `src/lib/time.ts`, then rerun `npm run audio`.

## Remotion skills for Claude Code

The official Remotion skills (`remotion-dev/skills`, pinned in `skills-lock.json`) are installed locally in `.agents/skills/` and linked from `.claude/skills/`; neither folder is in git. Reinstall them with the command on [remotion.dev/docs/ai/claude-code](https://www.remotion.dev/docs/ai/claude-code), from `video/`.

## Credits

Music: "Happy Christmas (Ukulele, full version)" by Tonisound (`assets/music/`). Crowd cheer: `assets/sfx/crowd-cheer.mp3`. Fonts: the app's own (Chelsea Market, Atkinson Hyperlegible, Gochi Hand).
