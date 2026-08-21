"use client";

import { useQuery } from "@tanstack/react-query";
import { Frown, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { searchApi } from "@/lib/api";
import { fullName, positionShort, REFEREE_LEVEL_LABEL } from "@/lib/format";
import { useQueryState } from "@/hooks/use-query-state";
import { Card, EmptyState, SectionTitle } from "@/components/ui/primitives";
import { Avatar, SearchInput, TeamBadge, TeamDot } from "@/components/ui/data";

export function SearchClient() {
  const [urlQ, setUrlQ] = useQueryState("q", "");
  const [q, setQ] = useState(urlQ ?? "");
  const [debounced, setDebounced] = useState(urlQ ?? "");

  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = q.trim();
      setDebounced(trimmed);
      setUrlQ(trimmed || undefined);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const query = useQuery({
    queryKey: ["search", debounced],
    enabled: debounced.length >= 2,
    queryFn: async () => (await searchApi.search(debounced)).data,
  });

  const total =
    (query.data?.players?.length ?? 0) +
    (query.data?.teams?.length ?? 0) +
    (query.data?.referees?.length ?? 0);

  return (
    <div className="space-y-6">
      <SearchInput
        value={q}
        onChange={setQ}
        autoFocus
        placeholder="Hledat hráče, týmy, rozhodčí…"
      />

      {debounced.length === 0 ? (
        <EmptyState
          icon={<Search size={40} />}
          title="Zadej jméno hráče, název týmu nebo rozhodčího"
        />
      ) : debounced.length < 2 ? (
        <EmptyState title="Zadej alespoň 2 znaky" />
      ) : query.isLoading ? (
        <p className="text-center text-[14px] text-mu">Hledám…</p>
      ) : total === 0 ? (
        <EmptyState icon={<Frown size={40} />} title={`Nic nenalezeno pro „${debounced}"`} />
      ) : (
        <div className="space-y-8">
          {query.data?.teams?.length ? (
            <section>
              <SectionTitle>Týmy</SectionTitle>
              <Card className="overflow-hidden">
                <div className="divide-y divide-bd">
                  {query.data.teams.map((t) => (
                    <Link
                      key={t.id}
                      href={`/tymy/${t.id}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-c2/60"
                    >
                      <TeamBadge abbr={t.abbr} color={t.color} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-wh">
                          {t.name}
                        </span>
                        <span className="block text-[12px] text-mu">{t.division}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </Card>
            </section>
          ) : null}

          {query.data?.players?.length ? (
            <section>
              <SectionTitle>Hráči</SectionTitle>
              <Card className="overflow-hidden">
                <div className="divide-y divide-bd">
                  {query.data.players.map((p) => (
                    <Link
                      key={p.id}
                      href={`/hraci/${p.id}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-c2/60"
                    >
                      <Avatar
                        photoUrl={p.photoUrl}
                        firstName={p.firstName}
                        lastName={p.lastName}
                        jersey={p.jersey}
                        size={36}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-wh">
                          {fullName(p)}
                        </span>
                        <span className="flex items-center gap-1.5 text-[12px] text-mu">
                          <TeamDot color={p.team?.color} size={6} />
                          {p.team?.name ?? "Bez týmu"} · {positionShort(p.position)}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </Card>
            </section>
          ) : null}

          {query.data?.referees?.length ? (
            <section>
              <SectionTitle>Rozhodčí</SectionTitle>
              <Card className="overflow-hidden">
                <div className="divide-y divide-bd">
                  {query.data.referees.map((r) => (
                    <Link
                      key={r.id}
                      href={`/rozhodci/${r.id}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-c2/60"
                    >
                      <Avatar
                        photoUrl={r.photoUrl}
                        firstName={r.firstName}
                        lastName={r.lastName}
                        size={36}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-wh">
                          {fullName(r)}
                        </span>
                        <span className="block text-[12px] text-mu">
                          {REFEREE_LEVEL_LABEL[r.level] ?? `Úroveň ${r.level}`}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </Card>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
