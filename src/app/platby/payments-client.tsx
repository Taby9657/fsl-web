"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Gavel,
  ShieldCheck,
  Star,
  Trophy,
  Undo2,
} from "lucide-react";
import { useState } from "react";
import { errMsg, paymentsApi } from "@/lib/api";
import { czk, fmtDate, PAYMENT_STATUS_COLOR, PAYMENT_STATUS_LABEL } from "@/lib/format";
import type { PaymentStatus, TeamPayment } from "@/lib/types";
import { useAuthStore, useIsManager } from "@/store/auth";
import { Page } from "@/components/layout/container";
import {
  Button,
  Card,
  EmptyState,
  PageTitle,
  SectionTitle,
} from "@/components/ui/primitives";
import { SkeletonCards } from "@/components/ui/feedback";
import { QrCode } from "@/components/ui/qr";
import { toast } from "@/components/ui/toast";
import { PacksSection } from "./packs-section";

type QrType = "player-license" | "super-license" | "team-reg" | "match-pack" | "fine";

const STATUS_ICON: Record<PaymentStatus, React.ReactNode> = {
  PENDING: <Clock size={15} />,
  PAID: <CheckCircle2 size={15} />,
  OVERDUE: <AlertCircle size={15} />,
  WAIVED: <ShieldCheck size={15} />,
  REFUNDED: <Undo2 size={15} />,
};

