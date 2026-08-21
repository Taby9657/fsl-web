import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { publicFetch } from "@/lib/api";
import type { Match, Team } from "@/lib/types";
import { Page } from "@/components/layout/container";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { StatBox, StatStrip, TeamBadge } from "@/components/ui/data";
import { TeamTabs } from "./team-tabs";

export const revalidate = 120;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const team = await publicFetch<Team>(`/teams/${id}`);
  if (!team) return { title: "Tým nenalezen" };
  return {
    title: team.name,
    description: `Soupiska, zápasy a statistiky týmu ${team.name} (${team.division}) ve Floorball Stars Lize.`,
  };
}

export default async function TeamPage({ params }: Props) {
  const { id } = await params;
  const [team, matches] = await Promise.all([
    publicFetch<Team>(`/teams/${id}`, undefined, 120),
    publicFetch<Match[]>("/matches", { teamId: id, limit: 40 }, 60),
  ]);
  if (!team) notFound();

  const played = (matches ?? []).filter((m) => m.status === "DONE");
  let wins = 0;
  let losses = 0;
  played.forEach((m) => {
    const home = m.homeTeamId === team.id;
    const my = home ? m.homeScore : m.awayScore;
    const opp = home ? m.awayScore : m.homeScore;
    if (my > opp) wins++;
    else if (my < opp) losses++;
  });
  const draws = played.length - wins - losses;

  return (
    <Page>
      <Card
        className="mb-6 p-6"
        style={{ borderTop: `4px solid ${team.color ?? "#C9A140"}` }}
      >
        <div className="flex flex-wrap items-center gap-5">
          <TeamBadge abbr={team.abbr} color={team.color} logoUrl={team.logoUrl} size={72} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-wh">{team.name}</h1>
            <p className="mt-1 text-[14px] text-mu">
              {[team.division, team.conference].filter(Boolean).join(" · ")}
            </p>
            {team.venue ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-di">
                <MapPin size={13} /> {team.venue}
              </p>
            ) : null}
          </div>
        </div>
      </Card>

      <StatStrip>
        <StatBox value={team.players?.length ?? 0} label="Hráčů" />
        <StatBox value={played.length} label="Zápasů" />
        <StatBox value={wins} label="Výhry" color="#22C55E" />
        <StatBox value={draws} label="Remízy" color="#9B8BC8" />
        <StatBox value={losses} label="Prohry" color="#EF4444" />
      </StatStrip>

      <div className="mt-8">
        <SectionTitle>Soupiska a zápasy</SectionTitle>
        <TeamTabs team={team} matches={matches ?? []} />
      </div>
    </Page>
  );
}
