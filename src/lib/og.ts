import type { Metadata } from "next";

const BASE = "https://fslleague.cz";

/** Náhledový obrázek pro sdílení odkazu — `public/og.png`, 1200 × 630. */
export const OG_OBRAZEK = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "Floorball Stars Liga — nová florbalová liga v Praze",
};

/**
 * Náhled odkazu pro jednu stránku.
 *
 * Metadata se v Nextu slučují po klíčích, ne do hloubky: jakmile si stránka
 * napíše vlastní `openGraph`, přepíše ten z layoutu CELÝ — i s obrázkem.
 * Do 15. 9. 2026 to tak nikdo nedělal a všechny stránky proto sdílely
 * titulek, popis i adresu úvodní stránky: kdo poslal odkaz na ceník, poslal
 * náhled homepage a `og:url`, které vedlo jinam, než na co člověk klikl.
 *
 * Nová veřejná stránka si náhled bere odsud, ne ručně.
 */
export function sdileni({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      type: "website",
      locale: "cs_CZ",
      siteName: "Floorball Stars Liga",
      title,
      description,
      url: `${BASE}${path}`,
      images: [OG_OBRAZEK],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_OBRAZEK.url],
    },
  };
}
