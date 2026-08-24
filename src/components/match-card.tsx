import clsx from "clsx";
import { MapPin } from "lucide-react";
import Link from "next/link";
import { fmtMatch } from "@/lib/format";
import type { Match } from "@/lib/types";
import { LiveBadge } from "@/components/ui/feedback";
import { TeamBadge } from "@/components/ui/data";

const STATUS_STYLE: Record<string, string> = {
  UPCOMING: "text-mu",
  LIVE: "text-red",
  DONE: "text-green",
  CANCELLED: "text-di",
};

export function MatchCard({
  match,
  showDivision = true,
  compact,
}: {
  match: Match;
  showDivision?: boolean;
  compact?: boolean;
}) {
  const live = match.status === "LIVE";
  const played = match.status === "DONE" || live;

  return (
    <Link
      href={`/zapasy/${match.id}`}
      className={clsx(
        "group block rounded-xl border bg-c1/80 p-4 transition-colors hover:border-bd-strong hover:bg-c2/60",
        live ? "border-red/45" : "border-bd",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium text-mu">{fmtMatch(match.date)}</span>
        {live ? (
          <LiveBadge />
        ) : (
          <span className={clsx("text-[11px] font-bold uppercase tracking-wide", STATUS_STYLE[match.status])}>
            {match.status === "DONE"
              ? "Odehráno"
              : match.status === "CANCELLED"
                ? "Zrušeno"
                : match.round
                  ? `Kolo ${match.round}`
                  : ""}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <TeamBadge abbr={match.homeTeam?.abbr} color={match.homeTeam?.color} size={compact ? 28 : 34} />
          <span className="truncate text-[15px] font-semibold text-wh">
            {match.homeTeam?.name ?? match.homeTeam?.abbr}
          </span>
        </div>

        <div className="shrink-0 text-center">
          {played ? (
            <span className="tabular num-display text-xl font-black text-go">
              {match.homeScore ?? 0}:{match.awayScore ?? 0}
            </span>
          ) : (
            <span className="text-[13px] font-medium text-mu">vs</span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5">
          <span className="truncate text-right text-[15px] font-semibold text-wh">
            {match.awayTeam?.name ?? match.awayTeam?.abbr}
          </span>
          <TeamBadge abbr={match.awayTeam?.abbr} color={match.awayTeam?.color} size={compact ? 28 : 34} />
        </div>
      </div>

      {(showDivision && match.division) || match.venue ? (
        <div className="mt-3 flex items-center gap-1.5 text-[12px] text-di">
          {match.venue ? <MapPin size={12} /> : null}
          <span className="truncate">
            {[showDivision ? match.division : null, match.venue].filter(Boolean).join(" · ")}
          </span>
        </div>
      ) : null}
    </Link>
  );
}

export function MatchRowCompact({ match }: { match: Match }) {
  const played = match.status === "DONE" || match.status === "LIVE";
  return (
    <Link
      href={`/zapasy/${match.id}`}
      className="flex items-center gap-3 border-b border-bd px-4 py-3 transition-colors last:border-0 hover:bg-c2/50"
    >
      <span className="w-28 shrink-0 text-[12px] text-mu">{fmtMatch(match.date)}</span>
      <span className="min-w-0 flex-1 truncate text-right text-[14px] text-wh">
        {match.homeTeam?.abbr}
      </span>
      <span className="tabular w-14 shrink-0 text-center text-[14px] font-bold text-go">
        {played ? `${match.homeScore}:${match.awayScore}` : "–"}
      </span>
      <span className="min-w-0 flex-1 truncate text-[14px] text-wh">{match.awayTeam?.abbr}</span>
      {match.status === "LIVE" ? <LiveBadge /> : null}
    </Link>
  );
}
