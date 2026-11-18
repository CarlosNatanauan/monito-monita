/**
 * Music and sound effects. The music bed sits softly under the effects
 * (ducked under the slip unfold and the cheer); effects are acoustic and
 * soft: paper, wood, glass, a small room of people (the cheer). Every cue
 * is placed from the same timing the pictures use.
 */
import { Audio } from "@remotion/media";
import type React from "react";
import { interpolate, Sequence, staticFile } from "remotion";
import r1 from "../../public/rec/r1-create.json";
import r2 from "../../public/rec/r2-join.json";
import { compAt, type PointerLog } from "../components/Rec";
import { writeEnd, FLAT_AT } from "../components/slip/Slip";
import { DURATION, FPS, SCENE } from "../lib/time";
import { PAN, R1_ANCHORS } from "../scenes/S03Create";
import { PUSH_START, R2_ANCHORS, TAP_LINK } from "../scenes/S04Join";
import { TAP } from "../scenes/S05Slip";
import { BULB_AT, LIGHTS_DOWN, ROOM_PAN } from "../scenes/S06Organizer";
import { BANNER, PRESS, R4_JOY } from "../scenes/S07Reveal";
import { LIFT, TAG_CATCH } from "../scenes/S08Built";
import { SLIP_CATCH } from "../scenes/S09Outro";

/** Overall effect level (the bed is set in musicVolume). */
const FX = 1;

const Sfx: React.FC<{ at: number; src: string; volume: number | ((f: number) => number); name?: string }> = ({ at: f, src, volume, name }) => {
  const from = Math.max(0, Math.round(f));
  return (
    <Sequence from={from} layout="none" name={name ?? src}>
      <Audio src={staticFile(`audio/${src}`)} volume={typeof volume === "number" ? volume * FX : (x: number) => volume(x) * FX} />
    </Sequence>
  );
};

