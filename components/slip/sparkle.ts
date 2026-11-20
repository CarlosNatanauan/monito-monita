import confetti from "canvas-confetti";

// Gold paper stars only, never rainbow (docs/DESIGN.md): rich golds around
// ilaw (#F4C542); pale golds wash out against the lilac page.
const GOLD = ["#F4C542", "#F4C542", "#E9B42A", "#D9A11A", "#F7D063"];
const STAR = "M12 0 L14.9 8.6 L24 8.6 L16.6 13.9 L19.4 22.5 L12 17.3 L4.6 22.5 L7.4 13.9 L0 8.6 L9.1 8.6 Z";
const TWINKLE = "M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z";

/** `compact`: the landing's small bowl on a phone: fewer, slower stars that stay around the slip. */
export type Sparkle = ((x: number, y: number, options?: { compact?: boolean }) => void) & { dispose: () => void };

/**
 * Sets up the canvas, its worker and the star shapes ahead of time. Doing
 * this on the first burst cost a ~300ms frame at 4x CPU throttling.
 */
export function prepareSparkle(): Sparkle {
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "50",
  });
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);

  const fire = confetti.create(canvas, { resize: true, useWorker: true, disableForReducedMotion: true });
  const shapes = [confetti.shapeFromPath({ path: STAR }), confetti.shapeFromPath({ path: TWINKLE })];

  const sparkle = ((x: number, y: number, { compact = false } = {}) => {
    const base: confetti.Options = {
      origin: { x, y },
      shapes,
      colors: GOLD,
      spread: 360,
      gravity: 0.45,
      decay: 0.9,
      // Particles fade from their first tick; a longer life keeps them
      // bright for most of the burst.
      ticks: 130,
    };
    if (compact) {
      // 12 stars, a third of the speed's reach, a shorter life: about 60px around the slip.
      fire({ ...base, particleCount: 8, startVelocity: 7, scalar: 0.85, ticks: 80, gravity: 0.3, flat: true });
      fire({ ...base, particleCount: 4, startVelocity: 5, scalar: 0.7, ticks: 80, gravity: 0.3 });
      return;
    }
    // Most stars face the viewer (tumbling ones turn thin and pale); a few
    // tumble for the twinkle. Same 30 particles as before.
    fire({ ...base, particleCount: 20, startVelocity: 17, scalar: 1.15, flat: true });
    fire({ ...base, particleCount: 10, startVelocity: 12, scalar: 0.9 });
  }) as Sparkle;
  sparkle.dispose = () => {
    fire.reset();
    canvas.remove();
  };
  return sparkle;
}
