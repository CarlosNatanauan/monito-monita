import type { ReactNode } from "react";
import { bulbRows, type BulbState, type LightsPlan } from "@/lib/lights";
import { cn } from "@/lib/utils";

export { joinStates, openedStates, type BulbState, type LightsPlan } from "@/lib/lights";

/**
 * The progress light string (docs/DESIGN.md, "Light string"): a sagging
 * wire with one oval bulb per member, slightly different sizes and tilts.
 * Off = white, on = ilaw, newest ("glow") = ilaw-lit with four short
 * drawn rays. Over 12 bulbs they shrink to fit one string up to 30, then
 * wrap to a second string. A bulb never carries meaning alone, so every
 * string comes with its count in words (the required `label`).
 */

export type LightsVariant = "light" | "dark";

const W = 360;
const H = 44;
// The reference string's bulbs: radii and tilts, cycled.
const RX = [5, 6, 5.5, 6, 5, 6.5, 5.5, 6, 5, 6, 5.5, 6];
const RY = [8, 7, 8.5, 8, 7.5, 8, 7, 8.5, 8, 7.5, 8, 7];
const TILT = [8, -6, 5, -9, 4, -4, 7, -7, 6, -5, 9, -8];

const INK: Record<LightsVariant, { wire: string; off: string }> = {
  light: { wire: "#3F1F63", off: "#FFFFFF" },
  dark: { wire: "#9C87C4", off: "#1E1238" },
};
const FILL: Record<Exclude<BulbState, "off">, string> = { on: "#F4C542", glow: "#FFE9A3" };

/** The wire's height at x: the quadratic sag M0 6 Q180 30 360 6. */
const wireY = (x: number) => {
  const t = x / W;
  return 6 + 48 * t * (1 - t);
};

/** One string of bulbs, as SVG (scales with its box, keeps its shape). */
export function LightRow({
  states,
  variant = "light",
  className,
}: {
  states: BulbState[];
  variant?: LightsVariant;
  className?: string;
}) {
  const n = states.length;
  const scale = Math.min(1, 18.6 / Math.max(n, 1));
  const gap = n > 1 ? Math.min(29, 320 / (n - 1)) : 0;
  const start = n > 1 ? (W - gap * (n - 1)) / 2 : W / 2;
  const ink = INK[variant];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden focusable="false" data-lights-row>
      <path d={`M0 6Q180 30 ${W} 6`} fill="none" stroke={ink.wire} strokeWidth="1.3" />
      {states.map((state, i) => {
        const cx = +(start + i * gap).toFixed(1);
        const cy = +(wireY(cx) + 9 * Math.max(scale, 0.66)).toFixed(1);
        const k = i % RX.length;
        return (
          <g key={i} data-bulb={state}>
            <ellipse
              cx={cx}
              cy={cy}
              rx={+(RX[k] * scale).toFixed(2)}
              ry={+(RY[k] * scale).toFixed(2)}
              transform={`rotate(${TILT[k]} ${cx} ${cy})`}
              fill={state === "off" ? ink.off : FILL[state]}
              stroke={variant === "light" ? "#3F1F63" : state === "off" ? "#9C87C4" : "#9C87C4"}
              strokeWidth="1.2"
            />
            {state === "glow" && (
              <path
                d={`M${cx - 10} ${cy + 1.5}h-4M${cx + 10} ${cy + 1.5}h4M${cx - 7} ${cy + 10.5}l-3 3M${cx + 7} ${cy + 10.5}l3 3`}
                fill="none"
                stroke="#C99A1A"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * A progress string. Up to 60 bulbs, one string up to 30 and then two
 * balanced strings; bigger groups get one bulb per share of members (see
 * lib/lights.ts) and the line "Bawat ilaw: N tao". `label` is the exact
 * count in words that always goes with it; it renders above.
 */
export function Lights({
  plan,
  label,
  variant = "light",
  className,
  rowClassName = "h-9 w-full lg:h-[52px]",
}: {
  plan: LightsPlan;
  label: ReactNode;
  variant?: LightsVariant;
  className?: string;
  rowClassName?: string;
}) {
  const rows = bulbRows(plan.states);
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label}
      {rows.length > 0 && (
        <div aria-hidden data-lights={plan.states.length} className="flex flex-col">
          {rows.map((row, r) => (
            <LightRow key={r} states={row} variant={variant} className={cn("block", rowClassName)} />
          ))}
        </div>
      )}
      {plan.perBulb > 1 && (
        <p className={cn("text-small", variant === "dark" ? "text-gabi-text" : "text-ube-soft")}>
          Bawat ilaw: {plan.perBulb} tao
        </p>
      )}
    </div>
  );
}
