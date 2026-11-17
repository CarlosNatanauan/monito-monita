import { isCronAuthorized } from "@/server/cron";
import { deleteExpiredDemos } from "@/server/demo";

/**
 * Daily Vercel Cron (vercel.json): deletes demo groups past their 24
 * hours. Only demo groups can match (server/demo.ts, deleteExpiredDemos).
 * New demos also clean up on the way in, so a missed day changes nothing.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const deleted = await deleteExpiredDemos();
    return Response.json({ deleted });
  } catch (error) {
    console.error("demo cleanup failed", error);
    return Response.json({ error: "cleanup failed" }, { status: 500 });
  }
}
