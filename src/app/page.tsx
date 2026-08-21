import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Pin,
  PlayCircle,
  Smartphone,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { publicFetch } from "@/lib/api";
import type { Highlight, Match, TableRow } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { Container } from "@/components/layout/container";
import { MatchCard } from "@/components/match-card";
import { Card, LinkButton, SectionTitle } from "@/components/ui/primitives";
import { LiveBadge } from "@/components/ui/feedback";
import { TeamDot } from "@/components/ui/data";

export const revalidate = 30;

export default async function HomePage() {
  const [live, upcoming, table, highlights, seasons] = await Promise.all([
    publicFetch<Match[]>("/matches", { status: "LIVE" }, 15),
    publicFetch<Match[]>("/matches", { status: "UPCOMING", limit: 4 }, 60),
    publicFetch<TableRow[]>("/stats/table", { division: "Divize A" }, 60),
    publicFetch<Highlight[]>("/highlights", undefined, 120),
    publicFetch<string[]>("/stats/seasons", undefined, 600),
  ]);

  const season = seasons?.[0] ?? "2025/26";
  const top = (table ?? []).slice(0, 6);
  const news = (highlights ?? []).slice(0, 3);

  return (
    <>
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden border-b border-bd">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(40rem 24rem at 20% 0%, rgba(201,161,64,0.16), transparent 65%), radial-gradient(36rem 22rem at 85% 20%, rgba(139,92,246,0.18), transparent 65%)",
          }}
        />
        <Container className="relative py-16 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-go/40 bg-go-soft px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-go">
                Sezóna {season}
              </span>
              <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight text-wh sm:text-5xl lg:text-6xl">
                Floorball
                <br />
                <span className="text-go">Stars Liga</span>
              </h1>
              <p className="mt-5 max-w-xl text-[16px] leading-7 text-mu">
                Živé výsledky, tabulka, statistiky hráčů, soupisky týmů a draft volných
                hráčů. Celá liga na jednom místě — na webu i v mobilní aplikaci.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <LinkButton href="/zapasy" size="lg">
                  Zápasy a výsledky
                  <ArrowRight size={18} />
                </LinkButton>
                <LinkButton href="/tabulka" variant="outline" size="lg">
                  Tabulka
                </LinkButton>
                <LinkButton href="/aplikace" variant="ghost" size="lg">
                  <Smartphone size={18} />
                  Mobilní aplikace
                </LinkButton>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <HeroStat
                icon={<Trophy size={20} />}
                label="Týmů v lize"
                value={table?.length ? String(table.length) : "—"}
              />
              <HeroStat
                icon={<CalendarDays size={20} />}
                label="Nadcházejících zápasů"
                value={upcoming?.length ? `${upcoming.length}+` : "—"}
              />
              <HeroStat
                icon={<BarChart3 size={20} />}
                label="Statistiky"
                value="Live"
              />
              <HeroStat icon={<Users size={20} />} label="Draft volných hráčů" value="Otevřen" />
            </div>
          </div>
        </Container>
      </section>

      <Container className="py-12 sm:py-16">
        {/* ---------- LIVE ---------- */}
        {live && live.length > 0 ? (
          <section className="mb-14">
            <SectionTitle
              action={
                <Link href="/zapasy" className="text-[13px] font-semibold text-go hover:underline">
                  Všechny zápasy →
                </Link>
              }
            >
              <span className="inline-flex items-center gap-2">
                <LiveBadge size="md" />
                Právě se hraje
              </span>
            </SectionTitle>
            <div className="grid gap-3 md:grid-cols-2">
              {live.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          </section>
        ) : null}

        <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          {/* ---------- NEJBLIŽŠÍ ZÁPASY ---------- */}
          <section>
            <SectionTitle
              action={
                <Link href="/zapasy" className="text-[13px] font-semibold text-go hover:underline">
                  Rozpis →
                </Link>
              }
            >
              Nejbližší zápasy
            </SectionTitle>
            {upcoming && upcoming.length > 0 ? (
              <div className="space-y-3">
                {upcoming.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            ) : (
              <Card className="px-6 py-12 text-center">
                <CalendarDays size={32} className="mx-auto mb-3 text-di" />
                <p className="text-[15px] text-mu">Žádné nadcházející zápasy</p>
              </Card>
            )}

            {/* ---------- AKTUALITY ---------- */}
            <div className="mt-12">
              <SectionTitle
                action={
                  <Link
                    href="/aktuality"
                    className="text-[13px] font-semibold text-go hover:underline"
                  >
                    Vše →
                  </Link>
                }
              >
                Highlight kola
              </SectionTitle>
              {news.length > 0 ? (
                <div className="space-y-3">
                  {news.map((h) => (
                    <Card
                      key={h.id}
                      className={h.pinned ? "border-go/50 p-4" : "p-4"}
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {h.pinned ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-go px-2 py-0.5 text-[10px] font-bold uppercase text-bg">
                            <Pin size={10} /> Připnuto
                          </span>
                        ) : null}
                        {h.round != null ? (
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-di">
                            Kolo {h.round}
                          </span>
                        ) : null}
                        {h.videoUrl ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue/20 px-2 py-0.5 text-[10px] font-bold uppercase text-blue">
                            <PlayCircle size={10} /> Video
                          </span>
                        ) : null}
                        <span className="ml-auto text-[11px] text-di">
                          {fmtDate(h.createdAt)}
                        </span>
                      </div>
                      <h3 className="text-[15px] font-bold text-wh">{h.title}</h3>
                      <p className="mt-1 line-clamp-3 text-[13px] leading-6 text-mu">
                        {h.body}
                      </p>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="px-6 py-10 text-center text-[14px] text-mu">
                  Zatím žádné aktuality
                </Card>
              )}
            </div>
          </section>

          {/* ---------- TABULKA ---------- */}
          <section>
            <SectionTitle
              action={
                <Link href="/tabulka" className="text-[13px] font-semibold text-go hover:underline">
                  Celá tabulka →
                </Link>
              }
            >
              Tabulka — Divize A
            </SectionTitle>
            <Card className="overflow-hidden">
              <div className="flex items-center gap-3 border-b border-bd px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-di">
                <span className="w-5">#</span>
                <span className="flex-1">Tým</span>
                <span className="w-7 text-center">Z</span>
                <span className="w-10 text-center">Skóre</span>
                <span className="w-7 text-center text-go">B</span>
              </div>
              {top.length > 0 ? (
                top.map((row, i) => (
                  <Link
                    key={row.teamId}
                    href={`/tymy/${row.teamId}`}
                    className="flex items-center gap-3 border-b border-bd px-4 py-3 transition-colors last:border-0 hover:bg-c2/60"
                  >
                    <span
                      className={
                        i < 3
                          ? "w-5 text-[13px] font-bold text-go"
                          : "w-5 text-[13px] text-mu"
                      }
                    >
                      {i + 1}
                    </span>
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <TeamDot color={row.team?.color} />
                      <span className="truncate text-[14px] font-medium text-wh">
                        {row.team?.name}
                      </span>
                    </span>
                    <span className="tabular w-7 text-center text-[13px] text-mu">{row.p}</span>
                    <span className="tabular w-10 text-center text-[13px] text-mu">
                      {row.gf}:{row.ga}
                    </span>
                    <span className="tabular w-7 text-center text-[14px] font-bold text-go">
                      {row.pts}
                    </span>
                  </Link>
                ))
              ) : (
                <div className="px-6 py-10 text-center text-[14px] text-mu">
                  Tabulka zatím prázdná
                </div>
              )}
            </Card>

            {/* rychlé odkazy */}
            <div className="mt-6 grid gap-3">
              <QuickLink href="/statistiky" icon={<BarChart3 size={18} />} title="Statistiky" desc="Střelci, nahrávači, MVP" />
              <QuickLink href="/tymy" icon={<Users size={18} />} title="Týmy" desc="Soupisky a profily" />
              <QuickLink href="/pavouk" icon={<Trophy size={18} />} title="Play-off pavouk" desc="Cesta za titulem" />
            </div>
          </section>
        </div>
      </Container>

      {/* ---------- CTA APLIKACE ---------- */}
      <section className="border-t border-bd bg-c1/40">
        <Container className="py-14">
          <div className="flex flex-col items-center gap-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-go/40 bg-go-soft text-go">
              <Smartphone size={26} />
            </span>
            <div>
              <h2 className="text-2xl font-bold text-wh">FSL v mobilu</h2>
              <p className="mx-auto mt-2 max-w-lg text-[15px] leading-6 text-mu">
                Živé skóre s notifikacemi, soupisky před zápasem, platby licencí přes QR
                kód a draft — vše přímo v telefonu.
              </p>
            </div>
            <LinkButton href="/aplikace" size="lg">
              Zjistit více
              <ArrowRight size={18} />
            </LinkButton>
          </div>
        </Container>
      </section>
    </>
  );
}

function HeroStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-bd bg-c1/70 p-4 backdrop-blur">
      <span className="text-go">{icon}</span>
      <p className="mt-3 text-2xl font-black text-wh">{value}</p>
      <p className="mt-0.5 text-[12px] text-mu">{label}</p>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-bd bg-c1/70 p-3.5 transition-colors hover:border-bd-strong hover:bg-c2/60"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-go-soft text-go">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-wh">{title}</span>
        <span className="block text-[12px] text-mu">{desc}</span>
      </span>
      <ArrowRight size={16} className="text-di" />
    </Link>
  );
}
