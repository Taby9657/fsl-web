import type { Metadata } from "next";
import Link from "next/link";
import { Page } from "@/components/layout/container";
import { Card, CardBody, PageTitle, SectionTitle } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Ceník",
  description:
    "Ceník Floorball Stars Ligy pro sezónu 2026/27 — balíčky startů, registrace týmu, licence a odhad, kolik sezóna stojí jednoho hráče.",
};

/* Ceny jsou i v `src/services/kredit.js` na backendu a v pravidlech soutěže.
   Tahle stránka je jen výpis pro veřejnost — když se ceník mění, mění se
   obojí. Odhady níž jsou z těchhle čísel spočítané ručně, ne dotažené
   z API: je to modelový příklad, ne účet konkrétního hráče. */

type Balicek = { zapasu: number; cena: number; zaZapas: number; znacka?: string };

const BALICKY: Balicek[] = [
  { zapasu: 1, cena: 200, zaZapas: 200 },
  { zapasu: 3, cena: 550, zaZapas: 183 },
  { zapasu: 7, cena: 1200, zaZapas: 171 },
  { zapasu: 12, cena: 2000, zaZapas: 167, znacka: "nejčastější volba" },
  { zapasu: 16, cena: 2600, zaZapas: 163, znacka: "na celou sezónu" },
  { zapasu: 20, cena: 3000, zaZapas: 150, znacka: "pro superlicenci" },
];

type Poplatek = {
  nazev: string;
  kdo: string;
  cena?: number;
  cenaText?: string;
  znacka?: string;
};

const POPLATKY: Poplatek[] = [
  {
    nazev: "Registrace týmu",
    kdo: "platí tým, každou sezónu znovu",
    cena: 3000,
    znacka: "klub",
  },
  {
    nazev: "Balík „Virtuální vedoucí“",
    kdo: "startovné 500 + licence 300, účtuje se jako jedna položka",
    cena: 800,
    znacka: "otevřený",
  },
  {
    nazev: "Hráčská licence",
    kdo: "platí hráč, bez ní nesmí nastoupit",
    cena: 300,
    znacka: "klub",
  },
  {
    nazev: "Superlicence",
    kdo: "hraní i za cizí tým, nejvýš tři soupisky za sezónu",
    cena: 300,
  },
  {
    nazev: "Balíček startů",
    kdo: "1 až 20 zápasů, viz žebřík výš",
    cenaText: "200 – 3 000 Kč",
  },
  {
    nazev: "Pokuta za kontumaci",
    kdo: "platí tým, který se nedostavil nebo nesehnal sestavu",
    cena: 3000,
    znacka: "tým",
  },
];

const PRAVIDLA = [
  {
    t: "Splatnost",
    d: "Balíček musí být zaplacený nejpozději 48 hodin před výkopem zápasu, na který se hlásíš. Kdo nemá volný start, do sestavy nejde.",
  },
  {
    t: "Odečítání",
    d: "Start se zablokuje, jakmile tě vedoucí napíše do sestavy. Zúčtuje se 12 hodin před výkopem, kdy se sestava zamyká.",
  },
  {
    t: "Odhlášení",
    d: "Do 12 hodin před výkopem se start vrátí celý. Potom se odhlásit dá pořád, jen to stojí ten zápas — a kdo se na něj vrátí, neplatí znovu.",
  },
  {
    t: "Zrušený zápas",
    d: "Start se nezapočítá a zůstává v balíčku, i když už byl zúčtovaný.",
  },
  {
    t: "Přenos do play-off",
    d: "Nevyčerpané starty se přenášejí vždycky a ze všech balíčků — od jednozápasového po dvacítku. Velikost balíčku na tom nic nemění.",
  },
  {
    t: "Přenos do další sezóny",
    d: "Taky ze všech balíčků. Přenos se potvrdí ve chvíli, kdy si na novou sezónu zaplatíš licenci; kdo se nepřihlásí, o zbytek přijde.",
  },
  {
    t: "Balíčky se nevracejí",
    d: "A nemusí — starty nepropadají. Peníze se vracejí jen tam, kde platba neměla vzniknout vůbec: dvojí platba, špatná částka.",
  },
  {
    t: "Odstoupení",
    d: "Před zařazením do týmu se z balíku „Virtuální vedoucí“ vrací startovné 500 Kč. Licence se nevrací — platí celou sezónu.",
  },
  {
    t: "Kontumace",
    d: "Skóre 5:0 pro soupeře. Kdo se nedostavil, tomu starty propadnou; soupeři, který sestavu sehnal, se vrátí. Tým k tomu dostane pokutu a do jejího uhrazení další zápas nerozehraje.",
  },
  {
    t: "Košík",
    d: "Poplatky se nemusí platit po jednom. Licence, superlicence, balíček i registrace týmu jdou do košíku a zaplatí se najednou, jedním variabilním symbolem. Pokuta za kontumaci do košíku nepatří — platí se zvlášť a hned.",
  },
  {
    t: "Jak platit",
    d: "Kartou, přes Apple Pay a Google Pay, nebo převodem s QR kódem. Cena je ve všech případech stejná. Doklad chodí ke každé platbě, v aplikaci je i souhrn za celou sezónu.",
  },
];

