import { homeImage, OG_SIZE } from "@/components/og/share-card";

// Share preview for the home page, and the generic one every page without
// its own inherits (/me and the organizer page never get a group-specific one).
export const alt = "Monito Monita — Bunutan, wishlists, and the big reveal.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return homeImage();
}
