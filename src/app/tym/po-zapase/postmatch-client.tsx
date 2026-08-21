"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { CheckCircle2, Target, Trophy } from "lucide-react";
import { useState } from "react";
import { errMsg, matchesApi } from "@/lib/api";
import { fmtDate, fullName, REFEREE_LEVEL_LABEL } from "@/lib/format";
import { useAuthStore } from "@/store/auth";
import { Page } from "@/components/layout/container";
import {
  Button,
  Card,
  EmptyState,
  PageTitle,
  SectionTitle,
  Textarea,
} from "@/components/ui/primitives";
import { SkeletonCards } from "@/components/ui/feedback";
import { StarPicker } from "@/components/ui/data";
import { toast } from "@/components/ui/toast";

export function PostmatchClient() {
  const user = useAuthStore((s) => s.user);
  const teamId = user?.manager?.[0]?.teamId;

  const [matchId, setMatchId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");
  const [mvpId, setMvpId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const matches = useQuery({
    queryKey: ["postmatch", "matches", teamId],
    enabled: !!teamId,
    queryFn: async () =>
      (await matchesApi.list({ teamId, status: "DONE", limit: 20 })).data,
  });

  const detail = useQuery({
    queryKey: ["match", matchId],
    enabled: !!matchId,
    queryFn: async () => (await matchesApi.get(matchId!)).data,
  });

  const submitted = detail.data?.postmatches?.find((p) => p.teamId === teamId)?.submitted;
  const opponentLineup =
    detail.data?.lineups?.find((l) => l.teamId !== teamId)?.players.map((lp) => lp.player) ?? [];
  const referee = detail.data?.referee;

  async function submit() {
    if (!matchId || !teamId) {
      toast.error("Chyba", "Vyber zápas.");
      return;
    }
    if (referee && rating === 0) {
      toast.error("Chybí hodnocení", "Ohodnoť rozhodčího (1–5 hvězdiček).");
      return;
    }
    setBusy(true);
    try {
      await matchesApi.postmatch(matchId, teamId, {
        opponentMvpId: mvpId || null,
        refRating: rating || null,
        refNote: note.trim() || null,
      });
      await matchesApi.submitPostmatch(matchId, teamId);
      await detail.refetch();
      toast.success("Hotovo", "Po-zápasový formulář byl odeslán.");
      setRating(0);
      setNote("");
      setMvpId(null);
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page size="narrow">
      <PageTitle
        title="Po-zápasový formulář"
        subtitle="Hodnocení rozhodčího a nejlepší hráč soupeře"
      />

      <SectionTitle>1. Vyber zápas</SectionTitle>
      {matches.isLoading ? (
        <SkeletonCards count={3} />
      ) : !matches.data?.length ? (
        <EmptyState icon={<Target size={44} />} title="Žádné odehrané zápasy k vyplnění" />
      ) : (
        <div className="space-y-2">
          {matches.data.map((m) => {
            const active = matchId === m.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setMatchId(m.id);
                  setRating(0);
                  setMvpId(null);
                  setNote("");
                }}
                className={clsx(
                  "flex w-full cursor-pointer items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                  active
                    ? "border-go bg-go/10"
                    : "border-bd bg-c1 hover:border-bd-strong hover:bg-c2/60",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-wh">
                    {m.homeTeam?.abbr} {m.homeScore}:{m.awayScore} {m.awayTeam?.abbr}
                  </span>
                  <span className="block text-[12px] text-mu">{fmtDate(m.date)}</span>
                </span>
                {active ? <CheckCircle2 size={20} className="shrink-0 text-go" /> : null}
              </button>
            );
          })}
        </div>
      )}

      {matchId && submitted ? (
        <Card className="mt-6 border-green/40 bg-green/10 p-6 text-center">
          <CheckCircle2 size={36} className="mx-auto text-green" />
          <p className="mt-3 text-[16px] font-bold text-green">Formulář byl odeslán</p>
          <p className="mt-1 text-[13px] text-mu">
            Po-zápasový formulář pro tento zápas už byl odevzdán.
          </p>
        </Card>
      ) : matchId ? (
        <>
          <SectionTitle className="mt-8">2. Hodnocení rozhodčího</SectionTitle>
          <Card className="p-5">
            {referee ? (
              <>
                <p className="text-[15px] font-medium text-wh">
                  {fullName(referee)}
                  <span className="ml-2 text-[13px] text-mu">
                    {REFEREE_LEVEL_LABEL[referee.level] ?? ""}
                  </span>
                </p>
                <div className="mt-4">
                  <StarPicker value={rating} onChange={setRating} size={28} />
                </div>
                {rating > 0 ? (
                  <p className="mt-2 text-[13px] font-semibold text-go">{rating}/5 hvězdiček</p>
                ) : null}
                <Textarea
                  className="mt-4 min-h-[80px]"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Volitelná poznámka k výkonu rozhodčího…"
                />
              </>
            ) : (
              <p className="text-[14px] text-mu">
                K tomuto zápasu není přiřazen rozhodčí.
              </p>
            )}
          </Card>

          <SectionTitle className="mt-8">
            3. Nejlepší hráč soupeře (volitelné)
          </SectionTitle>
          {opponentLineup.length === 0 ? (
            <Card className="p-5 text-[14px] text-mu">
              Soupiska soupeře k tomuto zápasu nebyla odeslána.
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="divide-y divide-bd">
                {opponentLineup.map((p) => {
                  const active = mvpId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setMvpId(active ? null : p.id)}
                      className={clsx(
                        "flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors",
                        active ? "bg-go/10" : "hover:bg-c2/60",
                      )}
                    >
                      <span className="tabular flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-c2 text-[13px] font-bold text-go">
                        {p.jersey}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[15px] text-wh">
                        {fullName(p)}
                      </span>
                      {active ? <Trophy size={18} className="shrink-0 text-go" /> : null}
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          <Button
            className="mt-6 w-full"
            onClick={submit}
            loading={busy}
            disabled={!!referee && rating === 0}
          >
            Odeslat formulář
          </Button>
        </>
      ) : null}
    </Page>
  );
}
