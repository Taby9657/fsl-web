"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Home,
  ShieldCheck,
  Star,
  Trophy,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { errMsg, matchesApi, paymentsApi } from "@/lib/api";
import { czk, fmtDate, PAYMENT_STATUS_COLOR, PAYMENT_STATUS_LABEL } from "@/lib/format";
import type { PaymentStatus, TeamPayment } from "@/lib/types";
import { useAuthStore, useIsManager } from "@/store/auth";
import { Page } from "@/components/layout/container";
import { Button, Card, EmptyState, PageTitle, SectionTitle } from "@/components/ui/primitives";
import { SkeletonCards } from "@/components/ui/feedback";
import { TeamBadge } from "@/components/ui/data";
import { toast } from "@/components/ui/toast";

const BANK_IBAN = "CZ6508000000192000145399";
const BANK_BIC = "GIBACZPX";

const STATUS_ICON: Record<PaymentStatus, React.ReactNode> = {
  PENDING: <Clock size={15} />,
  PAID: <CheckCircle2 size={15} />,
  OVERDUE: <AlertCircle size={15} />,
  WAIVED: <ShieldCheck size={15} />,
};

export function PaymentsClient() {
  const user = useAuthStore((s) => s.user);
  const isManager = useIsManager();
  const teamId = user?.manager?.[0]?.teamId;
  const [paying, setPaying] = useState<string | null>(null);

  const payments = useQuery({
    queryKey: ["payments", "me"],
    queryFn: async () => (await paymentsApi.me()).data,
  });

  const homeMatches = useQuery({
    queryKey: ["payments", "home-matches", teamId],
    enabled: !!teamId,
    queryFn: async () =>
      (await matchesApi.list({ homeTeamId: teamId, status: "UPCOMING", limit: 20 })).data,
  });

  const pp = payments.data?.playerPayment;
  const teamPayments: TeamPayment[] = Array.isArray(payments.data?.teamPayment)
    ? (payments.data?.teamPayment as TeamPayment[])
    : payments.data?.teamPayment
      ? [payments.data.teamPayment as TeamPayment]
      : [];

  async function pay(kind: "player-license" | "super-license" | string, matchId?: string) {
    setPaying(matchId ?? kind);
    try {
      const res =
        kind === "player-license"
          ? await paymentsApi.playerLicense()
          : kind === "super-license"
            ? await paymentsApi.superLicense()
            : await paymentsApi.homeFee(matchId!);
      if (res.data?.url) window.location.assign(res.data.url);
      else toast.error("Chyba platby", "Server nevrátil platební odkaz.");
    } catch (e) {
      toast.error("Chyba platby", errMsg(e));
    } finally {
      setPaying(null);
    }
  }

  if (payments.isLoading) {
    return (
      <Page size="narrow">
        <PageTitle title="Platby" />
        <SkeletonCards count={3} />
      </Page>
    );
  }

  const nothing = !pp && teamPayments.length === 0 && !isManager;

  return (
    <Page size="narrow">
      <PageTitle
        title="Platby"
        subtitle="Licence, registrace týmu a poplatky za domácí zápasy"
      />

      {nothing ? (
        <EmptyState
          icon={<CreditCard size={40} />}
          title="Žádné platby"
          description="Platby se zobrazí po registraci do týmu nebo jako vedoucí."
        />
      ) : null}

      <div className="space-y-4">
        {pp ? (
          <PaymentCard
            icon={<CreditCard size={20} />}
            color="#C9A140"
            title="Hráčská licence"
            subtitle={`Sezóna ${pp.season}`}
            status={pp.licStatus}
            rows={[
              ["Výše poplatku", czk(pp.licFee)],
              ...(pp.licPaidAt ? [["Datum platby", fmtDate(pp.licPaidAt)] as [string, string]] : []),
              ...(pp.licMethod
                ? [["Metoda", pp.licMethod === "stripe" ? "Karta online" : "Bankovní převod"] as [string, string]]
                : []),
            ]}
            action={
              pp.licStatus === "PENDING" || pp.licStatus === "OVERDUE" ? (
                <Button
                  className="w-full"
                  loading={paying === "player-license"}
                  onClick={() => pay("player-license")}
                >
                  Zaplatit kartou online
                </Button>
              ) : null
            }
            transfer={
              (pp.licStatus === "PENDING" || pp.licStatus === "OVERDUE") && pp.variableSymbol
                ? { vs: pp.variableSymbol, amount: pp.licFee, msg: "FSL hracska licence" }
                : null
            }
          />
        ) : null}

        {pp ? (
          <PaymentCard
            icon={<Star size={20} />}
            color="#8B5CF6"
            title="Super licence"
            subtitle="Play-off a pohárová soutěž"
            status={pp.superStatus}
            rows={[
              ["Výše poplatku", czk(pp.superFee)],
              ...(pp.superPaidAt ? [["Datum platby", fmtDate(pp.superPaidAt)] as [string, string]] : []),
            ]}
            action={
              pp.superStatus === "PENDING" ? (
                <Button
                  variant="purple"
                  className="w-full"
                  loading={paying === "super-license"}
                  onClick={() => pay("super-license")}
                >
                  Pořídit super licenci
                </Button>
              ) : null
            }
            transfer={null}
          />
        ) : null}

        {teamPayments.map((tp) => (
          <PaymentCard
            key={tp.id}
            icon={<Trophy size={20} />}
            color="#3B82F6"
            title="Registrace týmu"
            subtitle={`Sezóna ${tp.season}${tp.team ? ` · ${tp.team.name}` : ""}`}
            status={tp.status}
            rows={[
              ["Výše poplatku", czk(tp.amount)],
              ...(tp.paidAt ? [["Datum platby", fmtDate(tp.paidAt)] as [string, string]] : []),
            ]}
            action={null}
            transfer={
              tp.status !== "PAID" && tp.variableSymbol
                ? { vs: tp.variableSymbol, amount: tp.amount, msg: "FSL registrace tymu" }
                : null
            }
          />
        ))}

        {isManager ? (
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red/15 text-red">
                <Home size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[16px] font-bold text-wh">Poplatky za domácí zápasy</h3>
                <p className="text-[12px] text-mu">2 200 Kč / zápas · do 48 h před zápasem</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {!homeMatches.data?.length ? (
                <p className="py-4 text-center text-[14px] text-mu">
                  Žádné nadcházející domácí zápasy
                </p>
              ) : (
                homeMatches.data.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-xl border border-bd bg-c2/50 p-3"
                  >
                    <TeamBadge abbr={m.awayTeam?.abbr} color={m.awayTeam?.color} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-wh">
                        vs {m.awayTeam?.name}
                      </span>
                      <span className="block text-[12px] text-mu">
                        {fmtDate(m.date)}
                        {m.venue ? ` · ${m.venue}` : ""}
                      </span>
                    </span>
                    {m.homeFeePaid ? (
                      <span className="rounded-full bg-green/15 px-2.5 py-1 text-[11px] font-bold text-green">
                        Zaplaceno
                      </span>
                    ) : (
                      <Button
                        variant="danger"
                        size="sm"
                        loading={paying === m.id}
                        onClick={() => pay("home-fee", m.id)}
                      >
                        Zaplatit
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        ) : null}
      </div>
    </Page>
  );
}

function PaymentCard({
  icon,
  color,
  title,
  subtitle,
  status,
  rows,
  action,
  transfer,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  subtitle: string;
  status: PaymentStatus;
  rows: [string, string][];
  action: React.ReactNode;
  transfer: { vs: string; amount: number; msg: string } | null;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}22`, color }}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-bold text-wh">{title}</h3>
          <p className="text-[12px] text-mu">{subtitle}</p>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold"
          style={{
            color: PAYMENT_STATUS_COLOR[status],
            borderColor: `${PAYMENT_STATUS_COLOR[status]}55`,
            backgroundColor: `${PAYMENT_STATUS_COLOR[status]}22`,
          }}
        >
          {STATUS_ICON[status]}
          {PAYMENT_STATUS_LABEL[status]}
        </span>
      </div>

      <dl className="mt-4 divide-y divide-bd">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-[13px] text-mu">{k}</dt>
            <dd className="text-[14px] font-medium text-wh">{v}</dd>
          </div>
        ))}
      </dl>

      {action ? <div className="mt-4">{action}</div> : null}
      {transfer ? <TransferBox {...transfer} /> : null}
    </Card>
  );
}

function TransferBox({ vs, amount, msg }: { vs: string; amount: number; msg: string }) {
  const spayd = `SPD*1.0*ACC:${BANK_IBAN}+${BANK_BIC}*AM:${amount}.00*CC:CZK*X-VS:${vs}*MSG:${msg}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    spayd,
  )}&bgcolor=0d0120&color=c9a140&qzone=1&format=png`;

  const copy = (v: string, label: string) => {
    void navigator.clipboard.writeText(v);
    toast.success(`${label} zkopírován`);
  };

  return (
    <div className="mt-4 rounded-xl border border-bd bg-c2/60 p-4">
      <SectionTitle className="mb-3">Nebo bankovním převodem</SectionTitle>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1 space-y-2">
          <Row label="IBAN" value={BANK_IBAN} onCopy={() => copy(BANK_IBAN, "IBAN")} />
          <Row label="BIC/SWIFT" value={BANK_BIC} onCopy={() => copy(BANK_BIC, "BIC")} />
          <Row label="Variabilní symbol" value={vs} onCopy={() => copy(vs, "Variabilní symbol")} />
          <Row label="Částka" value={czk(amount)} />
        </div>
        <div className="shrink-0 self-center">
          <Image
            src={qr}
            alt="QR platba"
            width={220}
            height={220}
            unoptimized
            className="rounded-lg"
          />
          <p className="mt-1.5 text-center text-[11px] text-di">Naskenuj v bankovní aplikaci</p>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] text-mu">{label}</span>
      <span className="flex items-center gap-1.5">
        <span className="select-all text-[13px] font-medium text-wh">{value}</span>
        {onCopy ? (
          <button
            onClick={onCopy}
            aria-label={`Kopírovat ${label}`}
            className="cursor-pointer text-di transition-colors hover:text-go"
          >
            <Copy size={13} />
          </button>
        ) : null}
      </span>
    </div>
  );
}
