import type { Metadata, Viewport } from "next";
import { ArtSymbols } from "@/components/art/symbols";
import { fontVariables } from "./fonts";
import { OFFLINE_BANNER_SCRIPT } from "@/lib/offline-banner";
import { serverSiteUrl } from "@/lib/server-site-url";
import { VIEW_TRANSITION_GUARD_SCRIPT } from "@/lib/view-transition-guard";
import { cn } from "@/lib/utils";
import "./globals.css";

// Absolute URLs for share images: NEXT_PUBLIC_SITE_URL in production
// (https://monitomonita-ph.vercel.app), else the deploy's own URL.

const SHARE_TITLE = "Monito Monita — Bunutan, wishlists, and the big reveal.";
const DESCRIPTION = "Bunutan, wishlists, and the big reveal. Isang link lang.";

export const metadata: Metadata = {
  metadataBase: serverSiteUrl(),
  title: "Monito Monita",
  description: DESCRIPTION,
  applicationName: "Monito Monita",
  appleWebApp: { title: "Monito Monita" },
  // The generic preview: home, and every page without its own (including
  // /me and the organizer page, which never get a group-specific one).
  openGraph: { title: SHARE_TITLE, description: DESCRIPTION, siteName: "Monito Monita", type: "website" },
  twitter: { card: "summary_large_image", title: SHARE_TITLE, description: DESCRIPTION },
};

// Ube, like the buttons and the evening sky: the browser bar matches the brand.
export const viewport: Viewport = {
  themeColor: "#3f1f63",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("h-full antialiased", fontVariables)}>
      <body className="flex min-h-full flex-col">
        {/* Every illustration, once, as <symbol>s (components/art/symbols.tsx). */}
        <ArtSymbols />
        {children}
        {/* The offline banner: an inline script, so it works before hydration (lib/offline-banner.ts). */}
        <script dangerouslySetInnerHTML={{ __html: OFFLINE_BANNER_SCRIPT }} />
        {/* No page transitions on WebKit (lib/view-transition-guard.ts). */}
        <script dangerouslySetInnerHTML={{ __html: VIEW_TRANSITION_GUARD_SCRIPT }} />
      </body>
    </html>
  );
}
