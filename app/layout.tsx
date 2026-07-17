import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { BrandingProvider } from "@/components/branding-provider";
import { brandingToCssVars, getDefaultBrandingSettingsMap, loadBrandingSettingsMap } from "@/lib/branding-settings";

export const metadata: Metadata = {
  title: "We Connect Innovative Solutions Pvt. Ltd.",
  description: "Digital products, intelligent automation, AI solutions, and scalable experiences built for business growth.",
  icons: {
    icon: "/icon.jpeg",
    shortcut: "/icon.jpeg",
    apple: "/icon.jpeg",
  },
};

import { Chatbot } from "@/components/public/chatbot";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const initialBranding = (await loadBrandingSettingsMap().catch(() => getDefaultBrandingSettingsMap()));

  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning style={brandingToCssVars(initialBranding.landing)}>
        <ThemeProvider>
          <BrandingProvider initialSettings={initialBranding}>
            {children}
            <Chatbot />
          </BrandingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
