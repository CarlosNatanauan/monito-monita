import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { bowlSvgMarkup } from "@/components/bowl/bowl-art";

/**
 * Share previews (Open Graph) in the Handmade Pasko look: the dusk lilac
 * page with the light string, the heading on the left, the evening sky
 * with the bowl and the parol on the right. Rendered with next/og (no
 * <use>, so the art is inline). Fonts are the site's own, as WOFF (next/og
 * reads ttf/otf/woff, not woff2), read once per server instance.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;

const C = {
  ube: "#3F1F63",
  ubeSky: "#4A2873",
  ubeSoft: "#5A4A6B",
  dahon: "#1F6B45",
  takipsilim: "#EEE9F6",
};

const font = (file: string) => readFile(join(process.cwd(), "assets/fonts", file));
const fontsPromise = Promise.all([
  font("chelsea-market-latin-400-normal.woff"),
  font("atkinson-hyperlegible-latin-700-normal.woff"),
  font("gochi-hand-latin-400-normal.woff"),
]).then(([head, bold, hand]) => [
  { name: "Chelsea Market", data: head, weight: 400 as const, style: "normal" as const },
  { name: "Atkinson Hyperlegible", data: bold, weight: 700 as const, style: "normal" as const },
  { name: "Gochi Hand", data: hand, weight: 400 as const, style: "normal" as const },
]);

const svg = (markup: string) => `data:image/svg+xml;base64,${Buffer.from(markup).toString("base64")}`;

const BOWL_SRC = svg(bowlSvgMarkup());

const PAROL_SRC = svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 170"><path d="M60 0V8" fill="none" stroke="#3F1F63" stroke-width="1.5"/><path d="M31.8 100 24 123H40ZM88.2 100 80 123H96Z" fill="#1F6B45"/><path d="M24 119h16v5H24zM80 119h16v5H80z" fill="#C4283A"/><path d="M25.5 124v24M29 124v28M32.5 124v24M36 124v28M39 124v23M81.5 124v24M85 124v28M88.5 124v24M92 124v28M95 124v23" fill="none" stroke="#F4C542" stroke-width="2"/><circle cx="60" cy="60" r="54" fill="#C4283A"/><circle cx="60" cy="60" r="38" fill="#E4606E"/><path d="M60 60 48.83 44.63 60 12ZM60 60 71.17 44.63 105.65 45.17ZM60 60 78.07 65.87 88.21 98.83ZM60 60 60 79 31.79 98.83ZM60 60 41.93 65.87 14.35 45.17Z" fill="#FFE9A3"/><path d="M60 60 60 12 71.17 44.63ZM60 60 105.65 45.17 78.07 65.87ZM60 60 88.21 98.83 60 79ZM60 60 31.79 98.83 41.93 65.87ZM60 60 14.35 45.17 48.83 44.63Z" fill="#F4C542"/><circle cx="60" cy="60" r="7" fill="#FFF8DC"/><path d="M60 12 71.17 44.63 105.65 45.17 78.07 65.87 88.21 98.83 60 79 31.79 98.83 41.93 65.87 14.35 45.17 48.83 44.63Z" fill="none" stroke="#3F1F63" stroke-width="1.3" stroke-linejoin="round"/><circle cx="60" cy="60" r="54" fill="none" stroke="#3F1F63" stroke-width="1.5"/></svg>`);

// Rays fanning from the parol, as flat wedges (next/og has no conic gradients).
const SKY_SRC = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 486"><rect width="420" height="486" fill="${C.ube}"/>${Array.from(
    { length: 20 },
    (_, i) => {
      const a0 = (i * 18 * Math.PI) / 180;
      const a1 = ((i * 18 + 9) * Math.PI) / 180;
      const [cx, cy, r] = [330, 80, 900];
      return `<path d="M${cx} ${cy}L${(cx + r * Math.cos(a0)).toFixed(1)} ${(cy + r * Math.sin(a0)).toFixed(1)}L${(cx + r * Math.cos(a1)).toFixed(1)} ${(cy + r * Math.sin(a1)).toFixed(1)}Z" fill="${C.ubeSky}"/>`;
    },
  ).join("")}</svg>`,
);

const SWAG_SRC = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 40"><path d="M0 6Q180 30 360 6" fill="none" stroke="#3F1F63" stroke-width="1.3"/>${[
    [20, 17.5, 5, 8, 8, "#F4C542"],
    [49, 19.6, 6, 7, -6, "#C4283A"],
    [78, 23.6, 5.5, 8.5, 5, "#FFE9A3"],
    [107, 25, 6, 8, -9, "#1F6B45"],
    [136, 25.8, 5, 7.5, 4, "#F4C542"],
    [165, 26.9, 6.5, 8, -4, "#C4283A"],
    [194, 25.9, 5.5, 7, 7, "#FFE9A3"],
    [223, 26.8, 6, 8.5, -7, "#1F6B45"],
    [252, 25.1, 5, 8, 6, "#F4C542"],
    [281, 22.7, 6, 7.5, -5, "#C4283A"],
    [310, 20.7, 5.5, 8, 9, "#FFE9A3"],
    [339, 16.6, 6, 7, -8, "#1F6B45"],
  ]
    .map(([cx, cy, rx, ry, r, f]) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${r} ${cx} ${cy})" fill="${f}" stroke="#3F1F63" stroke-width="1.2"/>`)
    .join("")}</svg>`,
);

/* eslint-disable @next/next/no-img-element -- next/og renders plain <img> */

