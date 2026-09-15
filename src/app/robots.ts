import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/muj-ucet",
          // Osobní stránka hráče — vrací 200 i nepřihlášenému, takže bez
          // tohohle řádku ji crawler indexuje jako každou jinou.
          "/muj-profil",
          "/platby",
          "/nastaveni",
          "/oznameni",
          "/tym/",
        ],
      },
    ],
    sitemap: "https://fslleague.cz/sitemap.xml",
  };
}
