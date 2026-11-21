/**
 * Layout checks the sweep (e2e/layouts.spec.ts) runs on every page it
 * screenshots, at every size:
 *
 * - expectNoOverlaps: form controls, buttons and lines of text must not
 *   overlap each other, and a control must not spill out of the column it
 *   sits in (iOS Safari's date input did, into Budget). Things that overlap
 *   on purpose opt out with `data-overlap-ok` on themselves or an ancestor:
 *   the landing bowl and its slip, gift tags, the light string, the poster's
 *   play label (inside its button anyway). Hidden, transparent and
 *   screen-reader-only elements are skipped.
 *
 * - collectAudit (AUDIT=1 only): writes what an iPhone audit needs to
 *   test-results/audit/<size>.json: form fields under 16px (iOS zooms the
 *   page on focus), tap targets under 44px, and text cut off by overflow or
 *   an ellipsis. A report, not a failure.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expect } from "./test";

type Hit = { a: string; b: string; area: number };

export async function expectNoOverlaps(page: Page, label: string) {
  const problems = await page.evaluate(() => {
    const CONTROL = "input:not([type=hidden]), select, textarea, button, a[href], [role=button]";
    const visible = (el: Element) => {
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") return false;
      for (let p: Element | null = el; p; p = p.parentElement) {
        const s = getComputedStyle(p);
        if (Number(s.opacity) === 0) return false;
        if (p.classList.contains("sr-only")) return false;
      }
      return true;
    };
    const exempt = (el: Element) => !!el.closest("[data-overlap-ok], .gift-tag, [data-light-string], [aria-hidden=true]");
    const name = (el: Element) => {
      const t = (el.getAttribute("aria-label") || el.textContent || (el as HTMLInputElement).name || "").trim().replace(/\s+/g, " ");
      return `${el.tagName.toLowerCase()}${t ? ` "${t.slice(0, 40)}"` : ""}`;
    };
    type Box = { el: Element; r: DOMRect; label: string; control: Element | null };
    const boxes: Box[] = [];
    // Controls: their border box (a link inside running text is checked as text instead).
    for (const el of document.querySelectorAll(CONTROL)) {
      if (!visible(el) || exempt(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      boxes.push({ el, r, label: name(el), control: el });
    }
    // Text: each rendered line of each text node, outside controls.
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || !n.textContent?.trim() || !visible(el) || exempt(el)) continue;
      if (el.closest(CONTROL) || el.closest("script, style, noscript, svg, option")) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      // Text cut off by `truncate` / overflow: only the part that shows counts.
      let clip: DOMRect | null = null;
      for (let p: Element | null = el; p && p !== document.body; p = p.parentElement) {
        const o = getComputedStyle(p);
        if (o.overflowX !== "visible" || o.overflowY !== "visible") {
          clip = p.getBoundingClientRect();
          break;
        }
      }
      for (const raw of range.getClientRects()) {
        const r = clip
          ? new DOMRect(
              Math.max(raw.left, clip.left),
              Math.max(raw.top, clip.top),
              Math.min(raw.right, clip.right) - Math.max(raw.left, clip.left),
              Math.min(raw.bottom, clip.bottom) - Math.max(raw.top, clip.top),
            )
          : raw;
        if (r.width < 1 || r.height < 1) continue;
        boxes.push({ el, r, label: `text "${n.textContent.trim().replace(/\s+/g, " ").slice(0, 40)}"`, control: null });
      }
    }
    const hits: Hit[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
        const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
        // More than a sliver: 2px each way (line boxes of adjacent lines may touch).
        if (w <= 2 || h <= 2) continue;
        // Notebook text buttons keep a 44px tap target in 40px rows (lst-row, -2px margins):
        // two in neighbouring rows share up to 4px. By design (docs/DESIGN.md, "Listahan").
        const link = (x: Box) => x.control?.getAttribute("data-variant") === "link";
        if (link(a) && link(b) && Math.min(w, h) <= 4) continue;
        // Two text lines from the same block can't overlap unless line-height is broken; still report.
        const key = `${a.label}|${b.label}`;
        if (seen.has(key)) continue;
        seen.add(key);
        hits.push({ a: a.label, b: b.label, area: Math.round(w * h) });
      }
    }
    // A control spilling out of its column: wider than its parent's content box.
    const spills: string[] = [];
    for (const b of boxes) {
      if (!b.control || !(b.control instanceof HTMLInputElement || b.control instanceof HTMLSelectElement || b.control instanceof HTMLTextAreaElement)) continue;
      const parent = b.control.parentElement;
      if (!parent) continue;
      const pr = parent.getBoundingClientRect();
      if (b.r.left < pr.left - 1 || b.r.right > pr.right + 1) spills.push(`${b.label} spills out of its column (${Math.round(b.r.width)}px in ${Math.round(pr.width)}px)`);
    }
    return { hits: hits.slice(0, 10), spills };
  });
  expect(problems.hits, `${label}: overlapping controls or text`).toEqual([]);
  expect(problems.spills, `${label}: controls wider than their column`).toEqual([]);
}

export async function collectAudit(page: Page, label: string, size: string) {
  if (!process.env.AUDIT) return;
  const found = await page.evaluate(() => {
    const out: { kind: string; what: string; detail: string }[] = [];
    const name = (el: Element) =>
      `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") || el.textContent || (el as HTMLInputElement).placeholder || (el as HTMLInputElement).name || "").trim().replace(/\s+/g, " ").slice(0, 50)}"`;
    const shown = (el: Element) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && !el.closest(".sr-only");
    };
    for (const el of document.querySelectorAll("input:not([type=hidden]), select, textarea")) {
      if (!shown(el)) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 16) out.push({ kind: "zoom-on-focus", what: name(el), detail: `${fs}px` });
    }
    for (const el of document.querySelectorAll("button, a[href], input:not([type=hidden]), select, textarea, [role=button], summary")) {
      if (!shown(el) || el.closest("[aria-hidden=true]")) continue;
      const r = el.getBoundingClientRect();
      // Links inside running text are exempt (WCAG 2.5.8 inline exception).
      const inline = el.tagName === "A" && getComputedStyle(el).display === "inline" && !!el.parentElement?.closest("p, li");
      if ((r.width < 44 || r.height < 44) && !inline) out.push({ kind: "tap-target", what: name(el), detail: `${Math.round(r.width)}×${Math.round(r.height)}` });
    }
    for (const el of document.querySelectorAll("body *")) {
      if (!shown(el) || el.children.length > 0 || !el.textContent?.trim()) continue;
      const cs = getComputedStyle(el);
      const clipsX = cs.textOverflow === "ellipsis" || cs.overflowX === "hidden" || cs.overflowX === "clip";
      const clamped = cs.webkitLineClamp && cs.webkitLineClamp !== "none";
      if ((clipsX && el.scrollWidth > el.clientWidth + 1) || (clamped && el.scrollHeight > el.clientHeight + 1)) {
        out.push({ kind: "cut-off", what: name(el), detail: `${el.scrollWidth}×${el.scrollHeight} in ${el.clientWidth}×${el.clientHeight}` });
      }
    }
    return out;
  });
  mkdirSync("test-results/audit", { recursive: true });
  appendFileSync(`test-results/audit/${size}.json`, JSON.stringify({ page: label, url: page.url(), found }) + "\n");
}
