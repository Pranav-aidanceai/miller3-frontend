import type { Metadata } from "next";
import { ThemeProvider } from "@/components/providers/theme-provider"
import { fontHeading, fontSans } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import "./globals.css";
import { Providers } from "./Providers";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

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
      <html
        lang="en"
        suppressHydrationWarning
        className={cn(fontSans.variable, fontHeading.variable)}
      >
        <head />
        <body>
          <Toaster />
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <Providers>
              <TooltipProvider delayDuration={200}>
                {children}
              </TooltipProvider>
            </Providers>
          </ThemeProvider>
        </body>
      </html>
    </>
  )
}
