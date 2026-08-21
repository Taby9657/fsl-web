import type { MetadataRoute } from "next";
import { publicFetch } from "@/lib/api";
import type { Match, TeamLite } from "@/lib/types";

const BASE = "https://fslleague.cz";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/zapasy",
    "/tabulka",
    "/statistiky",
    "/tymy",
    "/rozhodci",
    "/pavouk",
    "/porovnani",
    "/aktuality",
    "/aplikace",
    "/kontakt",
    "/ochrana-osobnich-udaju",
    "/podminky",
  ].map((path) => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const [teams, matches] = await Promise.all([
    publicFetch<TeamLite[]>("/teams", undefined, 3600),
    publicFetch<Match[]>("/matches", { limit: 200 }, 3600),
  ]);

  return [
    ...staticRoutes,
    ...(teams ?? []).map((t) => ({
      url: `${BASE}/tymy/${t.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...(matches ?? []).map((m) => ({
      url: `${BASE}/zapasy/${m.id}`,
      lastModified: new Date(m.date),
      changeFrequency: "daily" as const,
      priority: 0.5,
    })),
  ];
}