/** The evening sky with the bowl, the parol, and a slip: a name (open) or none (folded). */
function Sky({ slip }: { slip: string | null }) {
  return (
    <div
      style={{
        position: "absolute",
        right: 64,
        top: 100,
        width: 420,
        height: 486,
        borderRadius: "18px 12px 20px 12px",
        overflow: "hidden",
        display: "flex",
      }}
    >
      <img src={SKY_SRC} width={420} height={486} alt="" style={{ position: "absolute", left: 0, top: 0 }} />
      <img src={PAROL_SRC} width={140} height={198} alt="" style={{ position: "absolute", right: 20, top: 0 }} />
      {slip ? (
        <div
          style={{
            position: "absolute",
            left: 28,
            top: 34,
            width: 240,
            height: 96,
            background: "#ffffff",
            transform: "rotate(-4deg)",
            boxShadow: "4px 5px 0 rgba(30,18,56,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Gochi Hand",
            fontSize: 52,
            color: C.ube,
          }}
        >
          {slip}
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            left: 40,
            top: 60,
            width: 190,
            height: 102,
            background: "linear-gradient(168deg, #ffffff 0%, #ffffff 52%, #D9C8EC 52%, #D9C8EC 53%, #F6F1FB 53%)",
            transform: "rotate(-4deg)",
            boxShadow: "4px 5px 0 rgba(30,18,56,0.45)",
            display: "flex",
          }}
        />
      )}
      <img src={BOWL_SRC} width={312} height={260} alt="" style={{ position: "absolute", left: 30, bottom: 20 }} />
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
        background: C.takipsilim,
        fontFamily: "Atkinson Hyperlegible",
        color: C.ube,
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 64, display: "flex" }}>
        {[0, 1, 2, 3].map((i) => (
          <img key={i} src={SWAG_SRC} width={300} height={34} alt="" style={{ marginTop: 6 }} />
        ))}
      </div>
      <div style={{ position: "absolute", left: 72, top: 108, width: 600, bottom: 56, display: "flex", flexDirection: "column" }}>
        {children}
      </div>
      <Sky slip={slip} />
    </div>
  );
}

const head = (size: number): React.CSSProperties => ({ fontFamily: "Chelsea Market", fontSize: size, lineHeight: 1.08 });

/** Home: "Monito Monita — Isang link lang para sa buong bunutan." */
export async function homeImage(): Promise<ImageResponse> {
  return new ImageResponse(
    (
      <Frame slip="Ate Joy">
        <div style={{ ...head(40) }}>Monito Monita</div>
        <div style={{ ...head(78), marginTop: 26, display: "flex", flexDirection: "column" }}>
          <span>Isang link lang</span>
          <span>para sa buong</span>
          <span>bunutan.</span>
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, marginTop: "auto", color: C.ubeSoft }}>Bunutan, wishlists, at reveal.</div>
      </Frame>
    ),
    { ...OG_SIZE, fonts: await fontsPromise },
  );
}

/** Long group names step down in size so they stay within three lines. */
export function groupNameSize(name: string): number {
  const n = name.length;
  if (n <= 18) return 88;
  if (n <= 30) return 74;
  if (n <= 44) return 60;
  return 52;
}

/** Join link: "Sali na sa bunutan ng {group name}" with the party date. Nothing else. */
export async function groupImage(group: { name: string; partyDate: string }): Promise<ImageResponse> {
  return new ImageResponse(
    (
      <Frame slip={null}>
        <div style={{ fontSize: 38, fontWeight: 700 }}>Sali na sa bunutan ng</div>
        <div style={{ ...head(groupNameSize(group.name)), marginTop: 18, display: "flex" }}>{group.name}</div>
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 38, fontWeight: 700, color: C.dahon }}>{`Party: ${group.partyDate}`}</div>
          <div style={{ ...head(30) }}>Monito Monita</div>
        </div>
      </Frame>
    ),
    { ...OG_SIZE, fonts: await fontsPromise },
  );
}
