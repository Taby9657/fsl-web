"use client";

/**
 * Balíčky zápasů, přehled přihlášených zápasů a doporučovací kód.
 *
 * Zápasy si platí hráč, ne tým: koupí si balíček startů a odehraný zápas
 * z něj jeden odečte. Sekce je samostatná, aby se dala vložit na stránku
 * Plateb, aniž by se sahalo do zbytku.
 */

import { useQuery } from "@tanstack/react-query";
import { Check, Copy, Gift, LogOut, Ticket } from "lucide-react";
import { useState } from "react";
import { errMsg, matchesApi, paymentsApi, playersApi } from "@/lib/api";
import { czk, fmtDateTime } from "@/lib/format";
import type { UpcomingEntry } from "@/lib/types";
import { Button, Card, SectionTitle } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/feedback";
import { TeamBadge } from "@/components/ui/data";
import { toast } from "@/components/ui/toast";

/** Skloňování „zápas / zápasy / zápasů" — v ceníku i v zůstatku. */
function zapasu(n: number) {
  if (n === 1) return "zápas";
  if (n >= 2 && n <= 4) return "zápasy";
  return "zápasů";
}

export function PacksSection() {
  const [buying, setBuying] = useState<number | null>(null);
  const [leaving, setLeaving] = useState<UpcomingEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [showReferral, setShowReferral] = useState(false);

  const packs = useQuery({
    queryKey: ["payments", "packs"],
    queryFn: async () => (await paymentsApi.packs()).data,
  });

  const referral = useQuery({
    queryKey: ["players", "referral"],
    enabled: showReferral,
    queryFn: async () => (await playersApi.referral()).data,
  });

  async function buy(size: number) {
    setBuying(size);
    try {
      const res = await paymentsApi.buyPack(size);
      if (res.data?.url) window.location.assign(res.data.url);
      else toast.error("Chyba platby", "Server nevrátil platební odkaz.");
    } catch (e) {
      toast.error("Chyba platby", errMsg(e));
    } finally {
      setBuying(null);
    }
  }

  async function withdraw() {
    if (!leaving) return;
    setBusy(true);
    try {
      const res = await matchesApi.withdraw(leaving.matchId);
      await packs.refetch();
      toast.success(
        res.data.refunded ? "Odhlášeno" : "Odhlášeno — zápas propadá",
        res.data.refunded
          ? `Start se ti vrátil do balíčku. Zbývá ${res.data.remaining} ${zapasu(res.data.remaining)}.`
          : (res.data.note ?? "Odhlášení po uzávěrce start nevrací."),
      );
      setLeaving(null);
    } catch (e) {
      toast.error("Nepodařilo se odhlásit", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const zbyva = packs.data?.remaining ?? 0;
  const lhuta = packs.data?.withdrawalHours ?? 12;
  // Doporučovací kód se odemyká po prvním odehraném zápase (kontumace se
  // nepočítá). Než ho server pošle, blok se neukazuje — na starším backendu
  // by `canRefer` chybělo a sekce by svítila každému hned po registraci.
  const canRefer = packs.data?.canRefer === true;

  return (
    <>
      <SectionTitle className="mt-8">Balíčky zápasů</SectionTitle>

      <Card className="mb-4 flex items-center gap-4 p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-go/15 text-go">
          <Ticket size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[22px] font-bold text-wh">
            {zbyva} {zapasu(zbyva)}
          </p>
          <p className="text-[12px] text-mu">
            zbývá v balíčku · odehraný zápas odečte jeden
          </p>
        </div>
      </Card>

      {/* Ceník. Větší balíček = levnější zápas, proto je cena za zápas vidět. */}
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {(packs.data?.catalog ?? []).map((b) => (
          <button
            key={b.size}
            onClick={() => buy(b.size)}
            disabled={buying !== null}
            className="cursor-pointer rounded-xl border border-bd bg-c1 p-4 text-left transition-colors hover:border-go hover:bg-c2/60 disabled:opacity-50"
          >
            <span className="block text-[11px] font-bold tracking-wider text-mu uppercase">
              {b.size} {zapasu(b.size)}
            </span>
            <span className="tabular mt-1 block text-[19px] font-bold text-wh">{czk(b.price)}</span>
            <span className="tabular block text-[12px] text-mu">
              {Math.round(b.price / b.size)} Kč / zápas
            </span>
          </button>
        ))}
      </div>

      {/* Na co jsem přihlášený a kde se ještě dá odhlásit bez ztráty. */}
      {packs.data?.upcoming?.length ? (
        <>
          <SectionTitle>Přihlášené zápasy</SectionTitle>
          <Card className="mb-6 overflow-hidden">
            <div className="divide-y divide-bd">
              {packs.data.upcoming.map((e) => {
                const soupeř =
                  e.teamId === e.match.homeTeam.id ? e.match.awayTeam : e.match.homeTeam;
                return (
                  <div key={e.matchId} className="flex items-center gap-3 px-4 py-3">
                    <TeamBadge abbr={soupeř?.abbr} color={soupeř?.color} size={34} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-wh">{soupeř?.name}</p>
                      <p className="text-[12px] text-mu">
                        {fmtDateTime(e.match.date)}
                        {e.locked ? (
                          <span className="ml-2 text-amber">· po uzávěrce</span>
                        ) : (
                          <span className="ml-2 text-mu">
                            · odhlásit lze ještě {Math.max(0, Math.round(e.hoursLeft - lhuta))} h
                          </span>
                        )}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setLeaving(e)}>
                      <LogOut size={14} /> Odhlásit
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      ) : null}

      {/* Doporučovací kód. Odemyká se až po prvním odehraném zápase — dřív
          není co doporučovat a odměnu (zápas zdarma) by čerpal někdo, kdo
          sám nehraje. Samotný kód se načte až po rozkliknutí, protože ho
          server při prvním zobrazení teprve vytváří. */}
      {!canRefer ? null : (
      <>
      <SectionTitle>Přiveď hráče, máš zápas zdarma</SectionTitle>
      <Card className="p-5">
        {!showReferral ? (
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pu/15 text-pu">
              <Gift size={22} />
            </span>
            <p className="min-w-0 flex-1 text-[14px] text-mu">
              Když s tvým kódem přijde do ligy nový hráč a koupí si balíček od tří
              zápasů výš, dostaneš <strong className="text-wh">jeden zápas zdarma</strong>.
              Může jít do jakéhokoli týmu a{" "}
              <strong className="text-wh">kolik lidí přivedeš, omezené není</strong>.
            </p>
            <Button size="sm" onClick={() => setShowReferral(true)}>
              Zobrazit kód
            </Button>
          </div>
        ) : referral.isLoading ? (
          <p className="text-[14px] text-mu">Načítám…</p>
        ) : referral.data ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <code className="tabular flex-1 rounded-lg bg-c2 px-4 py-3 text-[17px] font-bold tracking-wider text-go">
                {referral.data.code}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard?.writeText(referral.data!.code);
                  toast.success("Zkopírováno", "Kód je ve schránce.");
                }}
              >
                <Copy size={14} /> Kopírovat
              </Button>
            </div>
            <p className="text-[13px] text-mu">{referral.data.rule}</p>
            {referral.data.uses.length ? (
              <div className="divide-y divide-bd border-t border-bd pt-1">
                {referral.data.uses.map((u) => (
                  <div key={u.player.id} className="flex items-center gap-2 py-2 text-[14px]">
                    <span className="flex-1 text-wh">
                      {u.player.firstName} {u.player.lastName}
                    </span>
                    {u.rewarded ? (
                      <span className="flex items-center gap-1 text-[12px] text-green">
                        <Check size={13} /> zápas připsán
                      </span>
                    ) : (
                      <span className="text-[12px] text-mu">čeká na jeho balíček</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-mu">Zatím s ním nikdo nepřišel.</p>
            )}
          </div>
        ) : null}
      </Card>
      </>
      )}

      <ConfirmDialog
        open={!!leaving}
        title="Odhlásit se ze zápasu"
        message={
          leaving?.locked
            ? `Do výkopu zbývá míň než ${lhuta} h, takže ti tenhle zápas z balíčku propadne. `
              + "Když se na něj vrátíš, nic dalšího se ti nestrhne."
            : "Start se ti vrátí zpátky do balíčku."
        }
        confirmLabel="Odhlásit se"
        destructive={!!leaving?.locked}
        loading={busy}
        onConfirm={withdraw}
        onCancel={() => setLeaving(null)}
      />
    </>
  );
}
