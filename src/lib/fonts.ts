import { Inter, Plus_Jakarta_Sans } from "next/font/google";

/**
 * Body text — matches the Figma "Inter - body text" spec (Extralight through
 * Extra Bold). Exposed as `--font-sans`, consumed by `@theme inline` in
 * globals.css and applied to `body` via the `font-sans` utility.
 */
export const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
});

/**
 * Headings — matches the Figma "Plus Jakarta Sans - Primary Type" spec.
 * Exposed as `--font-heading`, applied to h1-h6 via the `font-heading`
 * utility (see globals.css base layer).
 */
export const fontHeading = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "500", "600", "700", "800"],
});
