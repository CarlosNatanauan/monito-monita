import type { MetadataRoute } from "next";

/**
 * "Add to home screen" (docs/DESIGN.md, "In-between states"): the proper
 * name and the parol icon. `display: "browser"` on purpose: the app is not
 * a PWA (no service worker, docs/PRODUCT.md "Later"), and a standalone
 * window on iPhone keeps its own cookies, so people would arrive logged
 * out of their group. The shortcut opens the normal browser instead.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Monito Monita",
    short_name: "Monito Monita",
    description: "Bunutan, wishlists, and the big reveal. Isang link lang.",
    start_url: "/",
    display: "browser",
    background_color: "#EEE9F6",
    theme_color: "#3F1F63",
    lang: "en",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
