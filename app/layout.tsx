import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Chelsea_Market, Gochi_Hand } from "next/font/google";
import { ArtSymbols } from "@/components/art/symbols";
import { serverSiteUrl } from "@/lib/server-site-url";
import { cn } from "@/lib/utils";
import "./globals.css";

// Everything else: body, labels, secondary buttons, helper text.
const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-atkinson",
});

// Headings, primary buttons, tag values. Hand-lettered; never a person's name.
const chelsea = Chelsea_Market({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-chelsea",
});

// Gochi Hand is only for people's names and codenames.
const gochi = Gochi_Hand({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-gochi",
});

// Absolute URLs for share images: NEXT_PUBLIC_SITE_URL in production
// (https://monitomonita-ph.vercel.app), else the deploy's own URL.

const SHARE_TITLE = "Monito Monita — Bunutan, wishlists, and the big reveal.";
const DESCRIPTION = "Bunutan, wishlists, and the big reveal. Isang link lang.";

export const metadata: Metadata = {
  metadataBase: serverSiteUrl(),
  title: "Monito Monita",
  description: DESCRIPTION,
  // The generic preview: home, and every page without its own (including
  // /me and the organizer page, which never get a group-specific one).
  openGraph: { title: SHARE_TITLE, description: DESCRIPTION, siteName: "Monito Monita", type: "website" },
  twitter: { card: "summary_large_image", title: SHARE_TITLE, description: DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: "#eee9f6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("h-full antialiased", atkinson.variable, chelsea.variable, gochi.variable)}>
      <body className="flex min-h-full flex-col">
        {/* Every illustration, once, as <symbol>s (components/art/symbols.tsx). */}
        <ArtSymbols />
        {children}
      </body>
    </html>
  );
}
