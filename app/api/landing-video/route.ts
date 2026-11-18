import { after } from "next/server";
import { analyticsConfig } from "@/server/analytics";
import { isLandingVideoPlay, sendLandingVideoPlayed } from "@/server/landing-video";

/**
 * POST /api/landing-video: the landing's demo video was played. Counted
 * after the response ("landing_video_played", server/landing-video.ts);
 * always answers 204, so it tells a caller nothing.
 */
export async function POST(request: Request) {
  const config = analyticsConfig();
  const host = request.headers.get("host") ?? new URL(request.url).host;
  if (config && isLandingVideoPlay(request.method, request.headers, host)) {
    after(() => sendLandingVideoPlayed(config));
  }
  return new Response(null, { status: 204 });
}
