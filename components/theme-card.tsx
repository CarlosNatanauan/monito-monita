/**
 * docs/DESIGN.md, "Theme card": ube fill, a margarine 14/700 label, the
 * theme name in Instrument Serif Italic 38 white, and one line of detail.
 */
export function ThemeCard({
  label,
  title,
  detail,
  ...props
}: {
  label: string;
  title: string;
  detail: string;
} & Omit<React.ComponentProps<"section">, "title">) {
  return (
    <section className="flex flex-col gap-2 rounded-3xl bg-ube p-5 text-white" {...props}>
      <p className="text-small font-bold text-margarine">{label}</p>
      <p className="font-display text-heading break-words">{title}</p>
      <p className="text-body font-medium">{detail}</p>
    </section>
  );
}
