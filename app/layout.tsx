import type { Metadata, Viewport } from "next";
import { Gochi_Hand, Plus_Jakarta_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

// Gochi Hand is only for names on slips and codenames.
const gochi = Gochi_Hand({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-gochi",
});

export const metadata: Metadata = {
  title: "Monito Monita",
  description: "Bunutan, wishlists, and the big reveal. Isang link lang.",
};

export const viewport: Viewport = {
  themeColor: "#f3f0f7",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full antialiased", jakarta.variable, gochi.variable)}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
