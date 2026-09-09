"use client";

import { useQuery } from "@tanstack/react-query";
import { QrCode, ShieldAlert, UserMinus, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { errMsg, playersApi, teamsApi } from "@/lib/api";
import { fullName, isLicensed, PAYMENT_STATUS_COLOR, positionLabel } from "@/lib/format";
import type { Player } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { Page } from "@/components/layout/container";
import {
  Button,
  Card,
  EmptyState,
  LinkButton,
  PageTitle,
} from "@/components/ui/primitives";
import { ConfirmDialog, SkeletonList } from "@/components/ui/feedback";
import { SearchInput, TeamBadge } from "@/components/ui/data";
import { toast } from "@/components/ui/toast";

export function RosterClient() {
  const user = useAuthStore((s) => s.user);
  const teamId = user?.manager?.[0]?.teamId;
  const [q, setQ] = useState("");
  const [removing, setRemoving] = useState<Player | null>(null);
  const [busy, setBusy] = useState(false);
  const [slotBusy, setSlotBusy] = useState<string | null>(null);

  const team = useQuery({
    queryKey: ["team", teamId],
    enabled: !!teamId,
    queryFn: async () => (await teamsApi.get(teamId!)).data,
  });

  const players = useMemo(() => {
    const list = team.data?.players ?? [];
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter(
      (p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(s) ||
        String(p.jersey).includes(s),
    );
  }, [team.data?.players, q]);

  // Brankáři drží první místa ve vlastním bloku. Backend je posílá seřazené,
  // rozdělení je tady jen kvůli nadpisům a počtům.
  const goalkeepers = players.filter((p) => p.slot === "GOALKEEPER");
  const fieldPlayers = players.filter((p) => p.slot !== "GOALKEEPER");

  async function remove() {
    if (!removing || !teamId) return;
    setBusy(true);
    try {
      await playersApi.removeFromTeam(removing.id, teamId);
      await team.refetch();
      toast.success("Hotovo", `${fullName(removing)} byl odebrán z týmu.`);
      setRemoving(null);
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  /** Přehodí hráče mezi brankářem a polem. */
  async function toggleSlot(p: Player) {
    if (!teamId) return;
    const novy = p.slot === "GOALKEEPER" ? "FIELD" : "GOALKEEPER";
    setSlotBusy(p.id);
    try {
      await teamsApi.setRosterSlot(teamId, p.id, novy);
      await team.refetch();
      toast.success(
        "Hotovo",
        novy === "GOALKEEPER"
          ? `${fullName(p)} je označený jako brankář.`
          : `${fullName(p)} je zpátky hráč do pole.`,
      );
    } catch (e) {
      toast.error("Nepodařilo se změnit", errMsg(e));
    } finally {
      setSlotBusy(null);
    }
  }

  function radek(p: Player) {
    const status = p.payment?.licStatus ?? "PENDING";
    const gk = p.slot === "GOALKEEPER";
    return (
      <div key={p.id} className="flex items-center gap-3 px-4 py-3">
        <span
          className={
            gk
              ? "tabular flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pu/15 text-[13px] font-bold text-pu"
              : "tabular flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-c2 text-[13px] font-bold text-go"
          }
        >
          {p.jersey}
        </span>
        <Link href={`/hraci/${p.id}`} className="min-w-0 flex-1 hover:underline">
          <span className="block truncate text-[15px] font-medium text-wh">{fullName(p)}</span>
          <span className="block text-[12px] text-mu">
            {gk ? "Brankář" : positionLabel(p.position)}
            {!isLicensed(status) ? <span className="ml-2 text-amber">⚠️ bez licence</span> : null}
          </span>
        </Link>
        <button
          onClick={() => toggleSlot(p)}
          disabled={slotBusy === p.id}
          title={gk ? "Přesunout mezi hráče do pole" : "Označit jako brankáře"}
          className={
            gk
              ? "shrink-0 cursor-pointer rounded-lg bg-pu px-2.5 py-1 text-[11px] font-bold text-white transition-opacity disabled:opacity-50"
              : "shrink-0 cursor-pointer rounded-lg bg-c2 px-2.5 py-1 text-[11px] font-bold text-mu transition-colors hover:text-wh disabled:opacity-50"
          }
        >
          GK
        </button>
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          title={status}
          style={{ backgroundColor: PAYMENT_STATUS_COLOR[status] }}
        />
        <button
          onClick={() => setRemoving(p)}
          aria-label="Odebrat z týmu"
          className="cursor-pointer rounded-lg p-1.5 text-red transition-colors hover:bg-red/10"
        >
          <UserMinus size={17} />
        </button>
      </div>
    );
  }

  return (
    <Page size="narrow">
      <PageTitle
        title="Soupiska"
        subtitle="Hráči tvého týmu a stav jejich licencí"
        action={
          <LinkButton href="/tym/pozvanka" size="sm" variant="outline">
            <QrCode size={15} /> Pozvat hráče
          </LinkButton>
        }
      />

      {team.data ? (
        <Card
          className="mb-5 flex items-center gap-4 p-5"
          style={{ borderLeft: `4px solid ${team.data.color ?? "#C9A140"}` }}
        >
          <TeamBadge
            abbr={team.data.abbr}
            color={team.data.color}
            logoUrl={team.data.logoUrl}
            size={48}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-bold text-wh">{team.data.name}</p>
            <p className="text-[12px] text-mu">
              {team.data.division} · {team.data.players?.length ?? 0} hráčů
            </p>
          </div>
        </Card>
      ) : null}

      <SearchInput value={q} onChange={setQ} placeholder="Hledat hráče…" className="mb-4" />

      {team.isLoading ? (
        <SkeletonList rows={8} />
      ) : !players.length ? (
        <EmptyState
          icon={<Users size={44} />}
          title="Žádní hráči"
          description="Pozvi je pozvánkovým kódem."
          action={
            <LinkButton href="/tym/pozvanka" size="sm">
              Zobrazit kód
            </LinkButton>
          }
        />
      ) : (
        <>
          {/* Brankáři nahoře ve vlastním bloku. Bez brankáře v sestavě
              rozhodčí zápas nezahájí, takže prázdný blok je varování. */}
          <p className="mb-2 px-1 text-[11px] font-bold tracking-wider text-mu uppercase">
            Brankáři · {goalkeepers.length}
          </p>
          <Card className="mb-6 overflow-hidden">
            {goalkeepers.length ? (
              <div className="divide-y divide-bd">{goalkeepers.map(radek)}</div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-4 text-amber">
                <ShieldAlert size={18} className="shrink-0" />
                <span className="text-[13px]">
                  Tým nemá označeného brankáře. Bez něj nejde zahájit zápas — označ ho
                  tlačítkem <strong>GK</strong> u hráče.
                </span>
              </div>
            )}
          </Card>

          <p className="mb-2 px-1 text-[11px] font-bold tracking-wider text-mu uppercase">
            Hráči do pole · {fieldPlayers.length}
          </p>
          <Card className="overflow-hidden">
            <div className="divide-y divide-bd">{fieldPlayers.map(radek)}</div>
          </Card>
        </>
      )}

      <ConfirmDialog
        open={!!removing}
        title="Odebrat hráče"
        message={`Odebrat ${fullName(removing)} z týmu?`}
        confirmLabel="Odebrat"
        destructive
        loading={busy}
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      />
    </Page>
  );
}
