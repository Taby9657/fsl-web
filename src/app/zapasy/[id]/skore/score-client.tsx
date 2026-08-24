"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import {
  AlertTriangle,
  ArrowLeft,
  Play,
  Square,
  Target,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { errMsg, matchesApi } from "@/lib/api";
import { fullName } from "@/lib/format";
import type { Match, MatchEvent, Player } from "@/lib/types";
import { Page } from "@/components/layout/container";
import {
  Button,
  Card,
  Chip,
  Field,
  Input,
  SectionTitle,
  Spinner,
} from "@/components/ui/primitives";
import { ConfirmDialog, LiveBadge, Modal } from "@/components/ui/feedback";
import { TeamBadge } from "@/components/ui/data";
import { toast } from "@/components/ui/toast";

const PENALTY_TYPES = ["2 min", "5 min", "10 min", "DT"];

export function ScoreClient({ matchId }: { matchId: string }) {
  const [goalOpen, setGoalOpen] = useState(false);
  const [penaltyOpen, setPenaltyOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [deleteEvent, setDeleteEvent] = useState<MatchEvent | null>(null);
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ["match", matchId],
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === "DONE" || s === "CANCELLED" ? false : 15_000;
    },
    queryFn: async () => (await matchesApi.get(matchId)).data,
  });

  const match = q.data;

  if (q.isLoading || !match) {
    return (
      <Page size="narrow">
        <div className="flex justify-center py-24 text-go">
          <Spinner size={32} />
        </div>
      </Page>
    );
  }

  const live = match.status === "LIVE";
  const done = match.status === "DONE";
  const goals = (match.events ?? []).filter((e) => e.type === "GOAL");
  const penalties = (match.events ?? []).filter((e) => e.type === "PENALTY");

  async function action(fn: () => Promise<unknown>, okMsg: string) {
    setBusy(true);
    try {
      await fn();
      await q.refetch();
      toast.success(okMsg);
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(false);
      setStartOpen(false);
      setEndOpen(false);
      setDeleteEvent(null);
    }
  }

  return (
    <Page size="narrow">
      <Link
        href={`/zapasy/${matchId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-mu transition-colors hover:text-wh"
      >
        <ArrowLeft size={16} /> Detail zápasu
      </Link>

      {/* skóre */}
      <Card className="p-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <TeamBadge abbr={match.homeTeam?.abbr} color={match.homeTeam?.color} size={48} />
            <span className="text-[14px] font-semibold text-wh">{match.homeTeam?.name}</span>
          </div>
          <div className="text-center">
            <span className="tabular num-display block text-4xl font-black text-go">
              {match.homeScore}:{match.awayScore}
            </span>
            <span className="mt-2 block">
              {live ? (
                <LiveBadge size="md" />
              ) : (
                <span className="rounded-full bg-c2 px-2.5 py-1 text-[11px] font-bold uppercase text-mu">
                  {done ? "Ukončen" : "Před zápasem"}
                </span>
              )}
            </span>
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <TeamBadge abbr={match.awayTeam?.abbr} color={match.awayTeam?.color} size={48} />
            <span className="text-[14px] font-semibold text-wh">{match.awayTeam?.name}</span>
          </div>
        </div>
      </Card>

      {/* akce */}
      {!done ? (
        <div className="mt-4 flex gap-2">
          {!live ? (
            <Button variant="success" className="w-full" onClick={() => setStartOpen(true)}>
              <Play size={16} /> Zahájit zápas
            </Button>
          ) : (
            <>
              <Button className="flex-[2]" onClick={() => setGoalOpen(true)}>
                <Target size={16} /> Gól
              </Button>
              <Button
                variant="outline"
                className="flex-[2] border-red/50 text-red hover:bg-red/10"
                onClick={() => setPenaltyOpen(true)}
              >
                <AlertTriangle size={16} /> Trest
              </Button>
              <Button variant="danger" className="flex-1" onClick={() => setEndOpen(true)}>
                <Square size={15} /> Ukončit
              </Button>
            </>
          )}
        </div>
      ) : null}

      {/* události */}
      {goals.length === 0 && penalties.length === 0 ? (
        <Card className="mt-6 px-6 py-12 text-center">
          <Target size={36} className="mx-auto mb-3 text-di" />
          <p className="text-[14px] text-mu">Zatím žádné události</p>
        </Card>
      ) : null}

      {goals.length > 0 ? (
        <section className="mt-6">
          <SectionTitle>Góly</SectionTitle>
          <EventList
            events={goals}
            match={match}
            onDelete={done ? undefined : setDeleteEvent}
            icon={<Target size={15} />}
            color="#C9A140"
          />
        </section>
      ) : null}

      {penalties.length > 0 ? (
        <section className="mt-6">
          <SectionTitle>Tresty</SectionTitle>
          <EventList
            events={penalties}
            match={match}
            onDelete={done ? undefined : setDeleteEvent}
            icon={<AlertTriangle size={15} />}
            color="#EF4444"
          />
        </section>
      ) : null}

      {/* modály */}
      <EventModal
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        match={match}
        kind="GOAL"
        onSaved={() => {
          setGoalOpen(false);
          void q.refetch();
        }}
      />
      <EventModal
        open={penaltyOpen}
        onClose={() => setPenaltyOpen(false)}
        match={match}
        kind="PENALTY"
        onSaved={() => {
          setPenaltyOpen(false);
          void q.refetch();
        }}
      />

      <ConfirmDialog
        open={startOpen}
        title="Zahájit zápas?"
        message="Zápas se přepne do stavu LIVE. Obě soupisky musí být odeslané (min. 9 hráčů a brankář)."
        confirmLabel="Zahájit"
        loading={busy}
        onConfirm={() => action(() => matchesApi.startMatch(matchId), "Zápas byl zahájen")}
        onCancel={() => setStartOpen(false)}
      />

      <ConfirmDialog
        open={endOpen}
        title="Ukončit zápas?"
        message={`Skóre: ${match.homeScore}:${match.awayScore}\nToto nelze vrátit zpět.`}
        confirmLabel="Ukončit"
        destructive
        loading={busy}
        onConfirm={() =>
          action(
            () => matchesApi.endMatch(matchId),
            "Zápas ukončen — vedoucí byli vyzváni k vyplnění formuláře",
          )
        }
        onCancel={() => setEndOpen(false)}
      />

      <ConfirmDialog
        open={!!deleteEvent}
        title="Smazat událost?"
        message="Událost bude odstraněna a skóre se přepočítá."
        confirmLabel="Smazat"
        destructive
        loading={busy}
        onConfirm={() =>
          action(
            () => matchesApi.deleteEvent(matchId, deleteEvent!.id),
            "Událost smazána",
          )
        }
        onCancel={() => setDeleteEvent(null)}
      />
    </Page>
  );
}

function EventList({
  events,
  match,
  onDelete,
  icon,
  color,
}: {
  events: MatchEvent[];
  match: Match;
  onDelete?: (e: MatchEvent) => void;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="divide-y divide-bd">
        {[...events]
          .sort((a, b) => a.period - b.period || a.minute - b.minute)
          .map((e) => {
            const home = e.teamId === match.homeTeamId;
            const name = e.type === "GOAL" ? fullName(e.scorer) : fullName(e.penalty);
            const sub =
              e.type === "GOAL"
                ? e.assist
                  ? `Asistence: ${fullName(e.assist)}`
                  : null
                : e.penaltyType;
            return (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                <span className="tabular w-9 shrink-0 text-[13px] font-bold text-di">
                  {e.minute}&apos;
                </span>
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${color}22`, color }}
                >
                  {icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-wh">
                    {name}
                  </span>
                  <span className="block truncate text-[12px] text-mu">
                    {(home ? match.homeTeam?.abbr : match.awayTeam?.abbr) ?? ""}
                    {sub ? ` · ${sub}` : ""}
                  </span>
                </span>
                {onDelete ? (
                  <button
                    onClick={() => onDelete(e)}
                    aria-label="Smazat"
                    className="cursor-pointer rounded-lg p-1.5 text-red transition-colors hover:bg-red/10"
                  >
                    <Trash2 size={16} />
                  </button>
                ) : null}
              </div>
            );
          })}
      </div>
    </Card>
  );
}

