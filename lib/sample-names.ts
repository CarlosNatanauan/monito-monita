/** Sample names for the small bowl on the landing page. Not real members. */
export const SAMPLE_NAMES = [
  "Ate Joy",
  "Kuya Ben",
  "Tita Luz",
  "Tito Boy",
  "Lola Nena",
  "Carlo",
  "Ninang Cora",
  "Mang Jun",
  "Bianca",
  "Paolo",
  "Inday",
  "Aira",
] as const;

/** The first draw always shows the mockup's name. */
export const FIRST_SAMPLE = SAMPLE_NAMES[0];

/** A random sample name, never the same as the one just shown. Pure given `random`. */
export function nextSample(previous: string | null, random: () => number = Math.random): string {
  if (previous === null) return FIRST_SAMPLE;
  const others = SAMPLE_NAMES.filter((n) => n !== previous);
  return others[Math.min(others.length - 1, Math.floor(random() * others.length))];
}