export function PaymentsClient() {
  const user = useAuthStore((s) => s.user);
  const isManager = useIsManager();
  const teamId = user?.manager?.[0]?.teamId;
  const [paying, setPaying] = useState<string | null>(null);
  const [openTransfer, setOpenTransfer] = useState<string | null>(null);

  const payments = useQuery({
    queryKey: ["payments", "me"],
    queryFn: async () => (await paymentsApi.me()).data,
  });

  const pp = payments.data?.playerPayment;
  const teamPayments: TeamPayment[] = Array.isArray(payments.data?.teamPayment)
    ? (payments.data?.teamPayment as TeamPayment[])
    : payments.data?.teamPayment
      ? [payments.data.teamPayment as TeamPayment]
      : [];

  const playerId = pp?.playerId ?? user?.player?.id;

  async function pay(
    kind: "player-license" | "super-license" | "team-reg" | "fine",
    entityId?: string,
  ) {
    setPaying(entityId ? `${kind}-${entityId}` : kind);
    try {
      const res =
        kind === "player-license"
          ? await paymentsApi.playerLicense()
          : kind === "super-license"
            ? await paymentsApi.superLicense()
            : kind === "fine"
              ? await paymentsApi.fine(entityId!)
              : await paymentsApi.teamRegistration(entityId!);
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
        subtitle="Licence, balíčky zápasů a registrace týmu — kartou, Apple Pay / Google Pay i převodem"
      />

      {/* Balíčky mají přednost: zápasy si platí hráč sám a je to jediná
          platba, ke které se vrací během celé sezóny. */}
      <PacksSection />

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
              ...(pp.licPaidAt ? ([["Datum platby", fmtDate(pp.licPaidAt)]] as [string, string][]) : []),
              ...(pp.licMethod
                ? ([["Metoda", pp.licMethod === "stripe" ? "Karta online" : "Bankovní převod"]] as [
                    string,
                    string,
                  ][])
                : []),
            ]}
            payAction={
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
              (pp.licStatus === "PENDING" || pp.licStatus === "OVERDUE") && playerId
                ? {
                    id: "lic",
                    type: "player-license",
                    entityId: playerId,
                    fallbackVs: pp.variableSymbol,
                    fallbackAmount: pp.licFee,
                    fallbackMsg: "FSL hracska licence",
                  }
                : null
            }
            open={openTransfer}
            onToggle={setOpenTransfer}
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
              ...(pp.superPaidAt
                ? ([["Datum platby", fmtDate(pp.superPaidAt)]] as [string, string][])
                : []),
            ]}
            payAction={
              pp.superStatus === "PENDING" ? (
                <Button
                  variant="purple"
                  className="w-full"
                  loading={paying === "super-license"}
                  onClick={() => pay("super-license")}
                >
                  Pořídit super licenci kartou
                </Button>
              ) : null
            }
            transfer={
              pp.superStatus === "PENDING" && playerId
                ? {
                    id: "super",
                    type: "super-license",
                    entityId: playerId,
                    fallbackVs: pp.superVariableSymbol,
                    fallbackAmount: pp.superFee,
                    fallbackMsg: "FSL superlicence",
                  }
                : null
            }
            open={openTransfer}
            onToggle={setOpenTransfer}
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
              ...(tp.paidAt ? ([["Datum platby", fmtDate(tp.paidAt)]] as [string, string][]) : []),
            ]}
            payAction={
              (tp.status === "PENDING" || tp.status === "OVERDUE") && (tp.teamId ?? teamId) ? (
                <Button
                  className="w-full"
                  loading={paying === `team-reg-${tp.teamId ?? teamId}`}
                  onClick={() => pay("team-reg", (tp.teamId ?? teamId)!)}
                >
                  Zaplatit kartou online
                </Button>
              ) : null
            }
            transfer={
              tp.status !== "PAID" && (tp.teamId ?? teamId)
                ? {
                    id: `team-${tp.id}`,
                    type: "team-reg",
                    entityId: (tp.teamId ?? teamId)!,
                    fallbackVs: tp.variableSymbol,
                    fallbackAmount: tp.amount,
                    fallbackMsg: "FSL registrace tymu",
                  }
                : null
            }
            open={openTransfer}
            onToggle={setOpenTransfer}
          />
        ))}

        {/* Pokuty za kontumaci. Jsou úmyslně dole, ale s červenou ikonou —
            vedoucí je musí najít, protože do zaplacení tým nehraje. */}
        {(payments.data?.fines ?? []).map((f) => (
          <PaymentCard
            key={f.id}
            icon={<Gavel size={20} />}
            color="#EF4444"
            title="Pokuta za kontumaci"
            subtitle={f.team ? `${f.team.name} · sezóna ${f.season}` : `Sezóna ${f.season}`}
            status={f.status}
            rows={[
              ["Výše pokuty", czk(f.amount)],
              ...(f.paidAmount > 0
                ? ([["Zatím uhrazeno", czk(f.paidAmount)]] as [string, string][])
                : []),
              ["Důvod", f.reason],
            ]}
            note="Dokud není zaplacená, rozhodčí týmu další zápas nespustí."
            payAction={
              <Button
                variant="danger"
                className="w-full"
                loading={paying === `fine-${f.id}`}
                onClick={() => pay("fine", f.id)}
              >
                Zaplatit kartou online
              </Button>
            }
            transfer={{
              id: `fine-${f.id}`,
              type: "fine",
              entityId: f.id,
              fallbackVs: f.variableSymbol,
              fallbackAmount: f.amount - f.paidAmount,
              fallbackMsg: "FSL pokuta kontumace",
            }}
            open={openTransfer}
            onToggle={setOpenTransfer}
          />
        ))}

        {/* Poplatek 2 200 Kč za domácí zápas skončil 9. 9. 2026. Zápasy si
            platí hráči sami v balíčku startů — ten je o kus níž v sekci
            Balíčky zápasů, společné pro klubové i otevřené týmy. */}
      </div>
    </Page>
  );
}

/* ---------------- Karta platby ---------------- */

type TransferProps = {
  id: string;
  type: QrType;
  entityId: string;
  fallbackVs?: string | null;
  fallbackAmount: number;
  fallbackMsg: string;
  defaultOpen?: boolean;
};

function PaymentCard({
  icon,
  color,
  title,
  subtitle,
  status,
  rows,
  note,
  payAction,
  transfer,
  open,
  onToggle,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  subtitle: string;
  status: PaymentStatus;
  rows: [string, string][];
  /** Krátká věta pod řádky — proč na té platbě záleží. */
  note?: string;
  payAction: React.ReactNode;
  transfer: TransferProps | null;
  open: string | null;
  onToggle: (id: string | null) => void;
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

      {note ? <p className="mt-3 text-[13px] leading-5 text-mu">{note}</p> : null}
      {payAction ? <div className="mt-4">{payAction}</div> : null}
      {transfer ? <TransferSection {...transfer} open={open} onToggle={onToggle} /> : null}
    </Card>
  );
}

