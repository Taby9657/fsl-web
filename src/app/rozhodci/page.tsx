import type { Metadata } from "next";
import Link from "next/link";
import { publicFetch } from "@/lib/api";
import type { Referee, RefereeStatRow } from "@/lib/types";
import { fullName, REFEREE_LEVEL_LABEL } from "@/lib/format";
import { Page } from "@/components/layout/container";
import { Card, EmptyState, PageTitle } from "@/components/ui/primitives";
import { Avatar, StarRow } from "@/components/ui/data";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Rozhodčí",
  description: "Rozhodčí Floorball Stars Ligy, jejich úroveň a hodnocení od týmů.",
};

export default async function RozhodciPage() {
  const [referees, stats] = await Promise.all([
    publicFetch<Referee[]>("/referees", { status: "APPROVED" }),
    publicFetch<RefereeStatRow[]>("/stats/referees"),
  ]);

  const ratingById = new Map((stats ?? []).map((s) => [s.referee?.id, s]));
  const list = referees ?? [];

  return (
    <Page size="narrow">
      <PageTitle
        title="Rozhodčí"
        subtitle="Schválení rozhodčí ligy a jejich průměrné hodnocení od týmů"
      />

      {list.length === 0 ? (
        <EmptyState title="Zatím žádní schválení rozhodčí" />
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-bd">
            {list.map((r) => {
              const stat = ratingById.get(r.id);
              return (
                <Link
                  key={r.id}
                  href={`/rozhodci/${r.id}`}
                  className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-c2/60"
                >
                  <Avatar
                    photoUrl={r.photoUrl}
                    firstName={r.firstName}
                    lastName={r.lastName}
                    size={42}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-wh">
                      {fullName(r)}
                    </span>
                    <span className="block text-[12px] text-mu">
                      {REFEREE_LEVEL_LABEL[r.level] ?? `Úroveň ${r.level}`}
                    </span>
                  </span>
                  {stat ? (
                    <span className="flex shrink-0 items-center gap-2">
                      <StarRow value={stat.avg} size={13} />
                      <span className="text-[13px] font-bold text-go">
                        {stat.avg.toFixed(1)}
                      </span>
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </Page>
  );
}
