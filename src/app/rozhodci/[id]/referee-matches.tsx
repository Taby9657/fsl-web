"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { refereesApi } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import type { Match } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { Card, EmptyState, LinkButton } from "@/components/ui/primitives";
import { Tabs, StarRow } from "@/components/ui/data";
import { MatchRowCompact } from "@/components/match-card";

export function RefereeMatches({
  refereeId,
  future,
}: {
  refereeId: string;
  future: Match[];
}) {
  const [tab, setTab] = useState<"nasazeni" | "historie" | "hodnoceni">("nasazeni");
  const user = useAuthStore((s) => s.user);
  const isSelf = user?.referee?.id === refereeId;

  // detail s historií a hodnoceními je dostupný jen přihlášeným
  const detail = useQuery({
    queryKey: ["referee", refereeId],
    enabled: !!user,
    queryFn: async () => (await refereesApi.get(refereeId)).data,
  });

  const history = (detail.data?.matches ?? []).filter((m) => m.status === "DONE");
  const ratings = detail.data?.ratings ?? [];

  return (
    <div className="space-y-4">
      {isSelf ? (
        <div className="flex justify-end">
          <LinkButton href="/rozhodci/profil" variant="outline" size="sm">
            Můj profil rozhodčího
          </LinkButton>
        </div>
      ) : null}

      <Tabs
        tabs={[
          { id: "nasazeni", label: "Nadcházející", count: future.length },
          { id: "historie", label: "Historie" },
          { id: "hodnoceni", label: "Hodnocení" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "nasazeni" ? (
        future.length === 0 ? (
          <EmptyState title="Žádné nadcházející zápasy" />
        ) : (
          <Card className="overflow-hidden">
            {future.map((m) => (
              <div key={m.id}>
                <MatchRowCompact match={m} />
                {isSelf && (m.status === "UPCOMING" || m.status === "LIVE") ? (
                  <div className="border-b border-bd px-4 pb-3">
                    <LinkButton href={`/zapasy/${m.id}/skore`} size="sm">
                      {m.status === "LIVE" ? "Pokračovat ve scoringu" : "Zahájit live scoring"}
                    </LinkButton>
                  </div>
                ) : null}
              </div>
            ))}
          </Card>
        )
      ) : tab === "historie" ? (
        !user ? (
          <EmptyState
            title="Historie je jen pro přihlášené"
            description="Přihlas se pro zobrazení odehraných zápasů rozhodčího."
            action={
              <LinkButton href="/prihlaseni" size="sm">
                Přihlásit se
              </LinkButton>
            }
          />
        ) : history.length === 0 ? (
          <EmptyState title="Žádné odehrané zápasy" />
        ) : (
          <Card className="overflow-hidden">
            {history.map((m) => (
              <MatchRowCompact key={m.id} match={m} />
            ))}
          </Card>
        )
      ) : !user ? (
        <EmptyState
          title="Hodnocení je jen pro přihlášené"
          action={
            <LinkButton href="/prihlaseni" size="sm">
              Přihlásit se
            </LinkButton>
          }
        />
      ) : ratings.length === 0 ? (
        <EmptyState title="Zatím žádná hodnocení" />
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-bd">
            {ratings.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3">
                <StarRow value={r.rating} />
                <span className="text-[12px] text-mu">{fmtDateTime(r.createdAt)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