const czk = (n: number) => `${n.toLocaleString("cs-CZ")} Kč`;

const ZNACKY: Record<string, string> = {
  klub: "border-go/40 bg-go-soft text-go",
  otevřený: "border-pu/40 bg-pu-soft text-pu",
  tým: "border-red/40 bg-red/10 text-red",
};

function Znacka({ children }: { children: string }) {
  return (
    <span
      className={`ml-2 inline-block shrink-0 rounded-md border px-1.5 py-px align-[2px] text-[10px] font-semibold uppercase tracking-[0.08em] ${
        ZNACKY[children] ?? "border-bd bg-c2 text-mu"
      }`}
    >
      {children}
    </span>
  );
}

/** Řádek v odhadu sezóny. */
function Radek({
  popis,
  castka,
  soucet,
}: {
  popis: string;
  castka: string;
  soucet?: boolean;
}) {
  return (
    <div
      className={
        soucet
          ? "mt-2 flex items-baseline justify-between gap-4 border-t border-bd-strong pt-3"
          : "flex items-baseline justify-between gap-4"
      }
    >
      <span className={soucet ? "text-sm font-semibold text-wh" : "text-sm text-mu"}>
        {popis}
      </span>
      <span
        className={
          soucet
            ? "text-lg font-bold text-go tabular-nums"
            : "text-sm text-wh tabular-nums"
        }
      >
        {castka}
      </span>
    </div>
  );
}

