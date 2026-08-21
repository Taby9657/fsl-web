import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicFetch } from "@/lib/api";
import type { Match, Referee, RefereeStatRow } from "@/lib/types";
import { fullName, REFEREE_LEVEL_LABEL } from "@/lib/format";
import { Page } from "@/components/layout/container";
import { Card } from "@/components/ui/primitives";
import { Avatar, StarRow } from "@/components/ui/data";
import { RefereeMatches } from "./referee-matches";

export const revalidate = 120;

type Props = { params: Promise<{ id: string }> };

async function loadReferee(id: string) {
  const list = await publicFetch<Referee[]>("/referees");
  return (list ?? []).find((r) => r.id === id) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const r = await loadReferee(id);
  if (!r) return { title: "Rozhodčí nenalezen" };
  return {
    title: fullName(r),
    description: `Nasazení a hodnocení rozhodčího ${fullName(r)} ve Floorball Stars Lize.`,
  };
}

export default async function RefereePage({ params }: Props) {
  const { id } = await params;
  const [referee, future, stats] = await Promise.all([
    loadReferee(id),
    publicFetch<Match[]>(`/referees/${id}/future-matches`, undefined, 60),
    publicFetch<RefereeStatRow[]>("/stats/referees", undefined, 300),
  ]);
  if (!referee) notFound();

  const stat = (stats ?? []).find((s) => s.referee?.id === id);

  return (
    <Page size="narrow">
      <Card className="mb-6 p-6">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar
            photoUrl={referee.photoUrl}
            firstName={referee.firstName}
            lastName={referee.lastName}
            size={64}
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-wh">{fullName(referee)}</h1>
            <p className="mt-1 text-[14px] text-mu">
              {REFEREE_LEVEL_LABEL[referee.level] ?? `Úroveň ${referee.level}`}
            </p>
          </div>
          {stat ? (
            <div className="text-right">
              <StarRow value={stat.avg} size={16} />
              <p className="mt-1 text-[12px] text-mu">
                {stat.avg.toFixed(1)} / 5 · {stat.count} hodnocení
              </p>
            </div>
          ) : null}
        </div>
      </Card>

      <RefereeMatches refereeId={id} future={future ?? []} />
    </Page>
  );
}
