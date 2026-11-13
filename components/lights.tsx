import type { CSSProperties, ReactNode } from "react";
import { bulbRows, type BulbState, type LightsPlan } from "@/lib/lights";
import { cn } from "@/lib/utils";

export { joinStates, openedStates, type BulbState, type LightsPlan } from "@/lib/lights";

/**
 * The lights (docs/DESIGN.md, "The lights"): one wire, a row of bulbs.
 * They show progress. A bulb's state never carries meaning alone, so every
 * progress row comes with its text count (the required `label`).
 */

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
// Room per bulb on the wire. Columns shrink below this on narrow screens,
// so a full row of 12 still fits a 320px phone.
const PITCH: Record<LightsVariant, number> = { light: 22, dark: 48 };
const LEGEND: Record<LightsVariant, string> = { light: "text-ube-soft", dark: "text-gabi-mist" };

/**
 * A progress string. Up to 24 bulbs, in balanced rows of at most 12, each
 * row on its own full-width wire; bigger groups get one bulb per share of
 * members (see lib/lights.ts) and a small legend. `label` is the exact text
 * count that always goes with it ("8 of 12 have opened their slip"); it
 * renders above the wire.
 */
export function Lights({
  plan,
  label,
  variant = "light",
  className,
}: {
  plan: LightsPlan;
  label: ReactNode;
  variant?: LightsVariant;
  className?: string;
}) {
  const rows = bulbRows(plan.states);
  const columns = rows[0]?.length ?? 0;
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {label}
      {rows.length > 0 && (
        <div aria-hidden data-lights={plan.states.length} className="flex flex-col gap-3">
          {rows.map((row, r) => (
            <div
              key={r}
              data-lights-row
              className={cn("relative grid pt-0.5 before:absolute before:inset-x-0 before:top-0 before:h-0.5", WIRE[variant])}
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, ${PITCH[variant]}px))` }}
            >
              {row.map((state, i) => (
                <span key={i} className="flex justify-center">
                  <Bulb state={state} variant={variant} />
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
      {plan.perBulb > 1 && (
        <p className={cn("text-small font-medium", LEGEND[variant])}>Bawat ilaw: {plan.perBulb} tao</p>
      )}
    </div>
  );
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
