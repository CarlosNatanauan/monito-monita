import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The lights (docs/DESIGN.md, "The lights"): one wire, a row of bulbs.
 * They show progress. A bulb's state never carries meaning alone, so every
 * progress row comes with its text count (the required `label`).
 */

export type BulbState = "off" | "on" | "glow";
export type LightsVariant = "light" | "dark";

const SHAPE: Record<LightsVariant, string> = {
  light: "h-4 w-3 rounded-[50%]", // 12×16 ellipse
  dark: "size-7 rounded-full", // 28×28 circle (reveal, 1080p)
};

const FILL: Record<LightsVariant, Record<BulbState, string>> = {
  light: {
    off: "border-[1.5px] border-ube-line bg-niyog",
    on: "border-[1.5px] border-margarine-edge bg-margarine",
    glow: "border-[1.5px] border-margarine-edge bg-margarine-core shadow-[0_0_10px_4px_rgb(244_197_66/0.9)]",
  },
  dark: {
    off: "border-[1.5px] border-gabi-line bg-gabi-leaf",
    on: "bg-margarine",
    glow: "bg-margarine-core shadow-[0_0_28px_10px_rgb(244_197_66/0.9)]",
  },
};

export function Bulb({
  state,
  variant = "light",
  className,
  style,
}: {
  state: BulbState;
  variant?: LightsVariant;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      data-bulb={state}
      className={cn("block shrink-0", SHAPE[variant], FILL[variant][state], className)}
      style={style}
    />
  );
}

const WIRE: Record<LightsVariant, string> = {
  light: "before:bg-ube-line",
  dark: "before:bg-gabi-line",
};
const SLOT: Record<LightsVariant, string> = {
  light: "w-[26px]",
  dark: "w-12",
};

/**
 * A progress string: one bulb per item, wrapping onto more wires if needed.
 * `label` is the text count that always goes with it ("8 of 12 have
 * opened their slip"); it renders above the wire.
 */
export function Lights({
  states,
  label,
  variant = "light",
  className,
}: {
  states: BulbState[];
  label: ReactNode;
  variant?: LightsVariant;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {label}
      {states.length > 0 && (
        <div
          aria-hidden
          className={cn(
            "relative flex flex-wrap gap-y-3",
            // Full-width wire on the first row; each slot carries its own piece
            // so wrapped rows hang on a wire too.
            "before:absolute before:inset-x-0 before:top-0 before:h-0.5",
            WIRE[variant],
          )}
        >
          {states.map((state, i) => (
            <span
              key={i}
              className={cn(
                "relative flex justify-center pt-0.5 before:absolute before:inset-x-0 before:top-0 before:h-0.5",
                SLOT[variant],
                WIRE[variant],
              )}
            >
              <Bulb state={state} variant={variant} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Join progress: on per member, the newest one glows. */
export function joinStates(count: number): BulbState[] {
  return Array.from({ length: count }, (_, i) => (i === count - 1 ? "glow" : "on"));
}

/** After the draw: on = opened, off = not yet, the most recent opened glows. */
export function openedStates(opened: number, total: number): BulbState[] {
  return Array.from({ length: total }, (_, i) => (i < opened ? (i === opened - 1 ? "glow" : "on") : "off"));
}

const HEADER_BULBS = 7;
const TWINKLE_PERIOD = 3.3; // seconds: three groups, ~1.1s each

/**
 * The header string (landing, join, /me): 7 bulbs under a full-width wire,
 * all on, one in three glowing, the glow shifting every ~1.1s. Only the
 * opacity of a pre-glowing layer changes. Static under reduced motion.
 * Decoration only: hidden from screen readers.
 */
export function HeaderLights() {
  return (
    <div aria-hidden className="pointer-events-none relative h-11 w-full shrink-0 overflow-hidden">
      <span className="absolute inset-x-0 top-2.5 h-0.5 bg-ube-line" />
      <div className="mx-auto flex max-w-[480px] justify-between px-[30px] pt-3">
        {Array.from({ length: HEADER_BULBS }, (_, i) => {
          const phase = i % 3;
          return (
            <span key={i} className="relative">
              <Bulb state="on" />
              <Bulb
                state="glow"
                className="absolute inset-0 animate-[twinkle_3.3s_linear_infinite] motion-reduce:animate-none"
                style={{
                  opacity: phase === 0 ? 1 : 0,
                  animationDelay: phase === 0 ? "0s" : `-${(TWINKLE_PERIOD * (3 - phase)) / 3}s`,
                }}
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}
