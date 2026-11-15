/**
 * Joins class names and resolves Tailwind conflicts: when two classes set
 * the same property under the same variants ("h-12" then "h-[58px]",
 * "lg:text-body" then "lg:text-button"), the later one wins. A small
 * replacement for tailwind-merge sized for this app's classes: it ships on
 * every page (join and /me must stay under 150 KB of JS), and the full
 * merger's tables alone were ~28 KB.
 *
 * Knows the custom tokens from app/globals.css, so `text-body` (a size)
 * and `text-ube` (a colour) don't cancel each other. Pure, unit tested.
 */

type ClassValue = string | false | null | undefined | 0;

// Custom font-size tokens (app/globals.css) plus Tailwind's own.
const TEXT_SIZES = new Set([
  "small", "tag", "body", "body-lg", "button", "section", "section-lg", "title", "title-lg", "display", "display-lg",
  "brand", "brand-lg", "hand", "list", "slip", "slip-lg",
  "xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl",
]);
const FONT_WEIGHTS = new Set(["thin", "extralight", "light", "normal", "medium", "semibold", "bold", "extrabold", "black"]);
const DISPLAY = new Set(["block", "inline-block", "inline", "flex", "inline-flex", "grid", "inline-grid", "contents", "hidden", "table"]);
const POSITION = new Set(["static", "fixed", "absolute", "relative", "sticky"]);
// The app's own utilities (app/globals.css): each is its own group.
const CUSTOM = /^(listahan|lst-.+|capiz|gift-tag|sky|ray-disc|focus-ring|nm|fringe)$/;
const LENGTH = /^\[(?:\d|\.|-|calc|clamp|max|min|var\(--text)|^\[length:/;

/** The property group a utility (no variants, no "!" or "-" prefix) belongs to. */
function group(u: string): string {
  if (CUSTOM.test(u)) return u;
  if (DISPLAY.has(u)) return "display";
  if (POSITION.has(u)) return "position";
  const dash = u.indexOf("-");
  const head = dash < 0 ? u : u.slice(0, dash);
  const value = dash < 0 ? "" : u.slice(dash + 1);
  switch (head) {
    case "text":
      if (TEXT_SIZES.has(value) || LENGTH.test(value)) return "text-size";
      if (/^(left|center|right|justify|start|end)$/.test(value)) return "text-align";
      if (/^(wrap|nowrap|balance|pretty)$/.test(value)) return "text-wrap";
      return "text-color";
    case "font":
      return FONT_WEIGHTS.has(value) ? "font-weight" : "font-family";
    case "rounded":
      return /^(t|r|b|l|s|e|tl|tr|br|bl)(-|$)/.test(value) ? `rounded-${value.split("-")[0]}` : "rounded";
    case "border": {
      const side = /^(x|y|t|r|b|l|s|e)(-|$)/.exec(value)?.[1];
      const rest = side ? value.slice(side.length + 1) : value;
      const w = !rest || /^\d+$/.test(rest) || LENGTH.test(rest);
      if (/^(solid|dashed|dotted|double|none)$/.test(rest)) return "border-style";
      return `border-${w ? "w" : "color"}${side ? `-${side}` : ""}`;
    }
    case "outline":
      if (!value || /^\d+$/.test(value) || LENGTH.test(value)) return "outline-w";
      if (value.startsWith("offset")) return "outline-offset";
      if (/^(none|solid|dashed|dotted|double|hidden)$/.test(value)) return "outline-style";
      return "outline-color";
    case "bg":
      if (value.startsWith("[url") || value.startsWith("linear") || value.startsWith("none")) return "bg-image";
      if (value.startsWith("[length")) return "bg-size";
      if (/^(no-repeat|repeat)/.test(value)) return "bg-repeat";
      if (/^(\[(right|left|top|bottom|center)|center|top|bottom|left|right)/.test(value)) return "bg-position";
      return "bg-color";
    case "flex":
      if (/^(row|col)/.test(value)) return "flex-direction";
      if (/^(wrap|nowrap)/.test(value)) return "flex-wrap";
      return "flex";
    case "overflow":
    case "overscroll":
      return /^[xy]-/.test(value) ? `${head}-${value[0]}` : head;
    case "min":
    case "max":
      return `${head}-${value.split("-")[0]}`;
    case "grid":
    case "col":
    case "row":
    case "gap":
    case "inset":
    case "scale":
    case "translate":
    case "underline":
      // grid-cols, col-start, row-span, gap-x, inset-x, scale-x, translate-y, underline-offset…
      return value && !/^[\d[]/.test(value) ? `${head}-${value.split("-")[0]}` : head;
    default:
      // Spacing and sizing have one key per side (p, px, pt…); everything
      // else groups by its first word (h, w, z, opacity, shadow, items…).
      return head;
  }
}

/** "lg:hover:!-mt-2" → ["lg:hover:", "mt-2"] (variants, utility). */
function split(token: string): [string, string] {
  let depth = 0;
  let cut = -1;
  for (let i = 0; i < token.length; i++) {
    const c = token[i];
    if (c === "[" || c === "(") depth++;
    else if (c === "]" || c === ")") depth--;
    else if (c === ":" && depth === 0) cut = i;
  }
  const variants = token.slice(0, cut + 1);
  return [variants, token.slice(cut + 1).replace(/^!/, "").replace(/^-/, "")];
}

export function cn(...inputs: ClassValue[]): string {
  const tokens = inputs.filter(Boolean).join(" ").split(/\s+/).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  // Walk from the end: the first class seen for a key is the one that wins.
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];
    const [variants, utility] = split(token);
    // Arbitrary properties and variant-only tokens: keep as they are.
    const key = utility.startsWith("[") ? token : `${variants}${group(utility)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(token);
  }
  return out.reverse().join(" ");
}
