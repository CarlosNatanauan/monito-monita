import type { Metadata, Viewport } from "next";
import { Gochi_Hand, Instrument_Serif, Manrope } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

// Everything else: body, labels, buttons, card titles.
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
  variable: "--font-manrope",
});

// Large headings only (30px and up), always italic.
const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  display: "swap",
  variable: "--font-instrument",
});

// Gochi Hand is only for names on slips and codenames.
const gochi = Gochi_Hand({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-gochi",
});

export const metadata: Metadata = {
  title: "Monito Monita",
  description: "Bunutan, wishlists, and the big reveal. Isang link lang.",
};

export const viewport: Viewport = {
  themeColor: "#edf3e6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full antialiased", manrope.variable, instrument.variable, gochi.variable)}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
