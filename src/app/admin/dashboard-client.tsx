"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarCog,
  CreditCard,
  Download,
  Flag,
  MessageSquare,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { errMsg, statsApi, supervisorApi } from "@/lib/api";
import { validateSeason } from "@/lib/validation";
import { useSeasons } from "@/hooks/use-league";
import {
  Button,
  Card,
  Input,
  PageTitle,
  SectionTitle,
} from "@/components/ui/primitives";
import { ConfirmDialog, ErrorView, SkeletonCards } from "@/components/ui/feedback";
import { toast } from "@/components/ui/toast";

export function DashboardClient() {
  const { data: seasons = [] } = useSeasons();
  const [newSeason, setNewSeason] = useState("");
  const [seasonOpen, setSeasonOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["supervisor", "dashboard"],
    queryFn: async () => (await supervisorApi.dashboard()).data,
  });

  const d = q.data;

  const alerts: string[] = [];
  if (d?.pendingReferees) alerts.push(`${d.pendingReferees} rozhodčích čeká`);
  if (d?.pendingRequests) alerts.push(`${d.pendingRequests} žádostí`);
  if (d?.pendingTeams) alerts.push(`${d.pendingTeams} týmů čeká na schválení`);
  if (d?.appealingTeams) alerts.push(`${d.appealingTeams} odvolání`);

  async function exportCsv(type: "players" | "referees") {
    setExporting(type);
    try {
      const res = await statsApi.exportCsv(type);
      const blob = new Blob([res.data as unknown as string], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fsl-${type}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Chyba exportu", errMsg(e));
    } finally {
      setExporting(null);
    }
  }

  async function runNewSeason(cancelPending: boolean) {
    const err = validateSeason(newSeason);
    if (err) {
      toast.error("Neplatný formát", err);
      return;
    }
    setBusy(true);
    try {
      const res = await supervisorApi.newSeason(newSeason.trim(), cancelPending);
      toast.success("Hotovo", res.data.message);
      setNewSeason("");
      setSeasonOpen(false);
      void q.refetch();
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle title="Dashboard" subtitle="Přehled celé ligy" />

      {q.isLoading ? (
        <SkeletonCards count={4} />
      ) : q.isError ? (
        <ErrorView onRetry={() => q.refetch()} />
      ) : (
        <>
          {alerts.length ? (
            <Link href="/admin/rozhodci">
              <Card className="mb-6 flex items-center gap-3 border-amber/40 bg-amber/10 p-4 transition-colors hover:bg-amber/15">
                <AlertTriangle size={20} className="shrink-0 text-amber" />
                <span className="text-[14px] font-medium text-amber">
                  {alerts.join("  ·  ")}
                </span>
              </Card>
            </Link>
          ) : null}

          <SectionTitle>Celkový přehled</SectionTitle>
          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={<Users size={18} />} label="Celkem hráčů" value={d?.totalPlayers ?? 0} />
            <StatCard icon={<Shield size={18} />} label="Celkem týmů" value={d?.totalTeams ?? 0} />
            <StatCard
              icon={<CalendarCog size={18} />}
              label="Nadcházejících zápasů"
              value={d?.upcomingMatches ?? 0}
              color="#8B5CF6"
              href="/admin/zapasy"
            />
            <StatCard
              icon={<CreditCard size={18} />}
              label="Bez licence"
              value={d?.unpaidLicenses ?? 0}
              color="#EF4444"
              href="/admin/platby"
            />
          </div>

          <SectionTitle>Vyžaduje akci</SectionTitle>
          <div className="mb-8 grid gap-3 sm:grid-cols-2">
            <StatCard
              icon={<Flag size={18} />}
              label="Rozhodčí čekají na schválení"
              value={d?.pendingReferees ?? 0}
              color={d?.pendingReferees ? "#F59E0B" : "#22C55E"}
              href="/admin/rozhodci"
            />
            <StatCard
              icon={<MessageSquare size={18} />}
              label="Otevřené žádosti"
              value={d?.pendingRequests ?? 0}
              color={d?.pendingRequests ? "#F59E0B" : "#22C55E"}
              href="/admin/zadosti"
            />
            <StatCard
              icon={<Shield size={18} />}
              label="Týmy čekají na registraci"
              value={d?.pendingTeams ?? 0}
              color={d?.pendingTeams ? "#F59E0B" : "#22C55E"}
              href="/admin/tymy"
            />
            {d?.appealingTeams ? (
              <StatCard
                icon={<AlertTriangle size={18} />}
                label="Odvolání registrací"
                value={d.appealingTeams}
                color="#EF4444"
                href="/admin/tymy"
              />
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <SectionTitle>Export dat</SectionTitle>
              <div className="flex gap-2">
                <Button
                  variant="subtle"
                  className="flex-1"
                  loading={exporting === "players"}
                  onClick={() => exportCsv("players")}
                >
                  <Download size={15} /> Hráči CSV
                </Button>
                <Button
                  variant="subtle"
                  className="flex-1"
                  loading={exporting === "referees"}
                  onClick={() => exportCsv("referees")}
                >
                  <Download size={15} /> Rozhodčí CSV
                </Button>
              </div>
            </Card>

            <Card className="p-5">
              <SectionTitle>Sezóna</SectionTitle>
              <p className="mb-3 text-[13px] text-mu">
                Aktuální sezóna:{" "}
                <span className="font-bold text-go">{seasons[0] ?? "—"}</span>
              </p>
              <div className="flex gap-2">
                <Input
                  value={newSeason}
                  onChange={(e) => setNewSeason(e.target.value)}
                  placeholder="2026/27"
                  className="flex-1"
                />
                <Button
                  variant="purple"
                  disabled={!newSeason.trim()}
                  onClick={() => setSeasonOpen(true)}
                >
                  Spustit
                </Button>
              </div>
              <p className="mt-2 text-[12px] leading-5 text-di">
                Přepnutí sezóny resetuje všechny licence (kromě odpuštěných) a týmové platby.
              </p>
            </Card>
          </div>
        </>
      )}

      <ConfirmDialog
        open={seasonOpen}
        title="Nová sezóna"
        message={`Přepnout na sezónu ${newSeason}?\n\nChceš zrušit dosud neodehrané zápasy ze staré sezóny?`}
        confirmLabel="Zrušit staré zápasy"
        destructive
        loading={busy}
        onConfirm={() => runNewSeason(true)}
        onCancel={() => setSeasonOpen(false)}
        extraAction={{ label: "Zachovat zápasy", onClick: () => runNewSeason(false) }}
      />
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  color = "#C9A140",
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color?: string;
  href?: string;
}) {
  const inner = (
    <Card
      className="flex items-center gap-3.5 p-4 transition-colors hover:border-bd-strong"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}22`, color }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="tabular num-display block text-2xl font-black" style={{ color }}>
          {value}
        </span>
        <span className="block text-[12px] text-mu">{label}</span>
      </span>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
