"use client";

import { useQuery } from "@tanstack/react-query";
import { Banknote, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { errMsg, supervisorApi } from "@/lib/api";
import {
  czk,
  fmtDate,
  fullName,
  PAYMENT_STATUS_COLOR,
  PAYMENT_STATUS_LABEL,
} from "@/lib/format";
import type { PaymentStatus } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  Chip,
  ChipRow,
  EmptyState,
  PageTitle,
  Select,
} from "@/components/ui/primitives";
import { Modal, SkeletonList } from "@/components/ui/feedback";
import { SearchInput, StatBox, StatStrip } from "@/components/ui/data";
import { toast } from "@/components/ui/toast";

const STATUSES: PaymentStatus[] = ["PENDING", "PAID", "OVERDUE", "WAIVED"];

export function AdminPaymentsClient() {
  const [tab, setTab] = useState<"hraci" | "tymy" | "banka">("hraci");
  const [filter, setFilter] = useState<string>("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    matched: unknown[];
    skipped: { txId: string; reason: string; vs?: string }[];
    errors: unknown[];
  } | null>(null);

  const payments = useQuery({
    queryKey: ["supervisor", "payments"],
    queryFn: async () => (await supervisorApi.payments()).data,
  });

  const bank = useQuery({
    queryKey: ["supervisor", "bank-transactions"],
    enabled: tab === "banka",
    queryFn: async () => (await supervisorApi.bankTransactions({ limit: 100 })).data,
  });

  const players = useMemo(() => {
    let list = payments.data?.players ?? [];
    if (filter) list = list.filter((p) => p.licStatus === filter);
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((p) => fullName(p.player).toLowerCase().includes(s));
    return list;
  }, [payments.data?.players, filter, q]);

  const teams = useMemo(() => {
    let list = payments.data?.teams ?? [];
    if (filter) list = list.filter((t) => t.status === filter);
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((t) => (t.team?.name ?? "").toLowerCase().includes(s));
    return list;
  }, [payments.data?.teams, filter, q]);

  const unpaid = (payments.data?.players ?? []).filter((p) => p.licStatus !== "PAID").length;
  const paid = (payments.data?.players ?? []).filter((p) => p.licStatus === "PAID").length;
  const teamsPending = (payments.data?.teams ?? []).filter((t) => t.status !== "PAID").length;

  async function setPlayerStatus(playerId: string, field: "licStatus" | "superStatus", value: PaymentStatus) {
    setBusy(playerId + field);
    try {
      await supervisorApi.updatePayment(playerId, { [field]: value });
      await payments.refetch();
      toast.success("Uloženo");
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  async function setTeamStatus(teamId: string, value: PaymentStatus) {
    setBusy(teamId);
    try {
      await supervisorApi.updateTeamPayment(teamId, { status: value });
      await payments.refetch();
      toast.success("Uloženo");
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  async function bankSync() {
    setBusy("sync");
    try {
      const res = await supervisorApi.bankSync(30);
      setSyncResult(res.data);
      setSyncOpen(true);
      await payments.refetch();
      await bank.refetch();
    } catch (e) {
      toast.error("Chyba synchronizace", errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageTitle
        title="Platby"
        subtitle="Licence hráčů, registrace týmů a párování bankovních plateb"
        action={
          <Button size="sm" variant="subtle" loading={busy === "sync"} onClick={bankSync}>
            <RefreshCw size={15} /> Načíst platby z banky
          </Button>
        }
      />

      <StatStrip>
        <StatBox value={unpaid} label="Hráčů bez licence" color="#F59E0B" />
        <StatBox value={paid} label="Licencováno" color="#22C55E" />
        <StatBox value={teamsPending} label="Týmů čeká" color="#F59E0B" />
      </StatStrip>

      <div className="mt-5 space-y-2">
        <ChipRow>
          <Chip accent="purple" active={tab === "hraci"} onClick={() => setTab("hraci")}>
            Hráči
          </Chip>
          <Chip accent="purple" active={tab === "tymy"} onClick={() => setTab("tymy")}>
            Týmy
          </Chip>
          <Chip accent="purple" active={tab === "banka"} onClick={() => setTab("banka")}>
            Bankovní pohyby
          </Chip>
        </ChipRow>

        {tab !== "banka" ? (
          <>
            <ChipRow>
              <Chip active={!filter} onClick={() => setFilter("")}>
                Vše
              </Chip>
              {STATUSES.map((s) => (
                <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>
                  {PAYMENT_STATUS_LABEL[s]}
                </Chip>
              ))}
            </ChipRow>
            <SearchInput value={q} onChange={setQ} placeholder="Hledat…" />
          </>
        ) : null}
      </div>

      <div className="mt-5">
        {payments.isLoading && tab !== "banka" ? (
          <SkeletonList rows={8} />
        ) : tab === "hraci" ? (
          !players.length ? (
            <EmptyState title="Žádní hráči" />
          ) : (
            <Card className="overflow-hidden">
              <div className="divide-y divide-bd">
                {players.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-wh">
                        {fullName(p.player)}
                        {p.player?.team ? (
                          <span className="ml-2 text-[13px] font-normal text-mu">
                            {p.player.team.abbr}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-mu">
                        Licence {czk(p.licFee)}
                        {p.variableSymbol ? <span>· VS {p.variableSymbol}</span> : null}
                        {p.superVariableSymbol ? (
                          <span>· super VS {p.superVariableSymbol}</span>
                        ) : null}
                        {p.licPaidAt ? <span>· {fmtDate(p.licPaidAt)}</span> : null}
                      </p>
                    </div>
                    <Badge color={PAYMENT_STATUS_COLOR[p.licStatus]}>
                      {PAYMENT_STATUS_LABEL[p.licStatus]}
                    </Badge>
                    <Select
                      className="w-auto min-w-36 py-1.5 text-[13px]"
                      value={p.licStatus}
                      disabled={busy === (p.player?.id ?? "") + "licStatus"}
                      onChange={(e) =>
                        p.player?.id &&
                        setPlayerStatus(p.player.id, "licStatus", e.target.value as PaymentStatus)
                      }
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {PAYMENT_STATUS_LABEL[s]}
                        </option>
                      ))}
                    </Select>
                    {p.superStatus !== "WAIVED" ? (
                      <Select
                        className="w-auto min-w-40 py-1.5 text-[13px]"
                        value={p.superStatus}
                        disabled={busy === (p.player?.id ?? "") + "superStatus"}
                        onChange={(e) =>
                          p.player?.id &&
                          setPlayerStatus(
                            p.player.id,
                            "superStatus",
                            e.target.value as PaymentStatus,
                          )
                        }
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            Super: {PAYMENT_STATUS_LABEL[s]}
                          </option>
                        ))}
                      </Select>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>
          )
        ) : tab === "tymy" ? (
          !teams.length ? (
            <EmptyState title="Žádné týmy" />
          ) : (
            <Card className="overflow-hidden">
              <div className="divide-y divide-bd">
                {teams.map((t) => (
                  <div key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-wh">
                        {t.team?.name ?? "—"}
                      </p>
                      <p className="mt-0.5 text-[12px] text-mu">
                        Registrace {czk(t.amount)}
                        {t.variableSymbol ? ` · VS ${t.variableSymbol}` : ""}
                        {t.paidAt ? ` · ${fmtDate(t.paidAt)}` : ""}
                      </p>
                    </div>
                    <Badge color={PAYMENT_STATUS_COLOR[t.status]}>
                      {PAYMENT_STATUS_LABEL[t.status]}
                    </Badge>
                    <Select
                      className="w-auto min-w-36 py-1.5 text-[13px]"
                      value={t.status}
                      disabled={busy === t.team?.id}
                      onChange={(e) =>
                        t.team?.id && setTeamStatus(t.team.id, e.target.value as PaymentStatus)
                      }
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {PAYMENT_STATUS_LABEL[s]}
                        </option>
                      ))}
                    </Select>
                  </div>
                ))}
              </div>
            </Card>
          )
        ) : bank.isLoading ? (
          <SkeletonList rows={6} />
        ) : !bank.data?.length ? (
          <EmptyState
            icon={<Banknote size={44} />}
            title="Žádné bankovní pohyby"
            description="Spusť synchronizaci s Fio bankou."
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-y divide-bd">
              {bank.data.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-wh">
                      {t.senderName ?? "Neznámý odesílatel"}
                    </p>
                    <p className="mt-0.5 text-[12px] text-mu">
                      {fmtDate(t.date)}
                      {t.variableSymbol ? ` · VS ${t.variableSymbol}` : ""}
                      {t.senderAccount ? ` · ${t.senderAccount}` : ""}
                    </p>
                  </div>
                  <span className="tabular text-[15px] font-bold text-go">{czk(t.amount)}</span>
                  <Badge color={t.matched ? "#22C55E" : "#F59E0B"}>
                    {t.matched ? "Spárováno" : "Nespárováno"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <Modal open={syncOpen} onClose={() => setSyncOpen(false)} title="Výsledek synchronizace">
        {syncResult ? (
          <div className="space-y-3 text-[14px]">
            <p className="text-green">Spárováno: {syncResult.matched.length}</p>
            <p className="text-amber">Přeskočeno: {syncResult.skipped.length}</p>
            <p className="text-red">Chyby: {syncResult.errors.length}</p>
            {syncResult.skipped.length ? (
              <div className="rounded-xl border border-bd bg-c2/60 p-3">
                <p className="mb-2 text-[12px] font-semibold uppercase text-mu">
                  Nespárované platby
                </p>
                <ul className="space-y-1 text-[13px] text-mu">
                  {syncResult.skipped.slice(0, 20).map((s) => (
                    <li key={s.txId}>
                      VS {s.vs ?? "—"} — {s.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
