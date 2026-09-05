import type { Metadata } from "next";
import { Users } from "lucide-react";
import Link from "next/link";
import { publicFetch } from "@/lib/api";
import type { TeamLite } from "@/lib/types";
import { Page } from "@/components/layout/container";
import { Card, EmptyState, PageTitle } from "@/components/ui/primitives";
import { TeamBadge } from "@/components/ui/data";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Týmy",
  description: "Přehled všech týmů Floorball Stars Ligy — soupisky a profily.",
};

export default async function TymyPage() {
  const teams = (await publicFetch<TeamLite[]>("/teams")) ?? [];

  // Prostý abecední seznam. Seskupení podle divizí tu bylo dřív, ale dokud liga
  // není rozlosovaná, nemá co seskupovat — divizi přiděluje supervisor až tehdy,
  // takže nový tým ji má prázdnou a spadl by pod nadpis „Bez divize".
  // Až budou divize obsazené, dává smysl vrátit se k seskupení podle nich —
  // ale pak bez opakování divize na kartě, jinak stojí dvakrát pod sebou.
  const serazene = [...teams].sort((a, b) => a.name.localeCompare(b.name, "cs"));

  return (
    <Page>
      <PageTitle title="Týmy" subtitle="Kompletní přehled účastníků ligy" />

      {serazene.length === 0 ? (
        <EmptyState icon={<Users size={40} />} title="Zatím žádné týmy" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {serazene.map((t) => {
            const zarazeni = [t.division, t.conference].filter(Boolean).join(" · ");
            return (
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
                    {/* Zařazení ukazujeme, jen když ho tým má — jinak by tu svítilo prázdno */}
                    {zarazeni ? (
                      <span className="block text-[12px] text-mu">{zarazeni}</span>
                    ) : null}
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </Page>
  );
}
