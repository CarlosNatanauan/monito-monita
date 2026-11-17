/**
 * QR codes as one SVG path, for "Gawing remote ang phone mo" on the reveal
 * screen. Encoded on the server (uqr), so no QR code ever ships in a
 * page's JS: the browser only gets the finished path.
 */
import { encode } from "uqr";

export interface QrPath {
  /** Modules per side (no quiet zone: the caller pads with white). */
  size: number;
  /** One path of 1×1 module squares, row runs merged, in module units. */
  d: string;
}

/**
 * Error correction L: the code is shown on a clean screen, and the lowest
 * level keeps a link with a token at version 5 (37 modules), so each
 * module is as big as possible for scanning from arm's length.
 */
export function qrPath(text: string): QrPath {
  const { data, size } = encode(text, { ecc: "L", border: 0 });
  let d = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!data[y][x]) continue;
      let run = 1;
      while (x + run < size && data[y][x + run]) run++;
      d += `M${x} ${y}h${run}v1h-${run}z`;
      x += run - 1;
    }
  }
  return { size, d };
}
