import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { BrandingProvider } from "@/components/branding-provider";
import { brandingToCssVars, getDefaultBrandingSettingsMap, loadBrandingSettingsMap, LOGO_LANDING_SETTINGS } from "@/lib/branding-settings";
import { absoluteUrl, getSiteUrl, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: "AI Automation Agency | We Connect Innovative Solutions", template: `%s | ${SITE_NAME}` },
  description: "AI automation agency building n8n, Make.com, ChatGPT, Claude, Gemini and custom workflow integrations for businesses worldwide.",
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: absoluteUrl("/") }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "technology",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  openGraph: { type: "website", locale: "en_US", siteName: SITE_NAME, url: absoluteUrl("/"), title: "AI Automation Agency | We Connect Innovative Solutions", description: "Custom n8n, Make.com and AI automation solutions for businesses worldwide." },
  twitter: { card: "summary_large_image", title: "AI Automation Agency | We Connect Innovative Solutions", description: "Custom n8n, Make.com and AI automation solutions for businesses worldwide." },
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
      <body suppressHydrationWarning style={brandingToCssVars(LOGO_LANDING_SETTINGS)}>
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
