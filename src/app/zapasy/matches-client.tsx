"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, Radio } from "lucide-react";
import { matchesApi } from "@/lib/api";
import type { MatchStatus } from "@/lib/types";
import { useDivisions, useSeasons } from "@/hooks/use-league";
import { useQueryState } from "@/hooks/use-query-state";
import { Chip, ChipRow, EmptyState } from "@/components/ui/primitives";
import { ErrorView, SkeletonCards } from "@/components/ui/feedback";
import { MatchCard } from "@/components/match-card";

const FILTERS: { id: MatchStatus; label: string }[] = [
  { id: "LIVE", label: "Právě hraje" },
  { id: "UPCOMING", label: "Nadcházející" },
  { id: "DONE", label: "Odehrané" },
];

const EMPTY: Record<string, { icon: React.ReactNode; title: string; desc: string }> = {
  UPCOMING: {
    icon: <CalendarDays size={44} />,
    title: "Žádné nadcházející zápasy",
    desc: "Rozpis zápasů přidá supervisor ligy.",
  },
  LIVE: {
    icon: <Radio size={44} />,
    title: "Žádný zápas právě neprobíhá",
    desc: "Živé výsledky se zobrazí, jakmile zápas začne.",
  },
  DONE: {
    icon: <CheckCircle2 size={44} />,
    title: "Žádné odehrané zápasy",
    desc: "Odehrané zápasy se zobrazí po ukončení prvního kola.",
  },
};

export function MatchesClient() {
  const [status, setStatus] = useQueryState("stav", "UPCOMING");
  const [division, setDivision] = useQueryState("divize");
  const [season, setSeason] = useQueryState("sezona");

  const { data: divisions = [] } = useDivisions();
  const { data: seasons = [] } = useSeasons();

  const filter = (status ?? "UPCOMING") as MatchStatus;

  const query = useQuery({
    queryKey: ["matches", filter, division, season],
    refetchInterval: filter === "LIVE" ? 10_000 : false,
    queryFn: async () => {
      const params: Record<string, unknown> = { status: filter, limit: 60 };
      if (division) params.division = division;
      if (season && filter === "DONE") params.season = season;
      return (await matchesApi.list(params)).data;
    },
  });

  const empty = EMPTY[filter] ?? EMPTY.UPCOMING;

  return (
    <div className="space-y-4">
      <ChipRow>
        {FILTERS.map((f) => (
          <Chip key={f.id} active={filter === f.id} onClick={() => setStatus(f.id)}>
            {f.label}
          </Chip>
        ))}
      </ChipRow>

      {divisions.length > 0 ? (
        <ChipRow>
          <Chip active={!division} onClick={() => setDivision(undefined)}>
            Vše
          </Chip>
          {divisions.map((d) => (
            <Chip key={d} active={division === d} onClick={() => setDivision(d)}>
              {d}
            </Chip>
          ))}
        </ChipRow>
      ) : null}

      {seasons.length > 1 && filter === "DONE" ? (
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

      {query.isLoading ? (
        <SkeletonCards count={6} />
      ) : query.isError ? (
        <ErrorView onRetry={() => query.refetch()} />
      ) : !query.data?.length ? (
        <EmptyState icon={empty.icon} title={empty.title} description={empty.desc} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {query.data.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}
