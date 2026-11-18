/**
 * Deterministic screen recorder for the app.
 *
 * Every frame is rendered on a virtual clock, then captured: sharp at any
 * device scale (2x laptop, 3x phone, 4K TV), perfectly even motion, no
 * browser UI and no system cursor (screenshots never include one).
 *
 * - Playwright's fake clock drives Date, timers, requestAnimationFrame and
 *   performance.now, so GSAP timelines and canvas-confetti step exactly.
 * - CSS animations, CSS transitions and Web Animations are pinned to the
 *   same clock each frame (document.getAnimations()).
 * - One frame = 16 ms of app time (the fake rAF period), written as 60 fps:
 *   the app plays at 0.96x real speed with no judder.
 * - canvas-confetti is kept on the main thread (no OffscreenCanvas), so its
 *   stars follow the clock too. Same library, same stars.
 * - Pointer and tap positions are logged per frame, so the cursor and tap
 *   rings can be drawn in Remotion.
 *
 * Frames are piped as JPEG into Remotion's bundled ffmpeg (H.264).
 */
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { chromium, type Browser, type BrowserContext, type CDPSession, type Locator, type Page } from "playwright";

export const FRAME_MS = 16;
export const REC_FPS = 60;

const VIDEO_DIR = join(__dirname, "..", "..", "..");
export const FFMPEG = join(VIDEO_DIR, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe");

export interface RecorderOptions {
  name: string;
  /** Output folder for <name>.mp4 and <name>.json */
  outDir: string;
  viewport: { width: number; height: number };
  scale: number;
  mobile?: boolean;
  /** Playwright storage state (cookies, localStorage) to start from. */
  storageState?: string | { cookies: unknown[]; origins: unknown[] };
  /** Fake wall-clock time at the start. */
  startTime?: Date;
  jpegQuality?: number;
  crf?: number;
  /** When false, no video is written (exploration runs). */
  encode?: boolean;
}

export type PointerEvent =
  | { f: number; t: "move"; x: number; y: number }
  | { f: number; t: "down"; x: number; y: number }
  | { f: number; t: "up"; x: number; y: number }
  | { f: number; t: "tap"; x: number; y: number }
  | { f: number; t: "mark"; label: string };

const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36";

/** Runs in the page before any app script. */
const INIT_SCRIPT = `
(() => {
  // canvas-confetti draws in a worker when it can; a worker runs on real
  // time. Without transferControlToOffscreen it draws on the main thread.
  try { delete HTMLCanvasElement.prototype.transferControlToOffscreen; } catch {}
  try { HTMLCanvasElement.prototype.transferControlToOffscreen = undefined; } catch {}
  // No blinking caret in captures.
  const style = () => {
    const s = document.createElement('style');
    s.textContent = '*{caret-color:transparent !important}';
    (document.head || document.documentElement).appendChild(s);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', style); else style();
})();
`;

/** Pins every CSS / Web Animation to the fake clock. Runs once per frame. */
const SYNC_ANIMATIONS = async () => {
  // Let React and other posted tasks run first (MessageChannel is not faked).
  for (let i = 0; i < 2; i++) {
    await new Promise<void>((resolve) => {
      const ch = new MessageChannel();
      ch.port1.onmessage = () => resolve();
      ch.port2.postMessage(0);
    });
  }
  const now = performance.now();
  for (const a of document.getAnimations()) {
    const anyA = a as Animation & { __v?: { start: number; rate: number } };
    if (!anyA.__v) {
      anyA.__v = { start: now, rate: a.playbackRate || 1 };
      a.pause();
    }
    a.currentTime = (now - anyA.__v.start) * anyA.__v.rate;
  }
};

export class Recorder {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  cdp!: CDPSession;
  frames = 0;
  log: PointerEvent[] = [];
  marks: Record<string, number> = {};
  private ffmpeg: ChildProcessWithoutNullStreams | null = null;
  private pointer = { x: 0, y: 0 };

  constructor(readonly opts: RecorderOptions) {}

  async start(): Promise<void> {
    const o = this.opts;
    this.browser = await chromium.launch({
      headless: true,
      args: ["--hide-scrollbars", "--force-color-profile=srgb", "--font-render-hinting=none", "--disable-lcd-text", "--lang=en-US"],
    });
    this.context = await this.browser.newContext({
      viewport: o.viewport,
      deviceScaleFactor: o.scale,
      isMobile: Boolean(o.mobile),
      hasTouch: Boolean(o.mobile),
      userAgent: o.mobile ? ANDROID_UA : undefined,
      locale: "en-US",
      timezoneId: "Asia/Manila",
      reducedMotion: "no-preference",
      colorScheme: "light",
      storageState: o.storageState as never,
    });
    await this.context.addInitScript(INIT_SCRIPT);
    // Copy buttons only say "Copied!" when the clipboard write succeeds.
    await this.context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await this.context.clock.install({ time: o.startTime ?? new Date() });
    this.page = await this.context.newPage();
    this.cdp = await this.context.newCDPSession(this.page);
    await this.context.clock.pauseAt((o.startTime ?? new Date()).getTime() + 1000);
    if (o.encode !== false) this.startEncoder();
  }

  private startEncoder() {
    const o = this.opts;
    mkdirSync(o.outDir, { recursive: true });
    const out = join(o.outDir, `${o.name}.mp4`);
    this.ffmpeg = spawn(FFMPEG, [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "image2pipe", "-framerate", String(REC_FPS), "-c:v", "mjpeg", "-i", "-",
      // JPEG is full-range BT.601; video wants limited-range BT.709.
      "-vf", "scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p",
      "-c:v", "libx264", "-preset", "medium", "-crf", String(o.crf ?? 14), "-tune", "animation",
      "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
      "-movflags", "+faststart",
      out,
    ]);
    this.ffmpeg.stderr.on("data", (d) => process.stderr.write(`[ffmpeg ${o.name}] ${d}`));
  }

  /** Real-time wait (the virtual clock stays paused). */
  async real(ms: number) {
    await new Promise((r) => setTimeout(r, ms));
  }

  /**
   * Loads a page, then lets it settle without capturing: streamed Suspense
   * content is revealed on a timer, so the clock ticks until `waitFor` shows.
   */
  async open(url: string, waitFor?: string) {
    await this.page.goto(url, { waitUntil: "load" });
    if (waitFor) {
      const target = this.page.locator(waitFor).first();
      await this.waitFor(() => target.isVisible(), { tick: true });
    }
    await this.page.evaluate(() => document.fonts.ready.then(() => undefined));
    await this.idle();
    // Let mount effects and lazy chunks settle on the clock without capturing.
    await this.advance(6, false);
    await this.idle();
  }

  /** Waits (real time) until the network has been quiet for a moment. */
  async idle(timeout = 15_000) {
    try {
      await this.page.waitForLoadState("networkidle", { timeout });
    } catch {
      // A polling page (the reveal's auto-refresh) is never fully idle.
    }
    await this.real(80);
  }

  private async syncAnimations() {
    await this.page.evaluate(SYNC_ANIMATIONS);
  }

  async capture() {
    if (!this.ffmpeg) {
      this.frames++;
      return;
    }
    // Device pixels (2x / 3x), caret hidden; animations are already pinned.
    const buf = await this.page.screenshot({
      type: "jpeg",
      quality: this.opts.jpegQuality ?? 93,
      scale: "device",
      animations: "allow",
      caret: "hide",
    });
    if (!this.ffmpeg.stdin.write(buf)) await once(this.ffmpeg.stdin, "drain");
    this.frames++;
  }

  /** Advances the clock by `n` frames, capturing each (or not). */
  async advance(n: number, capture = true) {
    for (let i = 0; i < n; i++) {
      await this.context.clock.runFor(FRAME_MS);
      await this.syncAnimations();
      if (capture) await this.capture();
    }
  }

  /** Captures `n` frames of whatever is on screen. */
  async hold(n: number) {
    await this.advance(n, true);
  }

  async holdSeconds(s: number) {
    await this.hold(Math.round((s * 1000) / FRAME_MS));
  }

  mark(label: string) {
    this.marks[label] = this.frames;
    this.log.push({ f: this.frames, t: "mark", label });
  }

  /** Centre of an element in CSS pixels, optionally offset by a fraction of its size. */
  async point(target: Locator, fx = 0.5, fy = 0.5): Promise<{ x: number; y: number }> {
    const box = await target.boundingBox();
    if (!box) throw new Error(`No box for ${target}`);
    return { x: box.x + box.width * fx, y: box.y + box.height * fy };
  }

  /** Moves the (virtual) mouse along an eased path over `n` frames, capturing each. */
  async moveTo(to: { x: number; y: number }, n: number) {
    const from = { ...this.pointer };
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    // A gentle arc, like a hand on a trackpad.
    const arc = Math.min(40, Math.hypot(to.x - from.x, to.y - from.y) * 0.08);
    for (let i = 1; i <= n; i++) {
      const t = ease(i / n);
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t - Math.sin(Math.PI * t) * arc;
      await this.page.mouse.move(x, y);
      this.pointer = { x, y };
      this.log.push({ f: this.frames, t: "move", x, y });
      await this.advance(1);
    }
  }

  /** Puts the pointer somewhere without capturing (the start of a move). */
  async placePointer(at: { x: number; y: number }) {
    await this.page.mouse.move(at.x, at.y);
    this.pointer = { ...at };
    this.log.push({ f: this.frames, t: "move", x: at.x, y: at.y });
  }

  /** Mouse click at the current pointer: down, hold `pressFrames`, up. */
  async click(pressFrames = 3) {
    const { x, y } = this.pointer;
    this.log.push({ f: this.frames, t: "down", x, y });
    await this.page.mouse.down();
    await this.advance(pressFrames);
    this.log.push({ f: this.frames, t: "up", x, y });
    await this.page.mouse.up();
  }

  /** Touch tap at a point (phone). Logs a tap ring. */
  async tap(at: { x: number; y: number }) {
    this.log.push({ f: this.frames, t: "tap", x: at.x, y: at.y });
    await this.page.touchscreen.tap(at.x, at.y);
  }

  /** Types text one key at a time, `framesPerChar` frames apart (jittered a little). */
  async type(text: string, framesPerChar: number, jitter = 0.35) {
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const ch of text) {
      await this.page.keyboard.type(ch);
      const n = Math.max(1, Math.round(framesPerChar * (1 + (rand() - 0.5) * 2 * jitter)));
      await this.advance(n);
    }
  }

  /**
   * After an action that waits on the server: captures `pendingFrames`
   * frames, then waits in real time until `ready` holds. With `tick`, the
   * clock moves one frame per check without capturing (timers such as
   * React's Suspense reveal need it); the recording simply skips that time.
   */
  async waitFor(
    ready: () => Promise<boolean>,
    { pendingFrames = 0, tick = true, timeout = 60_000 }: { pendingFrames?: number; tick?: boolean; timeout?: number } = {},
  ) {
    if (pendingFrames > 0) await this.advance(pendingFrames);
    const t0 = Date.now();
    while (!(await ready())) {
      if (Date.now() - t0 > timeout) throw new Error(`${this.opts.name}: timed out waiting`);
      if (tick) await this.advance(1, false);
      await this.real(30);
    }
    await this.syncAnimations();
  }

  /** Full-resolution PNG of the current state (stills). */
  async still(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    await this.syncAnimations();
    await this.page.screenshot({ path, type: "png", animations: "allow", caret: "hide" });
  }

  async finish(extra: Record<string, unknown> = {}) {
    const o = this.opts;
    if (this.ffmpeg) {
      this.ffmpeg.stdin.end();
      await once(this.ffmpeg, "close");
      writeFileSync(
        join(o.outDir, `${o.name}.json`),
        JSON.stringify(
          {
            name: o.name,
            fps: REC_FPS,
            frameMs: FRAME_MS,
            frames: this.frames,
            viewport: o.viewport,
            scale: o.scale,
            marks: this.marks,
            pointer: this.log,
            ...extra,
          },
          null,
          1,
        ),
      );
    }
    await this.browser.close();
  }
}
