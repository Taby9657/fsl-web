"use client";

import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { statsApi } from "@/lib/api";
import { useDivisions, useSeasons } from "@/hooks/use-league";
import { useQueryState } from "@/hooks/use-query-state";
import { Card, Chip, ChipRow, EmptyState } from "@/components/ui/primitives";
import { ErrorView, SkeletonList } from "@/components/ui/feedback";
import { TeamDot } from "@/components/ui/data";

const FORM_COLOR: Record<string, string> = {
  W: "#22C55E",
  L: "#EF4444",
};

export function TableClient() {
  const { data: divisions = [] } = useDivisions();
  const { data: seasons = [] } = useSeasons();
  const [division, setDivision] = useQueryState("divize");
  const [season, setSeason] = useQueryState("sezona");

  // výchozí divize = první v seznamu (stejně jako v aplikaci)
  useEffect(() => {
    if (!division && divisions.length) setDivision(divisions[0]);
  }, [divisions, division, setDivision]);

  const query = useQuery({
    queryKey: ["table", division, season],
    queryFn: async () => (await statsApi.table(division, season)).data,
  });

  return (
    <div className="space-y-4">
      {divisions.length > 1 ? (
        <ChipRow>
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
        <SkeletonList rows={10} />
      ) : query.isError ? (
        <ErrorView message="Nepodařilo se načíst tabulku" onRetry={() => query.refetch()} />
      ) : !query.data?.length ? (
        <EmptyState
          icon={<Trophy size={40} />}
          title="Tabulka zatím prázdná"
          description="Zobrazí se po odehrání prvních zápasů."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="min-w-full overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-bd text-[11px] uppercase tracking-wide text-di">
                  <th className="w-10 px-4 py-3 font-semibold">#</th>
                  <th className="px-2 py-3 font-semibold">Tým</th>
                  <th className="w-12 px-2 py-3 text-center font-semibold">Z</th>
                  <th className="w-12 px-2 py-3 text-center font-semibold">V</th>
                  <th className="w-12 px-2 py-3 text-center font-semibold">R</th>
                  <th className="w-12 px-2 py-3 text-center font-semibold">P</th>
                  <th className="w-20 px-2 py-3 text-center font-semibold">Skóre</th>
                  <th className="w-12 px-2 py-3 text-center font-semibold text-go">B</th>
                  <th className="w-24 px-4 py-3 text-center font-semibold">Forma</th>
                </tr>
              </thead>
              <tbody>
                {query.data.map((row, i) => (
                  <tr
                    key={row.teamId}
                    className="border-b border-bd transition-colors last:border-0 hover:bg-c2/50"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={
                          i < 3
                            ? "text-[14px] font-bold text-go"
                            : "text-[14px] text-mu"
                        }
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <Link
                        href={`/tymy/${row.teamId}`}
                        className="flex items-center gap-2.5 hover:underline"
                      >
                        <TeamDot color={row.team?.color} />
                        <span className="truncate text-[14px] font-medium text-wh">
                          {row.team?.name}
                        </span>
                      </Link>
                    </td>
                    <td className="tabular px-2 py-3 text-center text-[14px] text-mu">{row.p}</td>
                    <td className="tabular px-2 py-3 text-center text-[14px] text-mu">{row.w}</td>
                    <td className="tabular px-2 py-3 text-center text-[14px] text-mu">{row.d}</td>
                    <td className="tabular px-2 py-3 text-center text-[14px] text-mu">{row.l}</td>
                    <td className="tabular px-2 py-3 text-center text-[14px] text-mu">
                      {row.gf}:{row.ga}
                    </td>
                    <td className="tabular px-2 py-3 text-center text-[15px] font-bold text-go">
                      {row.pts}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center justify-center gap-1">
                        {(row.form ?? []).map((f, j) => (
                          <span
                            key={j}
                            title={f === "W" ? "Výhra" : f === "L" ? "Prohra" : "Remíza"}
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: FORM_COLOR[f] ?? "#F59E0B" }}
                          />
                        ))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="text-[12px] text-di">
        Z — zápasy · V — výhry · R — remízy · P — prohry · B — body. Forma zobrazuje
        posledních 5 zápasů (zelená výhra, žlutá remíza, červená prohra).
      </p>
    </div>
  );
}
