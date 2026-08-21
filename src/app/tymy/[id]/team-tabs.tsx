"use client";

import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";
import { fmtDate, fullName, positionLabel } from "@/lib/format";
import type { Match, Team } from "@/lib/types";
import { Card, Chip, ChipRow, EmptyState } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/data";

export function TeamTabs({ team, matches }: { team: Team; matches: Match[] }) {
  const [tab, setTab] = useState<"soupiska" | "zapasy">("soupiska");
  const [filter, setFilter] = useState<"ALL" | "UPCOMING" | "DONE">("ALL");

  const filtered = matches.filter((m) => filter === "ALL" || m.status === filter);

  return (
    <div className="space-y-4">
      <Tabs
        tabs={[
          { id: "soupiska", label: "Soupiska", count: team.players?.length ?? 0 },
          { id: "zapasy", label: "Zápasy", count: matches.length },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "soupiska" ? (
        !team.players?.length ? (
          <EmptyState title="Žádní hráči" description="Soupiska zatím nebyla vyplněna." />
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-y divide-bd">
              {team.players.map((p) => (
                <Link
                  key={p.id}
                  href={`/hraci/${p.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-c2/60"
                >
                  <span className="tabular flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-c2 text-[13px] font-bold text-go">
                    {p.jersey ?? "–"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-wh">
                      {fullName(p)}
                    </span>
                    <span className="block text-[12px] text-mu">
                      {positionLabel(p.position)}
                    </span>
                  </span>
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    title={p.licensed ? "Licencován" : "Bez licence"}
                    style={{ backgroundColor: p.licensed ? "#22C55E" : "#F59E0B" }}
                  />
                </Link>
              ))}
            </div>
          </Card>
        )
      ) : (
        <>
          <ChipRow>
            <Chip active={filter === "ALL"} onClick={() => setFilter("ALL")}>
              Vše
            </Chip>
            <Chip active={filter === "UPCOMING"} onClick={() => setFilter("UPCOMING")}>
              Nadcházející
            </Chip>
            <Chip active={filter === "DONE"} onClick={() => setFilter("DONE")}>
              Odehrané
            </Chip>
          </ChipRow>

          {!filtered.length ? (
            <EmptyState title="Žádné zápasy" />
          ) : (
            <Card className="overflow-hidden">
              <div className="divide-y divide-bd">
                {filtered.map((m) => {
                  const home = m.homeTeamId === team.id;
                  const opp = home ? m.awayTeam : m.homeTeam;
                  const my = home ? m.homeScore : m.awayScore;
                  const their = home ? m.awayScore : m.homeScore;
                  const result =
                    m.status !== "DONE" ? null : my > their ? "V" : my < their ? "P" : "R";
                  const resultColor =
                    result === "V" ? "#22C55E" : result === "P" ? "#EF4444" : "#9B8BC8";
                  return (
                    <Link
                      key={m.id}
                      href={`/zapasy/${m.id}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-c2/60"
                    >
                      <span className="shrink-0 text-[15px]" title={home ? "Doma" : "Venku"}>
                        {home ? "🏠" : "✈️"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-wh">
                          {opp?.name}
                        </span>
                        <span className="block text-[12px] text-mu">{fmtDate(m.date)}</span>
                      </span>
                      {m.status === "DONE" ? (
                        <>
                          <span className="tabular text-[14px] font-bold text-go">
                            {my}:{their}
                          </span>
                          <span
                            className={clsx(
                              "flex h-6 w-6 items-center justify-center rounded text-[11px] font-bold",
                            )}
                            style={{
                              color: resultColor,
                              backgroundColor: `${resultColor}22`,
                              border: `1px solid ${resultColor}55`,
                            }}
                          >
                            {result}
                          </span>
                        </>
                      ) : (
                        <span className="text-[12px] text-mu">
                          {m.status === "LIVE" ? "Právě hraje" : "Nadcházející"}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
