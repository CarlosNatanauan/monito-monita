import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Monito Monita",
  description: "Bunutan, wishlists, and the big reveal. Isang link lang.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
