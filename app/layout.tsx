import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { BrandingProvider } from "@/components/branding-provider";
import { brandingToCssVars, getDefaultBrandingSettingsMap, loadBrandingSettingsMap, LOGO_LANDING_SETTINGS } from "@/lib/branding-settings";
import { absoluteUrl, getSiteUrl, SITE_NAME } from "@/lib/seo";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: "Custom Software & AI Automation Company | We Connect", template: `%s | ${SITE_NAME}` },
  description: "Custom software, web and mobile app development plus AI automation with n8n, Make.com, ChatGPT, Claude and Gemini for businesses worldwide.",
  applicationName: SITE_NAME,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "We Connect",
  },
  formatDetection: { telephone: false },
  authors: [{ name: SITE_NAME, url: absoluteUrl("/") }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "technology",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  openGraph: { type: "website", locale: "en_US", siteName: SITE_NAME, url: absoluteUrl("/"), title: "Custom Software & AI Automation Company | We Connect", description: "Custom software, web and mobile development with n8n, Make.com and AI automation for businesses worldwide." },
  twitter: { card: "summary_large_image", title: "Custom Software & AI Automation Company | We Connect", description: "Custom software, web and mobile development with n8n, Make.com and AI automation for businesses worldwide." },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#00216e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
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
            <ServiceWorkerRegistration />
          </BrandingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
