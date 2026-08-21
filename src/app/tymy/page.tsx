import type { Metadata } from "next";
import { Users } from "lucide-react";
import Link from "next/link";
import { publicFetch } from "@/lib/api";
import type { TeamLite } from "@/lib/types";
import { Page } from "@/components/layout/container";
import { Card, EmptyState, PageTitle, SectionTitle } from "@/components/ui/primitives";
import { TeamBadge } from "@/components/ui/data";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Týmy",
  description: "Přehled všech týmů Floorball Stars Ligy podle divizí — soupisky a profily.",
};

export default async function TymyPage() {
  const teams = (await publicFetch<TeamLite[]>("/teams")) ?? [];

  const byDivision = teams.reduce<Record<string, TeamLite[]>>((acc, t) => {
    const key = t.division ?? "Bez divize";
    (acc[key] ??= []).push(t);
    return acc;
  }, {});
  const divisions = Object.keys(byDivision).sort();

  return (
    <Page>
      <PageTitle title="Týmy" subtitle="Kompletní přehled účastníků ligy podle divizí" />

      {teams.length === 0 ? (
        <EmptyState icon={<Users size={40} />} title="Zatím žádné týmy" />
      ) : (
        <div className="space-y-10">
          {divisions.map((div) => (
            <section key={div}>
              <SectionTitle>
                {div} · {byDivision[div].length}
              </SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {byDivision[div]
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name, "cs"))
                  .map((t) => (
                    <Link key={t.id} href={`/tymy/${t.id}`}>
                      <Card
                        className="flex items-center gap-3.5 p-4 transition-colors hover:border-bd-strong hover:bg-c2/60"
                        style={{ borderLeft: `4px solid ${t.color ?? "#C9A140"}` }}
                      >
                        <TeamBadge abbr={t.abbr} color={t.color} logoUrl={t.logoUrl} size={44} />
                        <span className="min-w-0">
                          <span className="block truncate text-[15px] font-semibold text-wh">
                            {t.name}
                          </span>
                          <span className="block text-[12px] text-mu">
                            {[t.division, t.conference].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                      </Card>
                    </Link>
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Page>
  );
}
