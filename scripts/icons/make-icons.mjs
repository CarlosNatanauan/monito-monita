// The parol icons (docs/DESIGN.md, "In-between states"), from the parol in
// components/art/symbols.tsx:
// - app/icon.svg: the browser tab, the parol's disc and star (its tails
//   are too fine at 16px), on nothing;
// - app/favicon.ico: the same at 32px, for browsers that ask for /favicon.ico;
// - app/apple-icon.png (180) and public/icons/icon-{192,512}.png plus
//   icon-maskable-512.png: "Add to home screen", the whole parol on the
//   ube evening sky, full bleed (the phone cuts the corners).
// Re-run after changing the parol: node scripts/icons/make-icons.mjs
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const STAR = "M60 12 71.17 44.63 105.65 45.17 78.07 65.87 88.21 98.83 60 79 31.79 98.83 41.93 65.87 14.35 45.17 48.83 44.63Z";
const DISC = `
  <circle cx="60" cy="60" r="54" fill="#C4283A"/>
  <circle cx="60" cy="60" r="38" fill="#E4606E"/>
  <path d="M60 60 48.83 44.63 60 12ZM60 60 71.17 44.63 105.65 45.17ZM60 60 78.07 65.87 88.21 98.83ZM60 60 60 79 31.79 98.83ZM60 60 41.93 65.87 14.35 45.17Z" fill="#FFE9A3"/>
  <path d="M60 60 60 12 71.17 44.63ZM60 60 105.65 45.17 78.07 65.87ZM60 60 88.21 98.83 60 79ZM60 60 31.79 98.83 41.93 65.87ZM60 60 14.35 45.17 48.83 44.63Z" fill="#F4C542"/>
  <circle cx="60" cy="60" r="7" fill="#FFF8DC"/>
  <path d="${STAR}" fill="none" stroke="#3F1F63" stroke-width="2.4" stroke-linejoin="round"/>
  <circle cx="60" cy="60" r="54" fill="none" stroke="#3F1F63" stroke-width="3"/>`;
const TAILS = `
  <path d="M60 -30V8" fill="none" stroke="#FFFFFF" stroke-width="2"/>
  <path d="M31.8 100 24 123H40ZM88.2 100 80 123H96Z" fill="#1F6B45"/>
  <path d="M24 119h16v5H24zM80 119h16v5H80z" fill="#C4283A"/>
  <path d="M25.5 124v24M29 124v28M32.5 124v24M36 124v28M39 124v23M81.5 124v24M85 124v28M88.5 124v24M92 124v28M95 124v23" fill="none" stroke="#F4C542" stroke-width="2"/>`;

// The browser tab icon: the disc only, edge to edge.
const tab = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="4.5 4.5 111 111">${DISC}</svg>\n`;

// Rays of the evening sky (flat conic stripes in two ube tones, like `sky`).
function sky(size) {
  const rays = [];
  const n = 40;
  for (let i = 0; i < n; i += 2) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    const r = size * 2;
    const cx = size / 2;
    const cy = size * 0.4;
    rays.push(`<path d="M${cx} ${cy}L${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)}L${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)}Z" fill="#4A2873"/>`);
  }
  return `<rect width="${size}" height="${size}" fill="#3F1F63"/>${rays.join("")}`;
}

// The home-screen icon: the whole parol on the sky. `safe` keeps it inside
// the maskable safe zone (the middle 80%).
function home(size, safe) {
  const parolH = size * (safe ? 0.62 : 0.78);
  const scale = parolH / 152;
  const x = size / 2 - 60 * scale;
  const y = size * (safe ? 0.17 : 0.08);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${sky(size)}
  <g transform="translate(${x} ${y}) scale(${scale})">${TAILS}${DISC}</g></svg>`;
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("app/icon.svg", tab);

const browser = await chromium.launch();
const page = await browser.newPage();
async function png(svg, size) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
  return page.locator("svg").screenshot({ omitBackground: true });
}
writeFileSync("app/apple-icon.png", await png(home(180, false), 180));
writeFileSync("public/icons/icon-192.png", await png(home(192, false), 192));
writeFileSync("public/icons/icon-512.png", await png(home(512, false), 512));
writeFileSync("public/icons/icon-maskable-512.png", await png(home(512, true), 512));

// favicon.ico: one 32px PNG inside an ICO container.
const p32 = await png(tab, 32);
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // icon
header.writeUInt16LE(1, 4); // one image
header.writeUInt8(32, 6); // width
header.writeUInt8(32, 7); // height
header.writeUInt8(0, 8); // no palette
header.writeUInt8(0, 9);
header.writeUInt16LE(1, 10); // planes
header.writeUInt16LE(32, 12); // bits per pixel
header.writeUInt32LE(p32.length, 14);
header.writeUInt32LE(22, 18); // offset
writeFileSync("app/favicon.ico", Buffer.concat([header, p32]));
await browser.close();
console.log("icons written");
