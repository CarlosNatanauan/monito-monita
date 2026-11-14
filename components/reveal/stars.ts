import confetti from "canvas-confetti";

// Gold star confetti only (docs/DESIGN.md): no rainbow, no snowflakes.
const GOLD = ["#F4C542", "#F4C542", "#FFF3C4", "#E9B42A", "#F7D063"];
const STAR = "M12 0 L14.9 8.6 L24 8.6 L16.6 13.9 L19.4 22.5 L12 17.3 L4.6 22.5 L7.4 13.9 L0 8.6 L9.1 8.6 Z";

export interface Stars {
  burst: () => void;
  dispose: () => void;
}

/**
 * The parol finale's stars. Loaded and set up while the last pair is on
 * screen (canvas, worker, star shape), so "Ilawan ang parol" only fires.
 * Never loaded with reduced motion.
 */
export function prepareStars(): Stars {
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "40",
  });
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  const fire = confetti.create(canvas, { resize: true, useWorker: true, disableForReducedMotion: true });
  const star = confetti.shapeFromPath({ path: STAR });

  return {
    burst: () => {
      const base: confetti.Options = { shapes: [star], colors: GOLD, gravity: 0.5, decay: 0.92, ticks: 260, scalar: 1.6, flat: true };
      // From the centre, then from both lower corners toward the middle.
      fire({ ...base, origin: { x: 0.5, y: 0.5 }, particleCount: 70, spread: 360, startVelocity: 32 });
      fire({ ...base, origin: { x: 0.12, y: 0.9 }, particleCount: 40, angle: 60, spread: 55, startVelocity: 55 });
      fire({ ...base, origin: { x: 0.88, y: 0.9 }, particleCount: 40, angle: 120, spread: 55, startVelocity: 55 });
    },
    dispose: () => {
      fire.reset();
      canvas.remove();
    },
  };
}
