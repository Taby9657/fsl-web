import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  ClipboardList,
  Pin,
  PlayCircle,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { SEZONA, den, draftOtevren, prihlaskyOtevrene } from "@/lib/sezona";
import { publicFetch } from "@/lib/api";
import type { Highlight, Match, TableRow, TeamLite } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { Container } from "@/components/layout/container";
import { MatchCard } from "@/components/match-card";
import { Card, LinkButton, SectionTitle } from "@/components/ui/primitives";
import { LiveBadge } from "@/components/ui/feedback";
import { TeamDot } from "@/components/ui/data";
import { TerminyPasek } from "@/components/terminy-pasek";

export const revalidate = 30;

export default async function HomePage() {
  const [live, upcoming, table, highlights, seasons] = await Promise.all([
    publicFetch<Match[]>("/matches", { status: "LIVE" }, 15),
    publicFetch<Match[]>("/matches", { status: "UPCOMING", limit: 4 }, 60),
    publicFetch<TableRow[]>("/stats/table", { division: "Divize A" }, 60),
    publicFetch<Highlight[]>("/highlights", undefined, 120),
    // Sezónu bere z nastavení ligy, ne ze seznamu odehraných sezón. Ten se
    // odvozuje ze zápasů, takže dokud se v nové sezóně nezačalo hrát, hlásil
    // pořád tu starou — nebo, když zápasy nejsou vůbec, spadl na natvrdo
    // zapsaný fallback a titulka lhala.
    publicFetch<{ current: string | null }>("/seasons", undefined, 600),
  ]);

  const season = seasons?.current ?? "—";
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
        {/* Hero je jeden sloupec na střed, ne dva vedle sebe.
            Do 17. 9. 2026 stál text vlevo a dlaždice vedle něj; na telefonu
            se stejně skládaly pod sebe, takže dvousloupcová mřížka nedělala
            nic než že držela text u levého kraje. **96 % návštěvníků chodí
            z iPhonu**, takže rozhoduje, jak to vypadá na šířku 390 px. */}
        <Container className="relative py-10 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-go/40 bg-go-soft px-3 py-1 text-[12px] font-semibold label-caps uppercase text-go">
              Sezóna {season}
            </span>
            <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight text-wh sm:text-5xl lg:text-6xl">
              Floorball
              <br />
              <span className="text-go">Stars Liga</span>
            </h1>
            {/* **Slovo „florbalová" tu musí padnout.** Do 17. 9. 2026 tu stálo
                „Nová amatérská liga v Praze. Živé výsledky, tabulka,
                statistiky hráčů…" — to popisuje **web**, ne soutěž, a člověk,
                který o lize nikdy neslyšel, se z titulky nedozvěděl ani to,
                jaký sport se hraje. Název „Floorball Stars Liga" to nezachrání:
                anglicky a jako jméno, ne jako popis. */}
            <p className="mt-5 text-[18px] leading-8 text-mu sm:text-[20px] sm:leading-9">
              <strong className="font-semibold text-wh">
                Amatérská florbalová liga v Praze.
              </strong>{" "}
              Hraje se od listopadu do března, pondělí až čtvrtek večer.
              Přihlásit se může celý tým i jeden hráč bez party.
            </p>
            {/* První tlačítko musí být vstup do ligy, ne výsledky.
                Do 11. 9. 2026 vedlo na Zápasy — tedy na prázdný rozpis —
                a na registraci nevedl z úvodní stránky odkaz žádný. */}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <LinkButton href="/registrace" size="lg">
                Přihlásit tým nebo sebe
                <ArrowRight size={18} />
              </LinkButton>
              <LinkButton href="/cenik" variant="outline" size="lg">
                Co to stojí
              </LinkButton>
              <LinkButton href="#jak-to-funguje" variant="ghost" size="lg">
                Jak liga funguje
              </LinkButton>
            </div>
            {/* Tři údaje, podle kterých se člověk rozhoduje, jestli se přihlásí:
                dokdy to stihne, kdy se začne hrát a jestli se mu to vejde do
                týdne. `TerminyPasek` je stejný jako v přihlášce, takže kdo
                klikne dál, vidí tytéž termíny stejně.

                **Stojí pod tlačítky, ne nad nimi.** Je 189 px vysoký a Safari
                na iPhonu ukáže jen ~664 px z 844 — s ním nad tlačítky
                začínalo „Přihlásit tým nebo sebe" na 630. pixelu, na 375px
                iPhonu na 658, tedy pod ohybem. Naměřeno 17. 9. 2026. Uvnitř
                pásku zůstává text zarovnaný doleva, protože datum má vpravo
                svůj sloupec. */}
            <TerminyPasek className="mx-auto mt-8 max-w-md text-left" />
          </div>

          {/* Počet týmů se tu vědomě neukazuje — dokud liga roste, je to
              informace pro vedení, ne pro návštěvníky webu. */}
          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
            {/* Dokud rozpis nestojí, ukazuje dlaždice stav přihlášek místo
                pomlčky: „—" u prvního čísla na stránce vypadá, že liga
                neběží. Naměřeno 16. 9. 2026 — z 209 návštěvníků za 24 h
                se na přihlášku dostalo 14. */}
            {upcoming?.length ? (
              <HeroStat
                icon={<CalendarDays size={20} />}
                label="Nadcházejících zápasů"
                value={`${upcoming.length}+`}
              />
            ) : (
              <HeroStat
                icon={<ClipboardList size={20} />}
                label="Přihlášky"
                value={prihlaskyOtevrene() ? "Otevřené" : "Uzavřené"}
              />
            )}
            <HeroStat
              icon={<BarChart3 size={20} />}
              label="Statistiky"
              value="Live"
            />
            {/* Dlaždice tvrdila „Otevřen" i teď, kdy je veřejný výpis volných
                hráčů zamčený do 1. 11. — viz `draftOtevren()` v `lib/sezona`. */}
            <HeroStat
              icon={<Users size={20} />}
              label="Draft volných hráčů"
              value={draftOtevren() ? "Otevřen" : `Od ${den(SEZONA.otevreniDraftu)}`}
            />
          </div>
        </Container>
      </section>

      {/* ---------- JAK LIGA FUNGUJE ---------- */}
      {/* Cíl odkazu „Nevíš, co vybrat?" z přihlášky — proto to `id`.
          Celá smyčka: `/registrace` → sem → tlačítkem dole zpátky na výběr
          role. Do 17. 9. 2026 neříkala titulka o fungování soutěže vůbec nic:
          sekce byly živé zápasy, rozpis, aktuality, tabulka a rozcestník,
          tedy samé **výsledky** — a ty zajímají člověka, který v lize už je,
          ne toho, kdo se rozhoduje, jestli do ní vstoupí.

          **Kdo bude tuhle sekci upravovat, ať to srovná s
          `fsl-pravidla-souteze.md`.** Je to jediné místo na webu, kde je
          formát soutěže napsaný celý. */}
      <section id="jak-to-funguje" className="scroll-mt-20 border-b border-bd bg-c1/30">
        <Container className="py-12 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-black tracking-tight text-wh sm:text-3xl">
              Jak liga funguje
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[16px] leading-7 text-mu">
              Amatérský florbal pro party kamarádů i pro jednotlivce, kteří tým
              nemají. Tohle je celý formát soutěže na jednom místě.
            </p>

            <div className="mt-10 space-y-8">
              <Pravidlo nadpis="Na hřišti 5 + 1">
                Pět hráčů do pole a brankář. Střídá se průběžně, takže do
                zápasu se hlásí <strong className="font-semibold text-wh">8 + 1 až 18 + 2</strong> hráčů
                — bez osmi v poli a gólmana se zápas nezahájí.
              </Pravidlo>

              <Pravidlo nadpis="Tři třetiny po 15 minutách">
                Základní část a předkolo se hrají na{" "}
                <strong className="font-semibold text-wh">hrubý čas</strong> — hodiny se při
                přerušení nezastavují a zápas má předvídatelnou délku.{" "}
                <strong className="font-semibold text-wh">Od čtvrtfinále na čistý čas</strong>,
                tedy se zastavováním. Čím dál se jde, tím víc se hraje o výsledek.
              </Pravidlo>

              <Pravidlo nadpis="Základní část: 15 až 20 kol">
                Kolik přesně, se ukáže podle počtu přihlášených týmů — proto je
                to rozsah, ne číslo. Hraje se od listopadu do března, pondělí až
                čtvrtek mezi 18:00 a 22:00, v Praze.
              </Pravidlo>

              <Pravidlo nadpis="Do play-off jde každý tým">
                Základní částí nikomu sezóna nekončí — rozhoduje jen o nasazení.{" "}
                <strong className="font-semibold text-wh">Předkolo a čtvrtfinále</strong> se
                hrají na dvě vítězná utkání,{" "}
                <strong className="font-semibold text-wh">semifinále a finále</strong> na tři.
              </Pravidlo>

              <Pravidlo nadpis="Soupiska od 9 + 1, nahoru bez omezení">
                Devět hráčů do pole a brankář je minimum, se kterým tým do
                soutěže projde. Kolik jich přiberete navíc, je na vás — strop
                žádný není. Doporučujeme dva gólmany: s jedním je tým bez brankáře
                zhruba každý třetí zápas.
              </Pravidlo>

              <Pravidlo nadpis="Nemáš tým? Přihlas se sám">
                Hráč bez party se přihlásí do draftu volných hráčů a vedoucí,
                kterým chybí lidi do soupisky, mu pošlou nabídku. Za přihlášku
                do draftu se neplatí nic.
              </Pravidlo>

              <Pravidlo nadpis="Od 18 let">
                Platí pro hráče, vedoucí týmů i rozhodčí. Věk se počítá ke dni
                registrace.
              </Pravidlo>

              <Pravidlo nadpis="Co to stojí">
                Tým platí <strong className="font-semibold text-wh">registraci 3 000 Kč</strong>{" "}
                na sezónu a nic dalšího — poplatky za zápasy po hráčích neshání.
                Hráč si platí <strong className="font-semibold text-wh">licenci 300 Kč</strong>{" "}
                a balíček startů, ze kterého se každý odehraný zápas jeden odečte;
                ve dvacetizápasovém balíčku vychází start na 150 Kč.{" "}
                <Link href="/cenik" className="font-semibold text-go underline underline-offset-4 hover:text-wh">
                  Celý ceník
                </Link>
              </Pravidlo>
            </div>

            {/* Konec smyčky: odsud se vrací na výběr role v přihlášce.
                Kdo si sem přišel pro odpověď, nemá ji hledat zpátky sám. */}
            <div className="mt-12">
              <LinkButton href="/registrace" size="lg">
                <ArrowLeft size={18} />
                Zpět na výběr role
              </LinkButton>
              <p className="mt-3 text-[13px] text-di">
                Přihláška zabere pár minut. Účet si založíš až na konci.
              </p>
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
                <p className="text-[15px] font-semibold text-wh">
                  Rozpis se skládá z přihlášených týmů
                </p>
                <p className="mx-auto mt-2 max-w-[42ch] text-[14px] leading-6 text-mu">
                  Přihlášky běží do {den(SEZONA.konecPrihlasek)}, losuje se{" "}
                  {den(SEZONA.los)} a první kolo se hraje {den(SEZONA.start)}
                </p>
                <Link
                  href="/registrace"
                  className="mt-4 inline-block text-[14px] font-semibold text-go hover:underline"
                >
                  Přihlásit tým nebo sebe →
                </Link>
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
                <div className="px-6 py-10 text-center">
                  <p className="text-[14px] leading-6 text-mu">
                    Tabulka se zaplní prvním kolem.
                  </p>
                  <Link
                    href="/registrace"
                    className="mt-2 inline-block text-[14px] font-semibold text-go hover:underline"
                  >
                    Přihlásit tým →
                  </Link>
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

      {/* ---------- CTA REGISTRACE ----------
          Dřív tu stálo CTA na mobilní aplikaci. Appka ale není ke stažení
          (viz patička), takže poslední, co návštěvník na úvodní stránce
          viděl, bylo pozvání ke stažení něčeho, co nedostane — a pozvání
          do ligy nikde. */}
      <section className="border-t border-bd bg-c1/40">
        <Container className="py-14">
          <div className="flex flex-col items-center gap-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-go/40 bg-go-soft text-go">
              <Trophy size={26} />
            </span>
            <div>
              <h2 className="text-2xl font-bold text-wh">Přidej se do sezóny 2026/27</h2>
              <p className="mx-auto mt-2 max-w-lg text-[15px] leading-6 text-mu">
                Máte partu? Přihlaste tým — vedoucí spravuje soupisku a sestavy,
                zápasy si platí každý hráč sám z balíčku startů. Nemáš tým?
                Nabídni se v draftu, nic to nestojí.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <LinkButton href="/registrace" size="lg">
                Přihlásit tým nebo sebe
                <ArrowRight size={18} />
              </LinkButton>
              <LinkButton href="/draft" variant="outline" size="lg">
                Draft volných hráčů
              </LinkButton>
            </div>
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

/** Jedno pravidlo v sekci „Jak liga funguje" — nadpis a vysvětlení pod ním. */
function Pravidlo({ nadpis, children }: { nadpis: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[19px] font-bold text-wh sm:text-[20px]">{nadpis}</h3>
      <p className="mx-auto mt-2 max-w-xl text-[16px] leading-7 text-mu">{children}</p>
    </div>
  );
}
