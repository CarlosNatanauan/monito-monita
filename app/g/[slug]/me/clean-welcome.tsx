"use client";

import { useEffect } from "react";

/**
 * Removes ?welcome=1 once the welcome highlight has rendered, so a reload
 * or a shared screenshot doesn't keep it. Replaces the URL in place (Next
 * keeps its router in step with history.replaceState); no navigation.
 */
export function CleanWelcomeParam() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("welcome")) return;
    url.searchParams.delete("welcome");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);
  return null;
}
