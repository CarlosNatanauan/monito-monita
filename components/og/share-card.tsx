import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { bowlSvgMarkup } from "@/components/bowl/bowl-art";

/**
 * Share previews (Open Graph) in the Puto Bumbong look: leaf-wash page with
 * the header lights, the heading on the left, the bowl in the dahon arch on
 * the right. Rendered with next/og. Fonts are the site's own, as WOFF
 * (next/og reads ttf/otf/woff, not woff2), read once per server instance.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;

const C = {
  ube: "#4b2472",
  ubeSoft: "#5a4a6b",
  ubeLine: "#8e7ba6",
  dahon: "#1f6b45",
  leafWash: "#edf3e6",
  margarine: "#f4c542",
  margarineCore: "#fff3c4",
  margarineEdge: "#9a6b00",
};

const font = (file: string) => readFile(join(process.cwd(), "assets/fonts", file));
const fontsPromise = Promise.all([
  font("manrope-latin-700-normal.woff"),
  font("manrope-latin-800-normal.woff"),
  font("instrument-serif-latin-400-italic.woff"),
  font("gochi-hand-latin-400-normal.woff"),
]).then(([m700, m800, serif, hand]) => [
  { name: "Manrope", data: m700, weight: 700 as const, style: "normal" as const },
  { name: "Manrope", data: m800, weight: 800 as const, style: "normal" as const },
  { name: "Instrument Serif", data: serif, weight: 400 as const, style: "italic" as const },
  { name: "Gochi Hand", data: hand, weight: 400 as const, style: "normal" as const },
]);

const BOWL_SRC = `data:image/svg+xml;base64,${Buffer.from(bowlSvgMarkup()).toString("base64")}`;

function Lights() {
  const bulbs = 11;
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 80, display: "flex" }}>
      <div style={{ position: "absolute", top: 26, left: 0, right: 0, height: 3, background: C.ubeLine }} />
      <div style={{ position: "absolute", top: 32, left: 60, right: 60, display: "flex", justifyContent: "space-between" }}>
        {Array.from({ length: bulbs }, (_, i) => {
          const glow = i % 3 === 0;
          return (
            <div
              key={i}
              style={{
                width: 22,
                height: 30,
                borderRadius: "50%",
                border: `2.5px solid ${C.margarineEdge}`,
                background: glow ? C.margarineCore : C.margarine,
                boxShadow: glow ? "0 0 18px 8px rgba(244,197,66,0.85)" : "none",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/** The bowl in the dahon arch; `slip` is a name on an open slip, or a folded slip when null. */
function Arch({ slip }: { slip: string | null }) {
  return (
    <div
      style={{
        position: "absolute",
        right: 64,
        top: 104,
        width: 420,
        height: 486,
        borderRadius: "210px 210px 36px 36px",
        background: C.dahon,
        backgroundImage: "repeating-linear-gradient(115deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 2px, transparent 2px, transparent 20px)",
        border: `4px solid ${C.margarine}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {slip ? (
        <div
          style={{
            marginTop: 92,
            width: 300,
            height: 132,
            background: "#ffffff",
            borderRadius: 8,
            border: `4px solid ${C.margarine}`,
            boxShadow: "0 0 50px 12px rgba(244,197,66,0.7)",
            transform: "rotate(-3deg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Gochi Hand",
            fontSize: 56,
            color: C.ube,
          }}
        >
          {`~ ${slip} ~`}
        </div>
      ) : (
        // A folded slip: paper with the diagonal flap, a sheet peeking behind.
        <div style={{ marginTop: 104, width: 200, height: 108, display: "flex", position: "relative", transform: "rotate(-6deg)" }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 200,
              height: 108,
              background: "#e9dfcb",
              borderRadius: 8,
              transform: "translate(8px, 6px) rotate(4deg)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 200,
              height: 108,
              borderRadius: 8,
              background: "linear-gradient(165deg, #fffefb 0%, #fffefb 56%, #f1ecf6 56%, #f1ecf6 100%)",
              boxShadow: "0 0 50px 10px rgba(244,197,66,0.45)",
            }}
          />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- next/og renders plain <img> */}
      <img src={BOWL_SRC} width={312} height={216} alt="" style={{ position: "absolute", bottom: 40 }} />
    </div>
  );
}

function Frame({ children, slip }: { children: React.ReactNode; slip: string | null }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        background: C.leafWash,
        backgroundImage:
          "repeating-linear-gradient(115deg, rgba(31,107,69,0.08) 0px, rgba(31,107,69,0.08) 2px, transparent 2px, transparent 24px)",
        fontFamily: "Manrope",
        color: C.ube,
      }}
    >
      <Lights />
      <div
        style={{
          position: "absolute",
          left: 72,
          top: 118,
          width: 624,
          bottom: 56,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
      <Arch slip={slip} />
    </div>
  );
}

const serif = (size: number): React.CSSProperties => ({
  fontFamily: "Instrument Serif",
  fontStyle: "italic",
  fontSize: size,
  lineHeight: 1.02,
  letterSpacing: -1,
});

/** Home: "Monito Monita — Bunutan, wishlists, and the big reveal." */
export async function homeImage(): Promise<ImageResponse> {
  return new ImageResponse(
    (
      <Frame slip="Ate Joy">
        <div style={{ fontSize: 40, fontWeight: 800 }}>Monito Monita</div>
        <div style={{ ...serif(88), marginTop: 26, display: "flex", flexDirection: "column" }}>
          <span>Bunutan, wishlists,</span>
          <span>and the big reveal.</span>
        </div>
        <div style={{ fontSize: 36, fontWeight: 700, marginTop: "auto", color: C.ubeSoft }}>Isang link lang.</div>
      </Frame>
    ),
    { ...OG_SIZE, fonts: await fontsPromise },
  );
}

/** Long group names step down in size so they stay within three lines. */
export function groupNameSize(name: string): number {
  const n = name.length;
  if (n <= 18) return 96;
  if (n <= 30) return 80;
  if (n <= 44) return 66;
  return 56;
}

/** Join link: "Sali na sa bunutan ng {group name}" with the party date. Nothing else. */
export async function groupImage(group: { name: string; partyDate: string }): Promise<ImageResponse> {
  return new ImageResponse(
    (
      <Frame slip={null}>
        <div style={{ fontSize: 40, fontWeight: 700, color: C.ubeSoft }}>Sali na sa bunutan ng</div>
        <div style={{ ...serif(groupNameSize(group.name)), marginTop: 18, display: "flex" }}>{group.name}</div>
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 40, fontWeight: 800, color: C.dahon }}>{`Party: ${group.partyDate}`}</div>
          <div style={{ fontSize: 30, fontWeight: 800 }}>Monito Monita</div>
        </div>
      </Frame>
    ),
    { ...OG_SIZE, fonts: await fontsPromise },
  );
}
