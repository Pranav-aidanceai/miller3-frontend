import type { Metadata } from "next";
import { ThemeProvider } from "@/components/providers/theme-provider"
import "./globals.css";
import { Providers } from "./Providers";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Miller 3",
  description: ""
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <>
      <html lang="en" suppressHydrationWarning>
        <head />
        <body>
          <Toaster />
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Providers>
              {children}
            </Providers>
          </ThemeProvider>
        </body>
      </html>
    </>
  )
}
