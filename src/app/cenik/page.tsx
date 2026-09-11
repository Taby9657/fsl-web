import type { Metadata } from "next";
import Link from "next/link";
import { Page } from "@/components/layout/container";
import { Card, CardBody, PageTitle, SectionTitle } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Ceník",
  description:
    "Ceník Floorball Stars Ligy pro sezónu 2026/27 — registrace klubu, hráčská licence, superlicence a balíčky startů.",
};

/* Ceny jsou zapsané natvrdo, ne tažené z API: je to veřejný výpis, ne účet
   konkrétního hráče. Zdrojem pravdy zůstává `src/services/kredit.js` na
   backendu (balíčky) a výchozí částky ve `schema.prisma` (licence,
   registrace). Když se ceník mění, mění se obojí.

   Modelové odhady „co stojí sezóna" tu byly a Taby je 10. 9. zamítl:
   předstírají přesnost, kterou nemají — nikdo neví, kolik zápasů hráč
   odehraje — a sečíst tři čísla umí každý. Nevracet.

   Slovo „výkop" se tu nepoužívá, je to fotbalový termín. */

type Poplatek = {
  nazev: string;
  kdo: string;
  cena: number;
  jednotka: string;
};

const POPLATKY: Poplatek[] = [
  {
    nazev: "Registrace klubu",
    kdo: "Platí tým jako celek. Zahrnuje zařazení do soutěže, rozlosování a vedení soupisky.",
    cena: 3000,
    jednotka: "za sezónu",
  },
  {
    nazev: "Hráčská licence",
    kdo: "Platí každý hráč sám. Bez zaplacené licence nesmí nastoupit k zápasu.",
    cena: 300,
    jednotka: "za sezónu",
  },
  {
    nazev: "Superlicence",
    kdo: "Volitelná. Umožňuje hrát i za cizí tým, nejvýš za tři soupisky za sezónu.",
    cena: 300,
    jednotka: "za sezónu",
  },
];

type Balicek = { zapasu: number; cena: number; zaZapas: number; znacka?: string };

const BALICKY: Balicek[] = [
  { zapasu: 1, cena: 200, zaZapas: 200 },
  { zapasu: 3, cena: 550, zaZapas: 183 },
  { zapasu: 7, cena: 1200, zaZapas: 171 },
  { zapasu: 12, cena: 2000, zaZapas: 167, znacka: "nejčastější volba" },
  { zapasu: 16, cena: 2600, zaZapas: 163, znacka: "celá základní část" },
  { zapasu: 20, cena: 3000, zaZapas: 150, znacka: "nejnižší cena za zápas" },
];

const PRAVIDLA = [
  {
    t: "Splatnost",
    d: "Balíček musí být zaplacený nejpozději 48 hodin před začátkem zápasu, na který se hlásíš. Kdo nemá volný start, do sestavy nejde.",
  },
  {
    t: "Odečítání startů",
    d: "Start se zablokuje, jakmile tě vedoucí napíše do sestavy. Zúčtuje se 12 hodin před začátkem zápasu, kdy se sestava zamyká.",
  },
  {
    t: "Odhlášení ze zápasu",
    d: "Do 12 hodin před začátkem zápasu se start vrátí celý. Potom se odhlásit dá pořád, jen to stojí ten zápas — a kdo se na něj vrátí, neplatí znovu.",
  },
  {
    t: "Zrušený zápas",
    d: "Start se nezapočítá a zůstává v balíčku, i když už byl zúčtovaný.",
  },
  {
    t: "Nevyčerpané starty nepropadají",
    d: "Přenášejí se do play-off vždycky a ze všech balíčků. Do další sezóny se přenesou ve chvíli, kdy si na ni zaplatíš licenci.",
  },
  {
    t: "Balíčky se nevracejí",
    d: "A nemusí — starty nepropadají. Peníze se vracejí jen tam, kde platba neměla vzniknout vůbec: dvojí platba, špatná částka.",
  },
  {
    t: "Košík",
    d: "Poplatky se nemusí platit po jednom. Licence, superlicence, balíček i registrace klubu jdou do košíku a zaplatí se najednou, jedním variabilním symbolem. Vedoucí do něj může přidat i položky za své hráče.",
  },
  {
    t: "Jak platit",
    d: "Kartou, přes Apple Pay a Google Pay, nebo převodem s QR kódem. Cena je ve všech případech stejná. Doklad chodí ke každé platbě, v aplikaci je i souhrn za celou sezónu.",
  },
];

const czk = (n: number) => `${n.toLocaleString("cs-CZ")} Kč`;

