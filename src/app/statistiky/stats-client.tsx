"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import Link from "next/link";
import { statsApi } from "@/lib/api";
import { fullName, positionShort } from "@/lib/format";
import type { RefereeStatRow, ScorerRow } from "@/lib/types";
import { useDivisions, useSeasons } from "@/hooks/use-league";
import { useQueryState } from "@/hooks/use-query-state";
import { Card, Chip, ChipRow, EmptyState } from "@/components/ui/primitives";
import { ErrorView, SkeletonList } from "@/components/ui/feedback";
import { StarRow, TeamDot } from "@/components/ui/data";

type Tab = "strelci" | "nahravaci" | "body" | "mvp" | "rozhodci";

const TABS: { id: Tab; label: string }[] = [
  { id: "strelci", label: "Střelci" },
  { id: "nahravaci", label: "Nahrávači" },
  { id: "body", label: "Body" },
  { id: "mvp", label: "MVP" },
  { id: "rozhodci", label: "Rozhodčí" },
];

export function StatsClient() {
  const [tab, setTab] = useQueryState("tab", "strelci");
  const [division, setDivision] = useQueryState("divize");
  const [season, setSeason] = useQueryState("sezona");

  const { data: divisions = [] } = useDivisions();
  const { data: seasons = [] } = useSeasons();

  const active = (tab ?? "strelci") as Tab;
  const div = division || undefined;

  const query = useQuery({
    queryKey: ["stats", active, div, season],
    queryFn: async () => {
      switch (active) {
        case "strelci":
          return (await statsApi.scorers(div, season)).data;
        case "nahravaci":
          return (await statsApi.assisters(div, season)).data;
        case "body":
          return (await statsApi.points(div, season)).data;
        case "mvp":
          return (await statsApi.mvp(div, season)).data;
        case "rozhodci":
          return (await statsApi.referees(season)).data;
      }
    },
  });

  return (
    <div className="space-y-4">
      <ChipRow>
        {TABS.map((t) => (
          <Chip key={t.id} active={active === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </Chip>
        ))}
      </ChipRow>

      <div className="flex flex-wrap gap-4">
        {active !== "rozhodci" && divisions.length > 0 ? (
          <ChipRow className="flex-1">
            <Chip accent="purple" active={!division} onClick={() => setDivision(undefined)}>
              Vše
            </Chip>
            {divisions.map((d) => (
              <Chip
                key={d}
                accent="purple"
                active={division === d}
                onClick={() => setDivision(d)}
              >
                {d}
              </Chip>
            ))}
          </ChipRow>
        ) : null}

        {seasons.length > 1 ? (
          <ChipRow>
            {seasons.map((s, i) => (
              <Chip
                key={s}
                active={season === s || (!season && i === 0)}
                onClick={() => setSeason(i === 0 ? undefined : s)}
              >
                {s}
              </Chip>
            ))}
          </ChipRow>
        ) : null}
      </div>

      {query.isLoading ? (
        <SkeletonList rows={10} />
      ) : query.isError ? (
        <ErrorView onRetry={() => query.refetch()} />
      ) : !query.data?.length ? (
        <EmptyState icon={<BarChart3 size={40} />} title="Zatím žádná data" />
      ) : active === "rozhodci" ? (
        <RefereeBoard rows={query.data as RefereeStatRow[]} />
      ) : (
        <PlayerBoard rows={query.data as ScorerRow[]} tab={active} />
      )}
    </div>
  );
}

function PlayerBoard({ rows, tab }: { rows: ScorerRow[]; tab: Tab }) {
  const value = (r: ScorerRow) => {
    if (tab === "strelci") return `${r.goals ?? 0} G`;
    if (tab === "nahravaci") return `${r.assists ?? 0} A`;
    if (tab === "mvp") return `${r.votes ?? 0}×`;
    return `${r.points ?? (r.goals ?? 0) + (r.assists ?? 0)} B`;
  };

  return (
    <Card className="overflow-hidden">
      <div className="divide-y divide-bd">
        {rows.map((r, i) => (
          <Link
            key={r.player?.id ?? i}
            href={`/hraci/${r.player?.id}`}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-c2/60"
          >
            <span
              className={
                i < 3
                  ? "tabular w-7 text-[14px] font-bold text-go"
                  : "tabular w-7 text-[14px] text-di"
              }
            >
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-wh">
                {fullName(r.player)}
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-mu">
                <TeamDot color={r.player?.team?.color} size={6} />
                {r.player?.team?.abbr ?? "Bez týmu"}
                <span className="text-di">· {positionShort(r.player?.position)}</span>
                {tab === "body" ? (
                  <span className="text-di">
                    · {r.goals ?? 0}G {r.assists ?? 0}A
                  </span>
                ) : null}
              </span>
            </span>
            <span className="tabular shrink-0 text-[17px] font-bold text-go">{value(r)}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function RefereeBoard({ rows }: { rows: RefereeStatRow[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="divide-y divide-bd">
        {rows.map((r, i) => (
          <Link
            key={r.referee?.id ?? i}
            href={`/rozhodci/${r.referee?.id}`}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-c2/60"
          >
            <span className="tabular w-7 text-[14px] text-di">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-wh">
                {fullName(r.referee)}
              </span>
              <span className="mt-1 flex items-center gap-2">
                <StarRow value={r.avg} size={12} />
                <span className="text-[11px] text-mu">{r.count} hodnocení</span>
              </span>
            </span>
            <span className="shrink-0 text-[15px] font-bold text-go">
              {r.avg.toFixed(1)}
              <span className="text-[12px] font-normal text-mu">/5</span>
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
