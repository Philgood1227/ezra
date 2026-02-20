import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Lexend } from "next/font/google";
import { ThemeProvider } from "@/components/ds/theme-provider";
import { ThemeScript } from "@/components/ds/theme-script";
import { ToastProvider } from "@/components/ds/toast";
import { NetworkStatusBanner } from "@/components/feedback/network-status-banner";
import "./globals.css";

const uiFont = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  display: "swap",
});

const readingFont = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Ezra",
    template: "%s | Ezra",
  },
  description: "Assistant quotidien pour enfant TDAH et routines familiales",
  applicationName: "Ezra",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ezra",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${uiFont.variable} ${readingFont.variable} font-sans antialiased`}>
        <a href="#app-content" className="skip-link">
          Aller au contenu principal
        </a>
        <ThemeProvider>
          <ToastProvider position="top-right">
            <NetworkStatusBanner />
            <div id="app-content" tabIndex={-1}>
              {children}
            </div>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