export default function CenikPage() {
  return (
    <Page>
      <PageTitle
        title="Ceník"
        subtitle="Sezóna 2026/27 · 16 kol · uvedené ceny jsou konečné a nic se k nim nepřipočítává"
      />

      {/* ── Model v jedné větě ── */}
      <Card className="border-bd-strong">
        <CardBody className="sm:p-6">
          <p className="text-[15px] leading-7 text-wh">
            <strong className="font-semibold">Zápasy si platí hráč, ne tým.</strong>{" "}
            Koupíš si balíček startů a každý odehraný zápas z něj jeden odečte.
            Tým platí jen registraci — vedoucí už žádné peníze za zápasy po
            hráčích neshání.
          </p>
        </CardBody>
      </Card>

      {/* ── Odhad na sezónu ── */}
      <div className="mt-10">
        <SectionTitle>Kolik to stojí za sezónu</SectionTitle>
        <p className="mb-4 max-w-2xl text-sm leading-6 text-mu">
          Modelový hráč, který chce mít pokrytých všech šestnáct kol, tedy
          balíček 16 startů. Komu stačí běžná docházka, vystačí s dvanáctkou
          a odhad klesne o 600 Kč.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardBody className="sm:p-6">
              <h3 className="text-base font-semibold text-wh">
                Hráč klubového týmu
              </h3>
              <p className="mt-1 mb-4 text-[13px] text-di">
                Přihlásil se s celým týmem a vedoucí mu skládá sestavu
              </p>
              <div className="space-y-2.5">
                <Radek popis="Hráčská licence" castka={czk(300)} />
                <Radek popis="Balíček 16 startů" castka={czk(2600)} />
                <Radek popis="Podíl na registraci týmu" castka={czk(273)} />
                <Radek popis="Celkem za sezónu" castka={czk(3173)} soucet />
              </div>
              <p className="mt-4 text-[13px] leading-6 text-mu">
                Registrace 3 000 Kč rozpočítaná na jedenáctičlenný tým dělá
                273 Kč na hráče. Celý tým tak stojí{" "}
                <strong className="font-semibold text-wh">34 900 Kč</strong> za
                sezónu, tedy{" "}
                <strong className="font-semibold text-wh">
                  198 Kč na hráče a zápas
                </strong>{" "}
                se vším všudy.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="sm:p-6">
              <h3 className="text-base font-semibold text-wh">
                Hráč s virtuálním vedoucím
              </h3>
              <p className="mt-1 mb-4 text-[13px] text-di">
                Přihlásil se sám, tým mu složí liga
              </p>
              <div className="space-y-2.5">
                <Radek popis="Balík „Virtuální vedoucí“" castka={czk(800)} />
                <Radek popis="Balíček 16 startů" castka={czk(2600)} />
                <Radek popis="Podíl na registraci týmu" castka="—" />
                <Radek popis="Celkem za sezónu" castka={czk(3400)} soucet />
              </div>
              <p className="mt-4 text-[13px] leading-6 text-mu">
                O{" "}
                <strong className="font-semibold text-wh">227 Kč</strong> víc než
                hráč klubového týmu — a za to nemusí shánět deset dalších lidí.
                Licence je uvnitř balíku, neplatí se zvlášť.
              </p>
            </CardBody>
          </Card>
        </div>

        <p className="mt-4 text-[13px] leading-6 text-di">
          Odhad počítá s tím, že hráč odehraje celou základní část. Nevyčerpané
          starty ale nepropadají, takže kdo odehraje míň, o zbytek nepřijde —
          bere si ho do play-off i do další sezóny.
        </p>
      </div>

      {/* ── Balíčky startů ── */}
      <div className="mt-10">
        <SectionTitle>Balíčky startů</SectionTitle>
        <p className="mb-4 max-w-2xl text-sm leading-6 text-mu">
          Jeden zápas stojí 200 Kč a čím větší balíček, tím levnější jeden
          start — až na rovných 150 Kč u dvacítky.{" "}
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
      </div>

      {/* ── Dvě cesty do ligy ── */}
      <div className="mt-10">
        <SectionTitle>Dvě cesty do ligy</SectionTitle>
        <p className="mb-4 max-w-2xl text-sm leading-6 text-mu">
          Liší se v tom, kdo skládá sestavu a co se platí na vstupu. Starty
          platí v obou případech hráč sám.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-t-2 border-t-go">
            <CardBody className="sm:p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-go">
                Cesta první
              </div>
              <h3 className="mt-1 text-base font-semibold text-wh">Klubový tým</h3>
              <div className="mt-3 text-2xl font-bold tracking-tight text-wh tabular-nums">
                {czk(3000)}
              </div>
              <div className="text-[13px] text-mu">registrace týmu za sezónu</div>
              <p className="mt-3 text-sm leading-6 text-mu">
                Přihlásíš celý tým a vedeš ho. Sestavu skládáš na každý zápas
                sám, ale starty si platí každý hráč za sebe.
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-mu">
                <li>• tým platí jen registraci a nic víc</li>
                <li>• hráč: licence 300 Kč + balíček startů</li>
                <li>• minimálně 8 hráčů do pole a brankář</li>
              </ul>
            </CardBody>
          </Card>

          <Card className="border-t-2 border-t-pu">
            <CardBody className="sm:p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-pu">
                Cesta druhá
              </div>
              <h3 className="mt-1 text-base font-semibold text-wh">
                Otevřený tým · virtuální vedoucí
              </h3>
              <div className="mt-3 text-2xl font-bold tracking-tight text-wh tabular-nums">
                {czk(800)}
              </div>
              <div className="text-[13px] text-mu">vstupní balík za sezónu</div>
              <p className="mt-3 text-sm leading-6 text-mu">
                Přihlásíš sebe, nebo sebe a kamaráda. Tým ti složí liga:
                přihlásíš se na zápas, odečte se ti start, hraješ.
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-mu">
                <li>• startovné 500 + licence 300 v jedné položce</li>
                <li>• hráč: balíček startů</li>
                <li>• žádný vedoucí, žádné domlouvání</li>
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* ── Všechny poplatky ── */}
      <div className="mt-10">
        <SectionTitle>Všechny poplatky</SectionTitle>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-bd-strong">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-di sm:px-5">
                    Poplatek
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-di sm:px-5">
                    Zaplatíš
                  </th>
                </tr>
              </thead>
              <tbody>
                {POPLATKY.map((p) => (
                  <tr key={p.nazev} className="border-b border-bd last:border-0">
                    <td className="px-4 py-3 sm:px-5">
                      <span className="font-medium text-wh">{p.nazev}</span>
                      {p.znacka ? <Znacka>{p.znacka}</Znacka> : null}
                      <span className="mt-0.5 block text-[13px] leading-5 text-di">
                        {p.kdo}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-wh tabular-nums sm:px-5">
                      {p.cenaText ?? (p.cena !== undefined ? czk(p.cena) : "—")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ── Pravidla plateb ── */}
      <div className="mt-10">
        <SectionTitle>Pravidla plateb</SectionTitle>
        <Card>
          <CardBody className="sm:p-6">
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-[10rem_1fr]">
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
        Ceník platí pro sezónu 2026/27. Do další sezóny se týmy i jednotlivci
        hlásí znovu. Podrobná pravidla jsou v{" "}
        <Link href="/podminky" className="text-go hover:underline">
          podmínkách použití
        </Link>
        .
      </p>
    </Page>
  );
}
