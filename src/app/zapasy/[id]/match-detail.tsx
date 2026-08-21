"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarPlus,
  CheckCircle2,
  Flag,
  Share2,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { errMsg, matchesApi, refereesApi } from "@/lib/api";
import { fmtDateTime, fullName, isLicensed, MATCH_STATUS_LABEL } from "@/lib/format";
import type { LineupPlayer, Match, MatchEvent } from "@/lib/types";
import { useAuthStore, useIsSupervisor } from "@/store/auth";
import { Button, Card, LinkButton, SectionTitle } from "@/components/ui/primitives";
import { LiveBadge } from "@/components/ui/feedback";
import { StarPicker, TeamBadge } from "@/components/ui/data";
import { toast } from "@/components/ui/toast";

const STATUS_COLOR: Record<string, string> = {
  UPCOMING: "text-mu",
  LIVE: "text-red",
  DONE: "text-green",
  CANCELLED: "text-di",
};

type Tab = "prubeh" | "soupiska" | "info";

export function MatchDetail({ initial }: { initial: Match }) {
  const [tab, setTab] = useState<Tab>("prubeh");
  const user = useAuthStore((s) => s.user);
  const isSupervisor = useIsSupervisor();

  const { data: match = initial } = useQuery({
    queryKey: ["match", initial.id],
    initialData: initial,
    refetchInterval: initial.status === "LIVE" ? 10_000 : false,
    queryFn: async () => (await matchesApi.get(initial.id)).data,
  });

  const live = match.status === "LIVE";
  const played = match.status === "DONE" || live;
  const isAssignedRef = !!user?.referee?.id && match.refereeId === user.referee.id;
  const canScore = (isSupervisor || isAssignedRef) && (live || match.status === "UPCOMING");
  const isTeamManager = !!user?.manager?.some(
    (m) => m.teamId === match.homeTeamId || m.teamId === match.awayTeamId,
  );

  const events = useMemo(
    () => [...(match.events ?? [])].sort((a, b) => a.period - b.period || a.minute - b.minute),
    [match.events],
  );

  const homeLineup = match.lineups?.find((l) => l.teamId === match.homeTeamId)?.players ?? [];
  const awayLineup = match.lineups?.find((l) => l.teamId === match.awayTeamId)?.players ?? [];

  function downloadIcs() {
    const start = new Date(match.date);
    const end = new Date(start.getTime() + 90 * 60_000);
    const z = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//FSL//CZ",
      "BEGIN:VEVENT",
      `UID:${match.id}@fslleague.cz`,
      `DTSTAMP:${z(new Date())}`,
      `DTSTART:${z(start)}`,
      `DTEND:${z(end)}`,
      `SUMMARY:${match.homeTeam?.name} vs ${match.awayTeam?.name}`,
      match.venue ? `LOCATION:${match.venue}` : "",
      `URL:https://fslleague.cz/zapasy/${match.id}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .filter(Boolean)
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `fsl-${match.homeTeam?.abbr}-${match.awayTeam?.abbr}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function share() {
    const url = `${window.location.origin}/zapasy/${match.id}`;
    const text = `${match.homeTeam?.name} vs ${match.awayTeam?.name}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "FSL", text, url });
        return;
      } catch {
        /* uživatel zrušil */
      }
    }
    await navigator.clipboard.writeText(url);
    toast.success("Odkaz zkopírován");
  }

  return (
    <div className="space-y-6">
      {/* hlavička */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/zapasy"
          className="inline-flex items-center gap-1.5 text-[13px] text-mu transition-colors hover:text-wh"
        >
          <ArrowLeft size={16} /> Zápasy
        </Link>
        {live ? (
          <LiveBadge size="md" />
        ) : (
          <span
            className={clsx(
              "text-[12px] font-bold uppercase tracking-wide",
              STATUS_COLOR[match.status],
            )}
          >
            {MATCH_STATUS_LABEL[match.status]}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {canScore ? (
            <LinkButton href={`/zapasy/${match.id}/skore`} size="sm">
              <Target size={15} />
              Skórovat
            </LinkButton>
          ) : null}
          {match.status === "UPCOMING" ? (
            <Button variant="subtle" size="sm" onClick={downloadIcs}>
              <CalendarPlus size={15} />
              Do kalendáře
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={share}>
            <Share2 size={15} />
            Sdílet
          </Button>
        </div>
      </div>

      {/* skóre */}
      <Card className="p-6 sm:p-8">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <Link href={`/tymy/${match.homeTeamId}`} className="group flex flex-col items-center gap-3 text-center">
            <TeamBadge
              abbr={match.homeTeam?.abbr}
              color={match.homeTeam?.color}
              logoUrl={match.homeTeam?.logoUrl}
              size={64}
            />
            <span className="text-[15px] font-semibold text-wh group-hover:underline sm:text-[17px]">
              {match.homeTeam?.name}
            </span>
          </Link>

          <div className="text-center">
            {played ? (
              <span className="tabular block text-4xl font-black text-go sm:text-5xl">
                {match.homeScore ?? 0}:{match.awayScore ?? 0}
              </span>
            ) : (
              <span className="block text-[15px] font-semibold text-mu">
                {fmtDateTime(match.date)}
              </span>
            )}
            <span className="mt-2 block text-[12px] text-di">
              {match.competition}
              {match.round != null ? ` · kolo ${match.round}` : ""}
            </span>
          </div>

          <Link href={`/tymy/${match.awayTeamId}`} className="group flex flex-col items-center gap-3 text-center">
            <TeamBadge
              abbr={match.awayTeam?.abbr}
              color={match.awayTeam?.color}
              logoUrl={match.awayTeam?.logoUrl}
              size={64}
            />
            <span className="text-[15px] font-semibold text-wh group-hover:underline sm:text-[17px]">
              {match.awayTeam?.name}
            </span>
          </Link>
        </div>
      </Card>

      {/* taby */}
      <div className="flex gap-1 rounded-xl border border-bd bg-c1 p-1">
        {(
          [
            ["prubeh", "Průběh"],
            ["soupiska", "Soupiska"],
            ["info", "Info"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              "flex-1 cursor-pointer rounded-lg px-3 py-2 text-[14px] font-semibold transition-colors",
              tab === id ? "bg-go text-bg" : "text-mu hover:bg-c2 hover:text-wh",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "prubeh" ? (
        <EventTimeline match={match} events={events} />
      ) : tab === "soupiska" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <LineupColumn title={match.homeTeam?.abbr ?? ""} players={homeLineup} />
          <LineupColumn title={match.awayTeam?.abbr ?? ""} players={awayLineup} />
        </div>
      ) : (
        <InfoTab match={match} canRate={played && !!match.referee && isTeamManager} />
      )}
    </div>
  );
}

/* ---------------- Průběh ---------------- */

function EventTimeline({ match, events }: { match: Match; events: MatchEvent[] }) {
  if (!events.length) {
    return (
      <Card className="px-6 py-14 text-center">
        <Target size={36} className="mx-auto mb-3 text-di" />
        <p className="text-[15px] text-mu">
          {match.status === "DONE" ? "Žádné zaznamenané události" : "Zápas ještě nezačal"}
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-bd px-4 py-2.5 text-[12px] font-bold uppercase tracking-wide text-mu">
        <span>{match.homeTeam?.abbr}</span>
        <span>{match.awayTeam?.abbr}</span>
      </div>
      <div className="divide-y divide-bd">
        {events.map((e) => {
          const home = e.teamId === match.homeTeamId;
          const goal = e.type === "GOAL";
          const name = goal ? fullName(e.scorer) : fullName(e.penalty);
          const sub = goal
            ? e.assist
              ? `Asistence: ${fullName(e.assist)}`
              : null
            : e.penaltyType;
          return (
            <div
              key={e.id}
              className={clsx(
                "flex items-center gap-3 px-4 py-3",
                !home && "flex-row-reverse text-right",
              )}
            >
              <span className="tabular w-9 shrink-0 text-[13px] font-bold text-di">
                {e.minute}&apos;
              </span>
              <span
                className={clsx(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  goal ? "bg-go/15 text-go" : "bg-red/15 text-red",
                )}
              >
                {goal ? <Target size={15} /> : <AlertTriangle size={15} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-wh">{name}</span>
                {sub ? <span className="block truncate text-[12px] text-mu">{sub}</span> : null}
              </span>
              <span className="hidden w-16 shrink-0 text-[11px] text-di sm:block">
                {e.period}. třetina
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------------- Soupiska ---------------- */

function LineupColumn({
  title,
  players,
}: {
  title: string;
  players: LineupPlayer[];
}) {
  const unlicensed = players.filter(
    (lp) => lp.player.payment?.licStatus && !isLicensed(lp.player.payment?.licStatus),
  ).length;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-bd px-4 py-3">
        <span className="text-[13px] font-bold uppercase tracking-wide text-wh">{title}</span>
        {unlicensed > 0 ? (
          <span className="rounded-full border border-red/40 bg-red/15 px-2 py-0.5 text-[10px] font-bold text-red">
            {unlicensed}× bez licence
          </span>
        ) : null}
      </div>
      {players.length === 0 ? (
        <p className="px-4 py-8 text-center text-[14px] text-mu">
          Soupiska nebyla odeslána
        </p>
      ) : (
        <div className="divide-y divide-bd">
          {players.map((lp) => {
            const lic = !lp.player.payment?.licStatus || isLicensed(lp.player.payment?.licStatus);
            return (
              <Link
                key={lp.id}
                href={`/hraci/${lp.player.id}`}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-c2/60"
              >
                <span
                  className={clsx(
                    "tabular w-7 text-[13px] font-bold",
                    lic ? "text-go" : "text-red",
                  )}
                >
                  {lp.player.jersey}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] text-wh">
                  {fullName(lp.player)}
                </span>
                {lp.isGoalkeeper ? (
                  <span className="rounded bg-pu/20 px-1.5 py-0.5 text-[10px] font-bold text-pu">
                    GK
                  </span>
                ) : null}
                {!lic ? <AlertTriangle size={14} className="text-red" /> : null}
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ---------------- Info + hodnocení rozhodčího ---------------- */

function InfoTab({ match, canRate }: { match: Match; canRate: boolean }) {
  const user = useAuthStore((s) => s.user);
  const [rating, setRating] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const storageKey = `fsl_rating_${match.id}_${user?.id ?? ""}`;

  useEffect(() => {
    try {
      if (window.localStorage.getItem(storageKey) === "1") setDone(true);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  async function submit() {
    if (!rating || !match.referee) return;
    setBusy(true);
    try {
      await refereesApi.rate(match.referee.id, match.id, rating);
      try {
        window.localStorage.setItem(storageKey, "1");
      } catch {
        /* ignore */
      }
      setDone(true);
      toast.success("Hodnocení odesláno");
    } catch (e) {
      toast.error("Chyba", errMsg(e, "Hodnocení se nepodařilo odeslat."));
    } finally {
      setBusy(false);
    }
  }

  const rows: [string, React.ReactNode][] = [
    ...(match.venue ? ([["Hřiště", match.venue]] as [string, React.ReactNode][]) : []),
    ["Datum", fmtDateTime(match.date)],
    ["Soutěž", match.competition],
    ["Divize", match.division],
    ["Sezóna", match.season],
    ...(match.round != null
      ? ([["Kolo", String(match.round)]] as [string, React.ReactNode][])
      : []),
    ...(match.referee
      ? ([
          [
            "Rozhodčí",
            <Link
              key="ref"
              href={`/rozhodci/${match.refereeId}`}
              className="text-go hover:underline"
            >
              {fullName(match.referee)} ({match.referee.level})
            </Link>,
          ],
        ] as [string, React.ReactNode][])
      : []),
  ];

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <dl className="divide-y divide-bd">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-[13px] text-mu">{k}</dt>
              <dd className="text-right text-[14px] font-medium text-wh">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {canRate ? (
        <Card className="p-5">
          <SectionTitle>Hodnocení rozhodčího</SectionTitle>
          {done ? (
            <div className="flex items-center gap-2 text-green">
              <CheckCircle2 size={20} />
              <span className="text-[14px] font-medium">Hodnocení odesláno</span>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-3">
                <Flag size={18} className="text-mu" />
                <span className="text-[14px] text-wh">{fullName(match.referee)}</span>
              </div>
              <StarPicker value={rating} onChange={setRating} disabled={busy} />
              <Button className="mt-4" onClick={submit} disabled={!rating} loading={busy}>
                Odeslat hodnocení
              </Button>
            </>
          )}
        </Card>
      ) : null}
    </div>
  );
}
