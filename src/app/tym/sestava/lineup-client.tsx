"use client";

import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import clsx from "clsx";
import { CalendarDays, CheckCircle2, Circle } from "lucide-react";
import { useState } from "react";
import { errMsg, matchesApi, teamsApi } from "@/lib/api";
import { fmtDateTime, fullName, isLicensed } from "@/lib/format";
import type { Player } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { Page } from "@/components/layout/container";
import {
  Button,
  Card,
  EmptyState,
  PageTitle,
  SectionTitle,
} from "@/components/ui/primitives";
import { ConfirmDialog, SkeletonCards } from "@/components/ui/feedback";
import { TeamBadge } from "@/components/ui/data";
import { toast } from "@/components/ui/toast";

const MIN_PLAYERS = 9;

export function LineupClient() {
  const user = useAuthStore((s) => s.user);
  const teamId = user?.manager?.[0]?.teamId;

  const [matchId, setMatchId] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [goalkeeper, setGoalkeeper] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [unlicensed, setUnlicensed] = useState<
    { id: string; firstName: string; lastName: string; jersey: number }[] | null
  >(null);

  const matches = useQuery({
    queryKey: ["lineup", "matches", teamId],
    enabled: !!teamId,
    queryFn: async () =>
      (await matchesApi.list({ teamId, status: "UPCOMING", limit: 20 })).data,
  });

  const team = useQuery({
    queryKey: ["team", teamId],
    enabled: !!teamId,
    queryFn: async () => (await teamsApi.get(teamId!)).data,
  });

  const players = team.data?.players ?? [];

  function toggle(p: Player) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(p.id)) {
        next.delete(p.id);
        if (goalkeeper === p.id) setGoalkeeper(null);
      } else {
        next.add(p.id);
      }
      return next;
    });
  }

  async function submit(force = false) {
    if (!matchId || picked.size === 0) {
      toast.error("Upozornění", "Vyber zápas a aspoň jednoho hráče.");
      return;
    }
    if (picked.size < MIN_PLAYERS) {
      toast.error(
        "Nedostatek hráčů",
        `Soupiska musí mít min. ${MIN_PLAYERS} hráčů (aktuálně ${picked.size}).`,
      );
      return;
    }
    if (!goalkeeper || !picked.has(goalkeeper)) {
      toast.error("Chybí brankář", "Označ jednoho hráče jako brankáře (GK).");
      return;
    }
    setBusy(true);
    try {
      await matchesApi.lineup(
        matchId,
        teamId!,
        [...picked].map((id) => ({ playerId: id, isGoalkeeper: id === goalkeeper })),
        force,
      );
      setUnlicensed(null);
      toast.success("Hotovo", "Soupiska byla odeslána.");
      setPicked(new Set());
      setGoalkeeper(null);
      setMatchId(null);
    } catch (e) {
      const ax = e as AxiosError<{
        code?: string;
        unlicensed?: { id: string; firstName: string; lastName: string; jersey: number }[];
      }>;
      if (ax.response?.status === 422 && ax.response.data?.code === "UNLICENSED_PLAYERS") {
        setUnlicensed(ax.response.data.unlicensed ?? []);
      } else {
        toast.error("Chyba", errMsg(e));
      }
    } finally {
      setBusy(false);
    }
  }

  const hasGk = !!goalkeeper && picked.has(goalkeeper);

  return (
    <Page size="narrow">
      <PageTitle
        title="Sestava před zápasem"
        subtitle={`Minimálně ${MIN_PLAYERS} hráčů a právě jeden brankář`}
      />

      <SectionTitle>1. Vyber zápas</SectionTitle>
      {matches.isLoading ? (
        <SkeletonCards count={3} />
      ) : !matches.data?.length ? (
        <EmptyState icon={<CalendarDays size={44} />} title="Žádné nadcházející zápasy" />
      ) : (
        <div className="space-y-2">
          {matches.data.map((m) => {
            const active = matchId === m.id;
            const home = m.homeTeamId === teamId;
            const opp = home ? m.awayTeam : m.homeTeam;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setMatchId(m.id);
                  setPicked(new Set());
                  setGoalkeeper(null);
                }}
                className={clsx(
                  "flex w-full cursor-pointer items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                  active
                    ? "border-go bg-go/10"
                    : "border-bd bg-c1 hover:border-bd-strong hover:bg-c2/60",
                )}
              >
                <TeamBadge abbr={opp?.abbr} color={opp?.color} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-wh">
                    {home ? "🏠" : "✈️"} {opp?.name}
                  </span>
                  <span className="block text-[12px] text-mu">
                    {fmtDateTime(m.date)}
                    {m.venue ? ` · ${m.venue}` : ""}
                  </span>
                </span>
                {active ? <CheckCircle2 size={20} className="shrink-0 text-go" /> : null}
              </button>
            );
          })}
        </div>
      )}

      {matchId ? (
        <>
          <SectionTitle className="mt-8">
            2. Vyber hráče — {picked.size} vybráno ·{" "}
            <span className={hasGk ? "text-green" : "text-red"}>
              {hasGk ? "GK ✓" : "GK chybí"}
            </span>
          </SectionTitle>

          <Card className="overflow-hidden">
            <div className="divide-y divide-bd">
              {players.map((p) => {
                const sel = picked.has(p.id);
                const gk = goalkeeper === p.id;
                const lic = isLicensed(p.payment?.licStatus) || p.licensed;
                return (
                  <div
                    key={p.id}
                    className={clsx(
                      "flex items-center gap-3 px-4 py-3 transition-colors",
                      sel && "bg-c2/60",
                      gk && "bg-pu/10",
                    )}
                  >
                    <button
                      onClick={() => toggle(p)}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                    >
                      <span
                        className={clsx(
                          "tabular flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-bold",
                          gk
                            ? "border-pu text-pu"
                            : lic
                              ? "border-go text-go"
                              : "border-red text-red",
                        )}
                      >
                        {p.jersey}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium text-wh">
                          {fullName(p)}
                        </span>
                        {!lic ? (
                          <span className="block text-[12px] text-red">⚠️ bez licence</span>
                        ) : null}
                      </span>
                    </button>

                    {sel ? (
                      <button
                        onClick={() => setGoalkeeper(gk ? null : p.id)}
                        className={clsx(
                          "shrink-0 cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors",
                          gk ? "bg-pu text-white" : "bg-c2 text-mu hover:text-wh",
                        )}
                      >
                        GK
                      </button>
                    ) : null}

                    <button onClick={() => toggle(p)} className="shrink-0 cursor-pointer">
                      {sel ? (
                        <CheckCircle2 size={20} className="text-go" />
                      ) : (
                        <Circle size={20} className="text-di" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>

          <Button
            className="mt-5 w-full"
            onClick={() => submit(false)}
            loading={busy}
            disabled={picked.size === 0}
          >
            Odeslat soupisku
          </Button>
        </>
      ) : null}

      <ConfirmDialog
        open={!!unlicensed}
        title="⚠️ Hráči bez licence"
        message={`Tito hráči nemají platnou licenci:\n\n${(unlicensed ?? [])
          .map((p) => `#${p.jersey} ${p.firstName} ${p.lastName}`)
          .join("\n")}\n\nOdeslat soupisku přesto?`}
        confirmLabel="Odeslat přesto"
        destructive
        loading={busy}
        onConfirm={() => submit(true)}
        onCancel={() => setUnlicensed(null)}
      />
    </Page>
  );
}
