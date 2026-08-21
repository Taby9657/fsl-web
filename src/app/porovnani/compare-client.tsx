"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { playersApi, searchApi } from "@/lib/api";
import { fullName, positionLabel } from "@/lib/format";
import type { Player } from "@/lib/types";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { Avatar, SearchInput, TeamDot } from "@/components/ui/data";

export function CompareClient() {
  const [p1, setP1] = useState<Player | null>(null);
  const [p2, setP2] = useState<Player | null>(null);

  const d1 = usePlayerDetail(p1?.id);
  const d2 = usePlayerDetail(p2?.id);

  const ready = d1.data && d2.data;

  return (
    <div className="space-y-6">
      <div className="grid items-start gap-4 sm:grid-cols-[1fr_auto_1fr]">
        <PlayerPicker label="Hráč 1" value={p1} onChange={setP1} />
        <span className="hidden pt-9 text-center text-[13px] font-bold uppercase text-di sm:block">
          vs
        </span>
        <PlayerPicker label="Hráč 2" value={p2} onChange={setP2} />
      </div>

      {!ready ? (
        <EmptyState
          icon={<Users size={40} />}
          title="Vyber dva hráče pro porovnání"
          description="Začni psát jméno hráče do jednoho z polí výše."
        />
      ) : (
        <>
          <Card className="p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <span className="text-[15px] font-bold text-go">{fullName(d1.data)}</span>
              <span className="text-right text-[15px] font-bold text-go">
                {fullName(d2.data)}
              </span>
            </div>
            <div className="space-y-4">
              <StatRow
                label="Góly"
                a={d1.data!.goals?.length ?? 0}
                b={d2.data!.goals?.length ?? 0}
              />
              <StatRow
                label="Asist."
                a={d1.data!.assists?.length ?? 0}
                b={d2.data!.assists?.length ?? 0}
              />
              <StatRow
                label="Body"
                a={(d1.data!.goals?.length ?? 0) + (d1.data!.assists?.length ?? 0)}
                b={(d2.data!.goals?.length ?? 0) + (d2.data!.assists?.length ?? 0)}
              />
              <StatRow
                label="MVP"
                a={d1.data!.mvpVotes?.length ?? 0}
                b={d2.data!.mvpVotes?.length ?? 0}
              />
            </div>
          </Card>

          <Card className="grid grid-cols-2 divide-x divide-bd">
            <PlayerInfo player={d1.data!} />
            <PlayerInfo player={d2.data!} align="right" />
          </Card>
        </>
      )}
    </div>
  );
}

function usePlayerDetail(id?: string) {
  return useQuery({
    queryKey: ["player", id],
    enabled: !!id,
    queryFn: async () => (await playersApi.get(id!)).data,
  });
}

function PlayerPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Player | null;
  onChange: (p: Player | null) => void;
}) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const results = useQuery({
    queryKey: ["search", debounced],
    enabled: debounced.length >= 2,
    queryFn: async () => (await searchApi.search(debounced)).data,
  });

  if (value) {
    return (
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-mu">
          {label}
        </p>
        <Card className="flex items-center gap-3 p-3">
          <Avatar
            photoUrl={value.photoUrl}
            firstName={value.firstName}
            lastName={value.lastName}
            jersey={value.jersey}
            size={40}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold text-wh">
              {fullName(value)}
            </span>
            <span className="block truncate text-[12px] text-mu">
              {value.team?.name ?? "Bez týmu"} · {positionLabel(value.position)}
            </span>
          </span>
          <button
            onClick={() => onChange(null)}
            aria-label="Odebrat"
            className="cursor-pointer text-di transition-colors hover:text-wh"
          >
            <X size={18} />
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-mu">
        {label}
      </p>
      <SearchInput value={q} onChange={setQ} placeholder="Jméno hráče…" />
      {debounced.length >= 2 && results.data?.players?.length ? (
        <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-bd bg-c1 shadow-2xl">
          {results.data.players.slice(0, 6).map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onChange(p);
                setQ("");
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-c2"
            >
              <TeamDot color={p.team?.color} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] text-wh">{fullName(p)}</span>
                <span className="block truncate text-[12px] text-mu">
                  #{p.jersey} · {p.team?.name ?? "Bez týmu"}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StatRow({ label, a, b }: { label: string; a: number; b: number }) {
  const max = Math.max(a, b, 1);
  const colorA = a > b ? "#C9A140" : a === b ? "#9B8BC8" : "#7B6BA8";
  const colorB = b > a ? "#C9A140" : a === b ? "#9B8BC8" : "#7B6BA8";
  return (
    <div className="flex items-center gap-3">
      <span className="tabular w-8 text-right text-[15px] font-bold" style={{ color: colorA }}>
        {a}
      </span>
      <span className="flex flex-1 justify-end">
        <span
          className="h-1.5 rounded-full"
          style={{ width: `${(a / max) * 100}%`, backgroundColor: colorA }}
        />
      </span>
      <span className="w-16 text-center text-[11px] font-semibold uppercase tracking-wide text-mu">
        {label}
      </span>
      <span className="flex flex-1">
        <span
          className="h-1.5 rounded-full"
          style={{ width: `${(b / max) * 100}%`, backgroundColor: colorB }}
        />
      </span>
      <span className="tabular w-8 text-[15px] font-bold" style={{ color: colorB }}>
        {b}
      </span>
    </div>
  );
}

function PlayerInfo({ player, align }: { player: Player; align?: "right" }) {
  return (
    <div className={align === "right" ? "p-4 text-right" : "p-4"}>
      <div
        className={
          align === "right"
            ? "flex items-center justify-end gap-2"
            : "flex items-center gap-2"
        }
      >
        <TeamDot color={player.team?.color} />
        <span className="truncate text-[13px] text-wh">{player.team?.name ?? "Bez týmu"}</span>
      </div>
      <p className="mt-1 text-[12px] text-mu">{positionLabel(player.position)}</p>
      <div className={align === "right" ? "mt-2 flex justify-end" : "mt-2"}>
        <Badge color={player.licensed ? "#22C55E" : "#F59E0B"}>
          {player.licensed ? "Licencován" : "Bez licence"}
        </Badge>
      </div>
    </div>
  );
}
