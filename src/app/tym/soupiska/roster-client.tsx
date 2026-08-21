"use client";

import { useQuery } from "@tanstack/react-query";
import { QrCode, UserMinus, Users } from "lucide-react";
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
        <Card className="overflow-hidden">
          <div className="divide-y divide-bd">
            {players.map((p) => {
              const status = p.payment?.licStatus ?? "PENDING";
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="tabular flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-c2 text-[13px] font-bold text-go">
                    {p.jersey}
                  </span>
                  <Link href={`/hraci/${p.id}`} className="min-w-0 flex-1 hover:underline">
                    <span className="block truncate text-[15px] font-medium text-wh">
                      {fullName(p)}
                    </span>
                    <span className="block text-[12px] text-mu">
                      {positionLabel(p.position)}
                      {!isLicensed(status) ? (
                        <span className="ml-2 text-amber">⚠️ bez licence</span>
                      ) : null}
                    </span>
                  </Link>
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
            })}
          </div>
        </Card>
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
