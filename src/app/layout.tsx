import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://fslleague.cz"),
  title: {
    default: "Floorball Stars Liga — FSL",
    template: "%s · FSL",
  },
  description:
    "Oficiální web Floorball Stars Ligy. Živé výsledky, tabulka, statistiky hráčů, soupisky týmů, rozhodčí a draft.",
  keywords: [
    "florbal",
    "florbalová liga",
    "FSL",
    "Floorball Stars Liga",
    "výsledky",
    "tabulka",
    "statistiky",
  ],
  openGraph: {
    type: "website",
    locale: "cs_CZ",
    siteName: "Floorball Stars Liga",
    title: "Floorball Stars Liga — FSL",
    description:
      "Živé výsledky, tabulka, statistiky a soupisky české florbalové ligy FSL.",
    url: "https://fslleague.cz",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0D0120",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="cs">
      <head>
        {/* Inter se načítá z Google Fonts za běhu – nezdržuje build a systémové
            písmo slouží jako okamžitý fallback. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300..900;1,14..32,300..900&display=swap"
        />
      </head>
      <body className="min-h-screen antialiased">
        <Providers>
          <div className="relative z-10 flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
