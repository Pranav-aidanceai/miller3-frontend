import localFont from "next/font/local";

// Self-hosted rather than next/font/google: that downloads the font files from
// Google at build time, and a failed download on the CI runner breaks the
// whole build. The files in src/fonts are the Latin-subset variable fonts
// (the subset next/font/google preloaded) from Fontsource 5.3.0, under the SIL
// Open Font License — see the *-OFL.txt files beside them. Characters outside
// that subset fall back to the system sans-serif.

/**
 * Body text — matches the Figma "Inter - body text" spec (Extralight through
 * Extra Bold). Exposed as `--font-sans`, consumed by `@theme inline` in
 * globals.css and applied to `body` via the `font-sans` utility.
 */
export const fontSans = localFont({
  src: "../fonts/inter-latin-wght-normal.woff2",
  variable: "--font-sans",
  weight: "100 900", // variable font: every weight in one file
  display: "swap",
});

/**
 * Headings — matches the Figma "Plus Jakarta Sans - Primary Type" spec.
 * Exposed as `--font-heading`, applied to h1-h6 via the `font-heading`
 * utility (see globals.css base layer).
 */
export const fontHeading = localFont({
  src: "../fonts/plus-jakarta-sans-latin-wght-normal.woff2",
  variable: "--font-heading",
  weight: "200 800", // variable font: every weight in one file
  display: "swap",
});
