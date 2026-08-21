import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicFetch } from "@/lib/api";
import type { Match } from "@/lib/types";
import { fmtDateTime } from "@/lib/format";
import { Page } from "@/components/layout/container";
import { MatchDetail } from "./match-detail";

export const revalidate = 30;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const m = await publicFetch<Match>(`/matches/${id}`);
  if (!m) return { title: "Zápas nenalezen" };
  const played = m.status === "DONE" || m.status === "LIVE";
  const score = played ? ` ${m.homeScore}:${m.awayScore}` : "";
  return {
    title: `${m.homeTeam?.name} vs ${m.awayTeam?.name}${score}`,
    description: `${m.competition} · ${m.division} · ${fmtDateTime(m.date)}${
      m.venue ? ` · ${m.venue}` : ""
    }`,
  };
}

export default async function MatchPage({ params }: Props) {
  const { id } = await params;
  const match = await publicFetch<Match>(`/matches/${id}`, undefined, 15);
  if (!match) notFound();

  return (
    <Page>
      <MatchDetail initial={match} />
    </Page>
  );
}