/* ---------------- Bankovní převod + QR ---------------- */

function TransferSection({
  id,
  type,
  entityId,
  fallbackVs,
  fallbackAmount,
  fallbackMsg,
  defaultOpen,
  open,
  onToggle,
}: TransferProps & { open: string | null; onToggle: (id: string | null) => void }) {
  const isOpen = open === id || (open === null && defaultOpen === true);

  const qr = useQuery({
    queryKey: ["payment-qr", type, entityId],
    enabled: isOpen,
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => (await paymentsApi.qr(type, entityId)).data,
  });

  const vs = qr.data?.vs ?? fallbackVs ?? null;
  const amount = qr.data?.amount ?? fallbackAmount;
  // Číslo účtu bere web VÝHRADNĚ z backendu (BANK_IBAN / BANK_BIC).
  // Žádný fallback – radši nezobrazit nic než poslat platbu na cizí účet.
  const iban = qr.data?.iban ?? null;
  const bic = qr.data?.bic ?? null;
  const message = qr.data?.message ?? fallbackMsg;
  const spayd = qr.data?.spayd ?? null;

  const copy = (v: string, label: string) => {
    void navigator.clipboard.writeText(v);
    toast.success(`${label} zkopírován`);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => onToggle(id)}
        className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-bd-strong px-4 py-2.5 text-[13px] font-semibold text-go transition-colors hover:bg-go-soft"
      >
        <Banknote size={15} />
        Zaplatit převodem (QR kód)
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-bd bg-c2/60 p-4">
      <SectionTitle
        className="mb-3"
        action={
          <button
            onClick={() => onToggle(defaultOpen ? "" : null)}
            className="cursor-pointer text-[12px] font-semibold text-mu hover:text-wh"
          >
            Skrýt
          </button>
        }
      >
        Bankovní převod
      </SectionTitle>

      {qr.isLoading ? (
        <p className="py-6 text-center text-[13px] text-mu">Načítám platební údaje…</p>
      ) : !vs || !iban ? (
        <p className="text-[13px] leading-6 text-amber">
          Platební údaje se zatím nepodařilo načíst. Zkus to za chvíli znovu, nebo zaplať kartou —
          bez čísla účtu a variabilního symbolu by nešlo platbu spárovat.
        </p>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1 space-y-2">
            <Row label="IBAN" value={iban} onCopy={() => copy(iban, "IBAN")} />
            {bic ? <Row label="BIC/SWIFT" value={bic} onCopy={() => copy(bic, "BIC")} /> : null}
            <Row
              label="Variabilní symbol"
              value={vs}
              onCopy={() => copy(vs, "Variabilní symbol")}
              highlight
            />
            <Row label="Částka" value={czk(amount)} />
            <Row label="Zpráva pro příjemce" value={message} />
          </div>
          {spayd ? (
            <div className="shrink-0 self-center text-center">
              <QrCode value={spayd} size={200} alt="QR platba" className="rounded-lg" />
              <p className="mt-1.5 text-[11px] text-di">Naskenuj v bankovní aplikaci</p>
            </div>
          ) : null}
        </div>
      )}

      <p className="mt-3 text-[12px] leading-5 text-di">
        Platba se páruje automaticky podle variabilního symbolu — obvykle do druhého dne.
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  onCopy,
  highlight,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] text-mu">{label}</span>
      <span className="flex min-w-0 items-center gap-1.5">
        <span
          className={
            highlight
              ? "tabular select-all truncate text-[14px] font-bold text-go"
              : "select-all truncate text-[13px] font-medium text-wh"
          }
        >
          {value}
        </span>
        {onCopy ? (
          <button
            onClick={onCopy}
            aria-label={`Kopírovat ${label}`}
            className="shrink-0 cursor-pointer text-di transition-colors hover:text-go"
          >
            <Copy size={13} />
          </button>
        ) : null}
      </span>
    </div>
  );
}
