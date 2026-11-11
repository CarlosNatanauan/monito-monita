import confetti from "canvas-confetti";

// Gold only, never rainbow (docs/DESIGN.md). Rich golds around parol gold
// (#F2B630); pale golds washed out against the capiz background.
const GOLD = ["#F2B630", "#F2B630", "#E9A41C", "#DB9412", "#F5BF3A"];
const STAR = "M12 0 L14.9 8.6 L24 8.6 L16.6 13.9 L19.4 22.5 L12 17.3 L4.6 22.5 L7.4 13.9 L0 8.6 L9.1 8.6 Z";
const TWINKLE = "M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z";

export type Sparkle = ((x: number, y: number) => void) & { dispose: () => void };

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

  const sparkle = ((x: number, y: number) => {
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
