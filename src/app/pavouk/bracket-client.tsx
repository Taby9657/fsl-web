"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Trophy } from "lucide-react";
import Link from "next/link";
import { matchesApi } from "@/lib/api";
import { fmtMatch } from "@/lib/format";
import type { Match } from "@/lib/types";
import { useDivisions, useSeasons } from "@/hooks/use-league";
import { useQueryState } from "@/hooks/use-query-state";
import { Card, Chip, ChipRow, EmptyState } from "@/components/ui/primitives";
import { ErrorView, LiveBadge, SkeletonCards } from "@/components/ui/feedback";
import { TeamDot } from "@/components/ui/data";

function roundLabel(round: number, max: number) {
  const d = max - round;
  if (d === 0) return "Finále";
  if (d === 1) return "Semifinále";
  if (d === 2) return "Čtvrtfinále";
  if (d === 3) return "Osmifinále";
  return `Kolo ${round}`;
}

export function BracketClient() {
  const [division, setDivision] = useQueryState("divize");
  const [season, setSeason] = useQueryState("sezona");
  const { data: divisions = [] } = useDivisions();
  const { data: seasons = [] } = useSeasons();

  const query = useQuery({
    queryKey: ["bracket", division, season],
    queryFn: async () => (await matchesApi.bracket(division, season)).data,
  });

  const rounds = Object.keys(query.data ?? {})
    .map(Number)
    .sort((a, b) => a - b);
  const max = rounds.length ? rounds[rounds.length - 1] : 0;

  return (
    <div className="space-y-4">
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

      {query.isLoading ? (
        <SkeletonCards count={4} />
      ) : query.isError ? (
        <ErrorView onRetry={() => query.refetch()} />
      ) : !rounds.length ? (
        <EmptyState
          icon={<Trophy size={44} />}
          title="Žádné play-off zápasy"
          description="Zápasy s nastaveným číslem kola se zobrazí zde."
        />
      ) : (
        <div className="no-scrollbar overflow-x-auto pb-4">
          <div className="flex gap-4">
            {rounds.map((r) => (
              <div key={r} className="w-64 shrink-0 space-y-3">
                <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-go">
                  {roundLabel(r, max)}
                </h3>
                {(query.data?.[String(r)] ?? []).map((m) => (
                  <BracketCard key={m.id} match={m} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BracketCard({ match }: { match: Match }) {
  const done = match.status === "DONE";
  const homeWin = done && match.homeScore > match.awayScore;
  const awayWin = done && match.awayScore > match.homeScore;

  return (
    <Link href={`/zapasy/${match.id}`}>
      <Card className="relative overflow-hidden transition-colors hover:border-bd-strong">
        {match.status === "LIVE" ? (
          <span className="absolute right-2 top-2">
            <LiveBadge />
          </span>
        ) : null}
        <TeamLine
          name={match.homeTeam?.abbr}
          color={match.homeTeam?.color}
          score={done || match.status === "LIVE" ? match.homeScore : null}
          winner={homeWin}
        />
        <div className="h-px bg-bd" />
        <TeamLine
          name={match.awayTeam?.abbr}
          color={match.awayTeam?.color}
          score={done || match.status === "LIVE" ? match.awayScore : null}
          winner={awayWin}
        />
        <div className="border-t border-bd px-3 py-2 text-[11px] text-di">
          {fmtMatch(match.date)}
        </div>
      </Card>
    </Link>
  );
}

function TeamLine({
  name,
  color,
  score,
  winner,
}: {
  name?: string | null;
  color?: string | null;
  score: number | null;
  winner: boolean;
}) {
  return (
    <div
      className={clsx(
        "flex items-center gap-2 px-3 py-2.5",
        winner && "bg-go/10",
      )}
    >
      <TeamDot color={color} />
      <span
        className={clsx(
          "min-w-0 flex-1 truncate text-[14px]",
          winner ? "font-bold text-wh" : "text-mu",
        )}
      >
        {name}
      </span>
      <span
        className={clsx("tabular text-[14px] font-bold", winner ? "text-go" : "text-mu")}
      >
        {score ?? "—"}
      </span>
    </div>
  );
}