const lin = (f: number, a: number[], b: number[]) => interpolate(f, a, b, { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** The music bed: soft under the effects, almost gone under the folded slip and the unfold. */
export const musicVolume = (f: number) => {
  const s05 = SCENE.s05.from;
  const tap = s05 + TAP;
  const flat = tap + FLAT_AT * FPS;
  const cheer = SCENE.s07.from + BANNER;
  const base = 0.5;
  if (f < s05) return base;
  if (f < tap) return lin(f, [s05, s05 + 8], [base, 0.3]);
  if (f < flat + 30) return lin(f, [tap, tap + 6, flat, flat + 30], [0.3, 0.17, 0.2, base]);
  if (f >= cheer - 2 && f < cheer + 70) return lin(f, [cheer - 2, cheer + 4, cheer + 46, cheer + 70], [base, 0.32, 0.32, base]);
  return base;
};

/** The recorder's typing jitter (same seed and formula), so key sounds land on the keys. */
const typedFrames = (start: number, count: number, framesPerChar: number, jitter: number) => {
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const out: number[] = [];
  let f = start;
  for (let i = 0; i < count; i++) {
    out.push(f);
    f += Math.max(1, Math.round(framesPerChar * (1 + (rand() - 0.5) * 2 * jitter)));
  }
  return out;
};

export const Soundtrack: React.FC = () => {
  const s01 = SCENE.s01.from;
  const s02 = SCENE.s02.from;
  const s03 = SCENE.s03.from;
  const s04 = SCENE.s04.from;
  const s05 = SCENE.s05.from;
  const s06 = SCENE.s06.from;
  const s07 = SCENE.s07.from;
  const s08 = SCENE.s08.from;
  const s09 = SCENE.s09.from;

  const r1At = (rec: number) => {
    const c = compAt(R1_ANCHORS, rec);
    return c === null ? null : s03 + c;
  };
  const r2At = (rec: number) => {
    const c = compAt(R2_ANCHORS, rec);
    return c === null ? null : s04 + c;
  };
  const r4At = (rec: number) => {
    const c = compAt(R4_JOY, rec);
    return c === null ? null : s07 + c;
  };

  // 03: keys while she types (name, date, budget) and the trackpad clicks.
  const m1 = r1.marks as Record<string, number>;
  const keys = [
    ...typedFrames(m1.typeName, 22, 5, 0.35),
    ...typedFrames(m1.typeDate, 8, 5, 0.2),
    ...typedFrames(m1.typeBudget, 3, 6, 0.2),
  ]
    .map(r1At)
    .filter((f): f is number => f !== null);
  const clicks = (r1.pointer as PointerLog)
    .filter((e) => e.t === "down")
    .map((e) => r1At(e.f))
    .filter((f): f is number => f !== null);
  const copyClick = clicks[clicks.length - 1];

  // 04: phone taps, the PIN on rising wood, the join drop.
  const taps = (r2.pointer as PointerLog).filter((e) => e.t === "tap").map((e) => r2At(e.f));
  const [nameTap, ...rest] = taps;
  const joinTap = rest[rest.length - 1];
  const pinTaps = rest.slice(0, 4);
  const joyKeys = typedFrames((r2.marks as Record<string, number>).typeName, 3, 8, 0.15).map(r2At);

  const tap = s05 + TAP;
  const cheer = s07 + BANNER;
  const end = DURATION;

  return (
    <>
      <Sequence name="Music" layout="none">
        <Audio src={staticFile("audio/music.wav")} volume={musicVolume} />
      </Sequence>

      {/* 01: night, the bulbs come on */}
      <Sfx at={s01} src="sfx/crickets.wav" volume={(f) => lin(f, [0, 6, 80, 112], [0, 0.11, 0.11, 0])} name="crickets" />
      <Sfx at={s01 + 18} src="sfx/bulbs-run.wav" volume={0.32} />
      <Sfx at={s02 - 2} src="sfx/paper-air.wav" volume={0.2} name="tilt" />

      {/* 02: slips flutter down, the GC fills up, everything is swept off */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <Sfx key={`fl${i}`} at={s02 + 3 + 5 * i} src={`sfx/paper-flutter-${(i % 4) + 1}.wav`} volume={0.24 - i * 0.012} />
      ))}
      {[33, 47, 59, 69, 77, 84, 90].map((f, i) => (
        <Sfx key={`pop${i}`} at={s02 + f} src={`sfx/wood-${["B4", "Cs5", "Ds5", "Fs5", "Gs5", "B5", "Cs6"][i]}.wav`} volume={0.15} />
      ))}
      <Sfx at={s02 + 116} src="sfx/paper-sweep.wav" volume={0.26} />

      {/* 03: typing, clicks, the GC message lifts out */}
      {keys.map((f, i) => (
        <Sfx key={`k${i}`} at={f} src={`sfx/key-${(i % 6) + 1}.wav`} volume={0.17} />
      ))}
      {clicks.map((f, i) => (
        <Sfx key={`c${i}`} at={f} src="sfx/trackpad-click.wav" volume={0.26} />
      ))}
      {copyClick !== undefined && <Sfx at={copyClick + 2} src="sfx/paper-tok.wav" volume={0.3} name="bubble lifts" />}
      <Sfx at={s03 + PAN[0] - 2} src="sfx/paper-air.wav" volume={0.18} name="pan" />

      {/* 04: the bubble lands in the chat, taps, PIN, the join drop, the push */}
      <Sfx at={s04 + 17} src="sfx/paper-tok.wav" volume={0.22} name="bubble lands" />
      <Sfx at={s04 + TAP_LINK} src="sfx/phone-tap-1.wav" volume={0.3} name="tap link" />
      {nameTap !== null && <Sfx at={nameTap} src="sfx/phone-tap-2.wav" volume={0.26} />}
      {joyKeys.map((f, i) => (f !== null ? <Sfx key={`jk${i}`} at={f} src={`sfx/phone-tap-${(i % 3) + 1}.wav`} volume={0.14} /> : null))}
      {pinTaps.map((f, i) => (f !== null ? <Sfx key={`pin${i}`} at={f} src={`sfx/wood-${["B4", "Cs5", "Ds5", "Fs5"][i]}.wav`} volume={0.3} /> : null))}
      {joinTap !== null && <Sfx at={joinTap} src="sfx/phone-tap-1.wav" volume={0.3} name="join" />}
      {r2At(149) !== null && <Sfx at={r2At(149)!} src="sfx/slip-fold.wav" volume={0.26} />}
      {r2At(211) !== null && <Sfx at={r2At(211)!} src="sfx/slip-in-glass.wav" volume={0.34} />}
      <Sfx at={s04 + PUSH_START - 1} src="sfx/air-pull.wav" volume={0.2} name="push" />

      {/* 05: the hero: tap, the slow paper unfold, the name, a sparkle */}
      <Sfx at={tap} src="sfx/phone-tap-2.wav" volume={0.26} name="tap slip" />
      <Sfx at={tap} src="sfx/paper-unfold.wav" volume={0.5} />
      <Sfx at={tap + FLAT_AT * FPS} src="sfx/chime.wav" volume={0.22} />
      <Sfx at={tap + (writeEnd("Carlo") - 0.08) * FPS} src="sfx/sparkle.wav" volume={0.16} />
      <Sfx at={s06 - 13} src="sfx/paper-slide.wav" volume={0.24} name="wipe" />

      <Sfx at={s06 + LIGHTS_DOWN[0]} src="sfx/switch-click.wav" volume={0.3} name="lights down" />
      {/* 06: a glockenspiel note per bulb, rising */}
      {BULB_AT.map((f, i) => (
        <Sfx key={`b${i}`} at={s06 + f} src={`sfx/glock-${["Fs5", "Gs5", "B5", "Cs6", "Ds6", "Fs6", "Gs6", "B6", "Cs7", "Ds7", "Fs7", "Gs7"][i]}.wav`} volume={0.13} />
      ))}

      <Sfx at={s06 + ROOM_PAN[0] - 2} src="sfx/paper-air.wav" volume={0.14} name="room pan" />

      {/* 07: Joy's slip flips, the push in, the finale */}
      {[128].map((rec, i) => {
        const f = r4At(rec);
        return f === null ? null : (
          <Sequence key={`flip${i}`} from={0} layout="none">
            <Sfx at={f} src="sfx/paper-flip.wav" volume={0.26} />
            <Sfx at={f + 2} src="sfx/glock-B6.wav" volume={0.14} />
            <Sfx at={f + 6} src="sfx/glock-Ds7.wav" volume={0.12} />
          </Sequence>
        );
      })}

      <Sfx at={s07 + PRESS + 4} src="sfx/glock-gliss.wav" volume={0.29} />
      {/* The recording opens with a room murmur and peaks 1.7 s in: the murmur builds under the press, the cheer lands on the banner. */}
      <Sfx at={cheer - 51} src="crowd-cheer.mp3" volume={(f) => lin(f, [0, 8, 51, 110, 150], [0, 0.36, 0.42, 0.34, 0])} name="cheer" />

      {/* 08: each tag catches on the wire with a note */}
      {TAG_CATCH.map((f, i) => (
        <Sequence key={`tag${i}`} from={0} layout="none">
          <Sfx at={s08 + f} src="sfx/paper-flick.wav" volume={0.26} />
          <Sfx at={s08 + f} src={`sfx/glock-${["B5", "Ds6", "Fs6", "B6"][i]}.wav`} volume={0.2} />
        </Sequence>
      ))}
      <Sfx at={s08 + LIFT[0] - 1} src="sfx/paper-air.wav" volume={0.18} name="string raised" />

      {/* 09: the slip clips on; the night comes back */}
      <Sfx at={s09 + SLIP_CATCH} src="sfx/clothespin-click.wav" volume={0.32} />
      <Sfx at={s09 + SLIP_CATCH + 1} src="sfx/paper-tok.wav" volume={0.14} />
      <Sfx at={s09 + 48} src="sfx/crickets.wav" volume={(f) => lin(f, [0, 30, end - s09 - 48 - 30, end - s09 - 48], [0, 0.1, 0.1, 0])} name="crickets" />
    </>
  );
};

