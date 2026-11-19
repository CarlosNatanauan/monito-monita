/**
 * The landing video's player (docs/DESIGN.md, "Landing video"), loaded by a
 * dynamic import on the first press of the poster: it makes the <video>
 * (self-hosted MP4, H.264), plays it with sound (the press is the user's
 * gesture) and hands control back when it's done.
 *
 * - Laptop and tablet: plays in place, filling the poster's box, native controls.
 * - Phones (< 600px): full screen once playing (requestFullscreen, or on iOS
 *   webkitEnterFullscreen); leaving full screen pauses and goes back to the poster.
 * - The end of the video goes back to the poster.
 */

export const VIDEO_SRC = { hd: "/landing/monito-monita-1080.mp4", sd: "/landing/monito-monita-720.mp4" };

type WebkitVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
};

export type PlayerOptions = {
  /** The poster's box: the video fills it. */
  box: HTMLElement;
  poster: string;
  /** Called once when the viewer is done (ended, or left full screen on a phone). */
  onDone: () => void;
};

/** Starts playback; returns a function that stops it and removes the video. */
export function startVideo({ box, poster, onDone }: PlayerOptions): () => void {
  const phone = !window.matchMedia("(min-width: 600px)").matches;
  const laptop = window.matchMedia("(min-width: 1024px)").matches;
  const video = document.createElement("video") as WebkitVideo;
  video.controls = true;
  // iPhone: without playsinline, play() opens its own full-screen player (webkitendfullscreen on the way out).
  video.playsInline = !phone;
  video.preload = "auto";
  video.poster = poster;
  video.src = laptop ? VIDEO_SRC.hd : VIDEO_SRC.sd;
  video.setAttribute("aria-label", "Monito Monita: the demo video");
  video.className = "absolute inset-0 size-full bg-ube object-contain";
  box.append(video);

  let finished = false;
  const stop = () => {
    if (finished) return;
    finished = true;
    video.pause();
    document.removeEventListener("fullscreenchange", onFullscreen);
    video.removeEventListener("webkitendfullscreen", done);
    video.removeEventListener("ended", done);
    video.remove();
  };
  const done = () => {
    if (finished) return;
    if (document.fullscreenElement === video) void document.exitFullscreen().catch(() => {});
    stop();
    onDone();
  };
  const onFullscreen = () => {
    if (document.fullscreenElement !== video) done();
  };
  video.addEventListener("ended", done);

  const goFullscreen = () => {
    if (!phone) return;
    if (typeof video.requestFullscreen === "function") {
      video
        .requestFullscreen()
        .then(() => document.addEventListener("fullscreenchange", onFullscreen))
        .catch(() => enterIosFullscreen());
    } else enterIosFullscreen();
  };
  const enterIosFullscreen = () => {
    if (typeof video.webkitEnterFullscreen !== "function") return;
    video.addEventListener("webkitendfullscreen", done);
    if (video.webkitDisplayingFullscreen) return; // play() already opened it
    try {
      video.webkitEnterFullscreen();
    } catch {
      /* stays inline with its controls */
    }
  };

  // If play() is refused (no sound allowed), the video stays with its controls for a tap.
  void video.play().then(goFullscreen, () => {});
  video.focus();
  return stop;
}