export default function CenikPage() {
  return (
    <Page>
      <PageTitle
        title="Ceník"
        subtitle="Sezóna 2026/27 · 15–20 kol základní části + play-off pro všechny týmy · uvedené ceny jsou konečné a nic se k nim nepřipočítává"
      />

      {/* ── Model v jedné větě ── */}
      <Card className="border-bd-strong">
        <CardBody className="sm:p-6">
          <p className="text-[15px] leading-7 text-wh">
            <strong className="font-semibold">Zápasy si platí hráč, ne tým.</strong>{" "}
            Klub zaplatí registraci, hráč licenci a balíček startů — každý
            odehraný zápas z něj jeden odečte. Vedoucí už žádné peníze za zápasy
            po hráčích neshání.
          </p>
        </CardBody>
      </Card>

      {/* ── Pevné poplatky ── */}
      <div className="mt-10">
        <SectionTitle>Registrace a licence</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          {POPLATKY.map((p) => (
            <Card key={p.nazev}>
              <CardBody className="sm:p-5">
                <h3 className="text-[15px] font-semibold text-wh">{p.nazev}</h3>
                <div className="mt-2 text-3xl font-bold tracking-tight text-go tabular-nums">
                  {czk(p.cena)}
                </div>
                <div className="mt-0.5 text-[13px] text-di">{p.jednotka}</div>
                <p className="mt-3 text-[13px] leading-6 text-mu">{p.kdo}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Balíčky startů ── */}
      <div className="mt-10">
        <SectionTitle>Balíčky startů</SectionTitle>
        <p className="mb-4 max-w-2xl text-sm leading-6 text-mu">
          Kupuje si je hráč. Jeden zápas stojí 200 Kč a čím větší balíček, tím
          levnější jeden start — až na rovných 150 Kč u dvacítky.{" "}
          <strong className="font-semibold text-wh">
            Nevyčerpané starty nepropadají u žádného balíčku.
          </strong>
        </p>

        <div className="grid gap-3 xs:grid-cols-2 lg:grid-cols-3">
          {BALICKY.map((b) => (
            <Card
              key={b.zapasu}
              className={b.znacka ? "border-bd-strong" : undefined}
            >
              <CardBody>
                <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-di">
                  {b.zapasu === 1
                    ? "1 zápas"
                    : b.zapasu < 5
                      ? `${b.zapasu} zápasy`
                      : `${b.zapasu} zápasů`}
                </div>
                <div className="mt-1 text-2xl font-bold tracking-tight text-wh tabular-nums">
                  {czk(b.cena)}
                </div>
                <div className="mt-0.5 text-[13px] text-mu tabular-nums">
                  {b.zaZapas} Kč za zápas
                </div>
                {b.znacka ? (
                  <div className="mt-2 text-[13px] text-go">→ {b.znacka}</div>
                ) : null}
              </CardBody>
            </Card>
          ))}
        </div>

        <p className="mt-4 text-[13px] leading-6 text-di">
          Základní část má{" "}
          <strong className="font-semibold text-mu">15 až 20 kol</strong> podle
          počtu přihlášených týmů, na ni navazuje{" "}
          <strong className="font-semibold text-mu">play-off</strong> — a do toho
          postupují všechny týmy. Starty do play-off se nekupují zvlášť — jdou
          ze stejného balíčku, a co v základní části nevyčerpáš, si tam bereš
          s sebou.
        </p>
      </div>

      {/* ── Pokuta ──
          Podmínky použití odkazují na ceník („její výše je uvedena
          v ceníku"), takže tady stát musí. Formulace ale zůstává věcná:
          nemá vyhrožovat lidem, kteří se sestavou zápasí. */}
      <div className="mt-10">
        <SectionTitle>Pokuta za kontumaci</SectionTitle>
        <Card className="border-l-2 border-l-red">
          <CardBody className="sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3 className="text-[15px] font-semibold text-wh">
                Tým nenastoupil k zápasu
              </h3>
              <div className="text-2xl font-bold tracking-tight text-wh tabular-nums">
                {czk(3000)}
              </div>
            </div>
            <p className="mt-3 text-[13px] leading-6 text-mu">
              Zápas skončí 5:0 pro soupeře. Pokutu platí tým a{" "}
              <strong className="font-semibold text-wh">
                do jejího uhrazení nerozehraje další zápas
              </strong>
              . Soupeři, který k zápasu přišel, se starty vrátí do balíčku.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* ── Pravidla plateb ── */}
      <div className="mt-10">
        <SectionTitle>Pravidla plateb</SectionTitle>
        <Card>
          <CardBody className="sm:p-6">
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-[12rem_1fr]">
              {PRAVIDLA.map((r) => (
                <div key={r.t} className="contents">
                  <dt className="text-[13px] font-semibold text-wh">{r.t}</dt>
                  <dd className="text-sm leading-6 text-mu">{r.d}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>
      </div>

      <p className="mt-8 text-[13px] leading-6 text-di">
        Ceník platí pro sezónu 2026/27. Do další sezóny se týmy i hráči hlásí
        znovu. Úplná pravidla jsou v{" "}
        <Link href="/podminky" className="text-go hover:underline">
          podmínkách použití
        </Link>
        .
      </p>
    </Page>
  );
}
