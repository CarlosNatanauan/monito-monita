import { Atkinson_Hyperlegible, Chelsea_Market, Gochi_Hand } from "next/font/google";

/*
 * The three faces (docs/DESIGN.md, "Type"), shared by the root layout and
 * app/global-error.tsx (which renders its own <html>).
 */

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

/** The CSS variables for <html>: --font-atkinson, --font-chelsea, --font-gochi. */
export const fontVariables = `${atkinson.variable} ${chelsea.variable} ${gochi.variable}`;
