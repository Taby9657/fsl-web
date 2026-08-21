import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { publicFetch } from "@/lib/api";
import type { Match, Player } from "@/lib/types";
import { fmtDate, fullName, positionLabel } from "@/lib/format";
import { Page } from "@/components/layout/container";
import { Badge, Card, SectionTitle } from "@/components/ui/primitives";
import { Avatar, StatBox, StatStrip, TeamDot } from "@/components/ui/data";

export const revalidate = 120;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = await publicFetch<Player>(`/players/${id}`);
  if (!p) return { title: "Hráč nenalezen" };
  return {
    title: fullName(p),
    description: `Statistiky, góly a zápasy hráče ${fullName(p)}${
      p.team ? ` (${p.team.name})` : ""
    } ve Floorball Stars Lize.`,
  };
}

export default async function PlayerPage({ params }: Props) {
  const { id } = await params;
  const player = await publicFetch<Player>(`/players/${id}`, undefined, 120);
  if (!player) notFound();

  const goals = player.goals ?? [];
  const assists = player.assists ?? [];
  const mvp = player.mvpVotes ?? [];

  // poslední zápasy s příspěvkem hráče
  const map = new Map<string, Match>();
  [...goals, ...assists].forEach((e) => {
    if (e.match) map.set(e.match.id, e.match);
  });
  const recent = [...map.values()]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  return (
    <Page size="narrow">
      <Card className="mb-6 p-6">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar
            photoUrl={player.photoUrl}
            firstName={player.firstName}
            lastName={player.lastName}
            jersey={player.jersey}
            size={72}
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-wh">{fullName(player)}</h1>
            <p className="mt-1 flex items-center gap-2 text-[14px] text-mu">
              {player.team ? (
                <>
                  <TeamDot color={player.team.color} />
                  <Link href={`/tymy/${player.team.id}`} className="text-go hover:underline">
                    {player.team.name}
                  </Link>
                </>
              ) : (
                "Bez týmu"
              )}
              <span className="text-di">· {positionLabel(player.position)}</span>
              <span className="text-di">· #{player.jersey}</span>
            </p>
          </div>
          <Badge color={player.licensed ? "#22C55E" : "#F59E0B"}>
            {player.licensed ? "Licencován" : "Bez licence"}
          </Badge>
        </div>
      </Card>

      <StatStrip>
        <StatBox value={goals.length} label="Góly" />
        <StatBox value={assists.length} label="Asistence" />
        <StatBox value={goals.length + assists.length} label="Body" />
        <StatBox value={mvp.length} label="MVP" />
      </StatStrip>

      {recent.length > 0 ? (
        <section className="mt-8">
          <SectionTitle>Poslední zápasy</SectionTitle>
          <Card className="overflow-hidden">
            <div className="divide-y divide-bd">
              {recent.map((m) => {
                const g = goals.filter((e) => e.match?.id === m.id).length;
                const a = assists.filter((e) => e.match?.id === m.id).length;
                return (
                  <Link
                    key={m.id}
                    href={`/zapasy/${m.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-c2/60"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-wh">
                        {m.homeTeam?.abbr} vs {m.awayTeam?.abbr}
                      </span>
                      <span className="block text-[12px] text-mu">{fmtDate(m.date)}</span>
                    </span>
                    {g > 0 ? (
                      <span className="rounded-full bg-go/20 px-2 py-0.5 text-[11px] font-bold text-go">
                        {g} G
                      </span>
                    ) : null}
                    {a > 0 ? (
                      <span className="rounded-full bg-pu/20 px-2 py-0.5 text-[11px] font-bold text-pu">
                        {a} A
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </Card>
        </section>
      ) : null}
    </Page>
  );
}
