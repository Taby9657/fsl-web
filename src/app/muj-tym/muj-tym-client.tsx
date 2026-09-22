"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { AlertTriangle } from "lucide-react";
import { chatApi, errMsg, matchesApi, ucastApi } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import type { Match } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { Page } from "@/components/layout/container";
import { Button, Card, EmptyState, PageTitle, SectionTitle } from "@/components/ui/primitives";
import { SkeletonCards } from "@/components/ui/feedback";
import { AvatarChat, Vlakno } from "@/components/chat";
import { toast } from "@/components/ui/toast";

/**
 * Můj tým — jedna obrazovka, jedna otázka: **jedeš ve čtvrtek?**
 *
 * Tlačítko Hraju / Nemůžu je schválně největší prvek na stránce; chat je
 * pod ním. Zprávy se zatím načítají pollingem, SSE přijde později.
 */
export function MujTymClient() {
  const user = useAuthStore((s) => s.user);
  const teamId = user?.player?.teamId ?? null;
  const mujId = user?.player?.id ?? null;
  const qc = useQueryClient();

  const zapasy = useQuery({
    queryKey: ["mujtym", "zapasy", teamId],
    enabled: !!teamId,
    queryFn: async () =>
      (await matchesApi.list({ teamId, status: "UPCOMING", limit: 5 })).data,
  });

  const zapas: Match | undefined = zapasy.data?.[0];

  const ucast = useQuery({
    queryKey: ["mujtym", "ucast", zapas?.id],
    enabled: !!zapas?.id,
    refetchInterval: 30_000,
    queryFn: async () => (await ucastApi.signups(zapas!.id)).data,
  });

  const prihlasit = useMutation({
    mutationFn: async (playing: boolean) => (await ucastApi.signup(zapas!.id, playing)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mujtym", "ucast", zapas?.id] }),
    onError: (e) => toast.error(errMsg(e, "Přihlášení se nepovedlo.")),
  });

  if (!teamId) {
    return (
      <Page>
        <PageTitle title="Můj tým" />
        <EmptyState
          title="Zatím nejsi v týmu"
          description="Jakmile tě liga zařadí do týmu, najdeš tady sestavu na nejbližší zápas i chat s ostatními."
        />
      </Page>
    );
  }

  const muj = ucast.data?.seznam.find((p) => p.id === mujId);

  // Losovat smí vedoucí toho týmu, nebo liga. U otevřeného týmu vedoucí
  // není, takže tlačítko vidí jen supervisor — backend to kontroluje znovu.
  const smiLosovat = Boolean(
    user?.isSupervisor || user?.manager?.some((m) => m.teamId === teamId),
  );

  return (
    <Page>
      <PageTitle title="Můj tým" />

      {zapasy.isLoading ? (
        <SkeletonCards count={1} />
      ) : !zapas ? (
        <EmptyState
          title="Žádný zápas v plánu"
          description="Rozpis se zveřejní po losu. Do té doby tu bude prázdno."
        />
      ) : (
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="text-lg font-semibold">
              {zapas.homeTeam?.name} – {zapas.awayTeam?.name}
            </div>
            <div className="text-sm text-mu">
              {fmtDateTime(zapas.date)}
              {zapas.venue ? ` · ${zapas.venue}` : ""}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-3xl font-bold tabular-nums">
              {ucast.data ? ucast.data.stav : "–"}
            </span>
            {ucast.data?.chybiBrankar && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-go-soft px-2.5 py-1 text-sm font-medium text-go">
                <AlertTriangle size={15} /> chybí brankář
              </span>
            )}
            {ucast.data?.uzavreno && (
              <span className="rounded-lg bg-c2 px-2.5 py-1 text-sm text-mu">
                sestava uzavřená
              </span>
            )}
          </div>

          <div className="mt-4 flex gap-3">
            <Button
              size="lg" className="flex-1"
              disabled={ucast.data?.uzavreno || prihlasit.isPending}
              variant={muj?.stav === "HRAJU" ? "gold" : "subtle"}
              onClick={() => prihlasit.mutate(true)}
            >
              Hraju
            </Button>
            <Button
              size="lg" className="flex-1"
              disabled={ucast.data?.uzavreno || prihlasit.isPending}
              variant={muj?.stav === "NEMUZU" ? "subtle" : "ghost"}
              onClick={() => prihlasit.mutate(false)}
            >
              nemůžu
            </Button>
          </div>

          {ucast.data && !ucast.data.uzavreno && (
            <p className="mt-3 text-xs text-mu">
              Sestava se zavírá {fmtDateTime(ucast.data.uzaverka)} — 48 hodin před zápasem.
            </p>
          )}

          {ucast.data && ucast.data.seznam.length > 0 && (
            <div className="mt-5">
              <SectionTitle>Kdo jede</SectionTitle>
              <ul className="mt-2 divide-y divide-bd">
                {ucast.data.seznam.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-2">
                    <AvatarChat autor={p} size={32} />
                    <span className="flex-1 text-sm">{p.jmeno}</span>
                    {p.slot === "GOALKEEPER" && (
                      <span className="text-xs text-mu">brankář</span>
                    )}
                    <span
                      className={clsx(
                        "text-xs font-medium",
                        p.stav === "HRAJU" && "text-green",
                        p.stav === "NEMUZU" && "text-mu",
                        p.stav === "MLCI" && "text-go",
                      )}
                    >
                      {p.stav === "HRAJU" ? "hraje" : p.stav === "NEMUZU" ? "nemůže" : "mlčí"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Zapisovatel matchId={zapas.id} teamId={teamId} smiLosovat={smiLosovat} />
        </Card>
      )}

      <TymovyChat teamId={teamId} mujId={mujId} />
    </Page>
  );
}

function TymovyChat({ teamId, mujId }: { teamId: string; mujId: string | null }) {
  const konverzace = useQuery({
    queryKey: ["mujtym", "chat", teamId],
    queryFn: async () => (await chatApi.team(teamId)).data,
  });

  return (
    <Card className="mt-6 flex flex-col p-0">
      <div className="border-b border-bd px-5 py-3">
        <SectionTitle className="!mb-0">Týmový chat</SectionTitle>
      </div>
      {konverzace.data ? (
        <Vlakno
          conversationId={konverzace.data.id}
          mujId={mujId}
          prazdne="Zatím tu nikdo nic nenapsal. Začni třeba tím, kdo veze míčky."
        />
      ) : (
        <p className="px-5 py-4 text-sm text-mu">Načítám…</p>
      )}
    </Card>
  );
}

/**
 * Zapisovatel — kdo píše zápis a jak se k tomu došlo.
 *
 * Historie losů je vidět schválně. Vedoucí může losovat znovu (někdo
 * nedorazí, někdo zapisoval minule), ale **každý pokus zůstane napsaný** —
 * jinak by se z losu stal výběr.
 */
function Zapisovatel({
  matchId,
  teamId,
  smiLosovat,
}: {
  matchId: string;
  teamId: string;
  smiLosovat: boolean;
}) {
  const qc = useQueryClient();

  const data = useQuery({
    queryKey: ["mujtym", "zapisovatel", matchId, teamId],
    queryFn: async () => (await ucastApi.zapisovatel(matchId, teamId)).data,
  });

  const los = useMutation({
    mutationFn: async () => (await ucastApi.losuj(matchId, { teamId })).data,
    onSuccess: (d) => {
      toast.success(`Zapisuje ${d.zapisuje.jmeno}`);
      qc.invalidateQueries({ queryKey: ["mujtym", "zapisovatel", matchId, teamId] });
      qc.invalidateQueries({ queryKey: ["mujtym", "chat", teamId] });
    },
    onError: (e) => toast.error(errMsg(e, "Losování se nepovedlo.")),
  });

  const zapisuje = data.data?.zapisuje ?? null;
  const pokusu = data.data?.historie.length ?? 0;

  return (
    <div className="mt-5 border-t border-bd pt-4">
      <SectionTitle>Zapisovatel</SectionTitle>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        {zapisuje ? (
          <>
            <AvatarChat autor={zapisuje} size={32} />
            <span className="flex-1 text-sm">{zapisuje.jmeno}</span>
          </>
        ) : (
          <span className="flex-1 text-sm text-mu">
            {data.isLoading ? "Načítám…" : "Zatím není určený."}
          </span>
        )}

        {smiLosovat && (
          <Button
            size="sm"
            variant={zapisuje ? "ghost" : "purple"}
            loading={los.isPending}
            onClick={() => los.mutate()}
          >
            {zapisuje ? "Losovat znovu" : "Vylosovat"}
          </Button>
        )}
      </div>

      {pokusu > 1 && (
        <p className="mt-2 text-xs text-mu">
          Los č. {pokusu}. Předtím vyšel{" "}
          {data.data?.historie[pokusu - 2]?.hrac?.jmeno ?? "někdo jiný"}
          {data.data?.historie[pokusu - 2]?.replaceReason
            ? ` — ${data.data.historie[pokusu - 2].replaceReason}`
            : ""}
          .
        </p>
      )}
    </div>
  );
}