function EventModal({
  open,
  onClose,
  match,
  kind,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  match: Match;
  kind: "GOAL" | "PENALTY";
  onSaved: () => void;
}) {
  const [side, setSide] = useState<"home" | "away">("home");
  const [minute, setMinute] = useState("");
  const [period, setPeriod] = useState(1);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [assistId, setAssistId] = useState<string | null>(null);
  const [penaltyType, setPenaltyType] = useState(PENALTY_TYPES[0]);
  const [busy, setBusy] = useState(false);

  const teamId = side === "home" ? match.homeTeamId : match.awayTeamId;
  const lineup =
    match.lineups?.find((l) => l.teamId === teamId)?.players.map((lp) => lp.player) ?? [];

  function reset() {
    setSide("home");
    setMinute("");
    setPeriod(1);
    setPlayerId(null);
    setAssistId(null);
    setPenaltyType(PENALTY_TYPES[0]);
  }

  async function submit() {
    const m = Number(minute);
    if (!minute || !Number.isFinite(m) || m < 0 || m > 200) {
      toast.error("Chybí údaje", "Zadej platnou minutu (0–200).");
      return;
    }
    if (!playerId) {
      toast.error("Chybí údaje", kind === "GOAL" ? "Vyber střelce." : "Vyber hráče.");
      return;
    }
    setBusy(true);
    try {
      await matchesApi.addEvent(
        match.id,
        kind === "GOAL"
          ? {
              type: "GOAL",
              minute: m,
              period,
              teamId,
              scorerId: playerId,
              assistId: assistId || undefined,
            }
          : {
              type: "PENALTY",
              minute: m,
              period,
              teamId,
              penaltyId: playerId,
              penaltyType,
            },
      );
      reset();
      onSaved();
      toast.success(kind === "GOAL" ? "Gól zapsán" : "Trest zapsán");
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={kind === "GOAL" ? "Přidat gól" : "Přidat trest"}
    >
      <div className="space-y-4">
        <Field label="Tým" required>
          <div className="flex gap-2">
            {(["home", "away"] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSide(s);
                  setPlayerId(null);
                  setAssistId(null);
                }}
                className={clsx(
                  "flex-1 cursor-pointer rounded-xl border px-3 py-2.5 text-[14px] font-bold transition-colors",
                  side === s
                    ? "border-go bg-go text-bg"
                    : "border-bd bg-c2 text-mu hover:text-wh",
                )}
              >
                {s === "home" ? match.homeTeam?.abbr : match.awayTeam?.abbr}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Minuta" required>
            <Input
              value={minute}
              onChange={(e) => setMinute(e.target.value.replace(/\D/g, "").slice(0, 3))}
              inputMode="numeric"
              placeholder="0"
            />
          </Field>
          <Field label="Třetina">
            <div className="flex gap-2">
              {[1, 2, 3].map((p) => (
                <Chip key={p} active={period === p} onClick={() => setPeriod(p)}>
                  {p}.
                </Chip>
              ))}
            </div>
          </Field>
        </div>

        {kind === "PENALTY" ? (
          <Field label="Druh trestu" required>
            <div className="flex flex-wrap gap-2">
              {PENALTY_TYPES.map((t) => (
                <Chip key={t} active={penaltyType === t} onClick={() => setPenaltyType(t)}>
                  {t}
                </Chip>
              ))}
            </div>
          </Field>
        ) : null}

        <Field label={kind === "GOAL" ? "Střelec" : "Hráč"} required>
          <PlayerList
            players={lineup}
            value={playerId}
            onChange={setPlayerId}
            emptyText="Soupiska nebyla odeslána"
          />
        </Field>

        {kind === "GOAL" ? (
          <Field label="Asistence (volitelně)">
            <PlayerList
              players={lineup.filter((p) => p.id !== playerId)}
              value={assistId}
              onChange={setAssistId}
              allowNone
              emptyText="Soupiska nebyla odeslána"
            />
          </Field>
        ) : null}

        <Button className="w-full" onClick={submit} loading={busy}>
          {kind === "GOAL" ? "Potvrdit gól" : "Potvrdit trest"}
        </Button>
      </div>
    </Modal>
  );
}

function PlayerList({
  players,
  value,
  onChange,
  allowNone,
  emptyText,
}: {
  players: Player[];
  value: string | null;
  onChange: (id: string | null) => void;
  allowNone?: boolean;
  emptyText: string;
}) {
  if (!players.length) {
    return <p className="text-[13px] text-mu">{emptyText}</p>;
  }
  return (
    <div className="max-h-44 overflow-y-auto rounded-xl border border-bd">
      {allowNone ? (
        <button
          onClick={() => onChange(null)}
          className={clsx(
            "flex w-full cursor-pointer items-center gap-3 border-b border-bd px-3 py-2 text-left text-[14px] transition-colors",
            !value ? "bg-go text-bg" : "text-mu hover:bg-c2",
          )}
        >
          — bez asistence
        </button>
      ) : null}
      {players.map((p) => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          className={clsx(
            "flex w-full cursor-pointer items-center gap-3 border-b border-bd px-3 py-2 text-left transition-colors last:border-0",
            value === p.id ? "bg-go text-bg" : "text-wh hover:bg-c2",
          )}
        >
          <span className="tabular w-7 text-[13px] font-bold">{p.jersey}</span>
          <span className="truncate text-[14px]">{fullName(p)}</span>
        </button>
      ))}
    </div>
  );
}
