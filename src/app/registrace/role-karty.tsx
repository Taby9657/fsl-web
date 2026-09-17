import { ArrowRight } from "lucide-react";
import Link from "next/link";

/**
 * Karty s rolemi a jejich vnitřek — **záměrně mimo `onboarding-client.tsx`**.
 *
 * Tenhle soubor není `"use client"`, takže z něj umí vykreslit i server.
 * Díky tomu má `registrace/page.tsx` z čeho složit obrazovku výběru role do
 * statického HTML, ještě než se stáhne a rozběhne JavaScript — a ta samá data
 * i markup se pak použijí i v klientské verzi. **Jeden zdroj, dvě vykreslení**;
 * kdo sem sáhne, mění obojí naráz, což je přesně ten účel.
 */

export type Role = "player" | "manager" | "referee";

/** Slug kroku. Je součástí URL, takže se nepřejmenovává bezdůvodně. */
export type Krok =
  | "role"
  | "kod"
  | "jmeno"
  | "dres"
  | "doplnky"
  /// Text do draft profilu. Jen v cestě hráče bez týmu.
  | "draft"
  | "tym"
  | "vzhled"
  | "ja"
  | "osobni"
  | "kontrola"
  | "hotovo";

export type KartaRole = {
  klic: string;
  id: Role;
  /**
   * Pro koho karta je — vykresluje se jako popisek nad názvem.
   *
   * Dvě karty mají „Pro hráče" schválně: hráč s kódem i hráč bez týmu jsou
   * tatáž role, jen dvě cesty do ní, a bez popisku to z názvů („Nemám tým",
   * „Mám kód od vedoucího") nepoznal nikdo, kdo web nezná.
   */
  pro: string;
  start?: Krok;
  bezTymu?: boolean;
  title: string;
  desc: string;
};

export const ROLES: KartaRole[] = [
  {
    klic: "player-draft",
    pro: "Pro hráče",
    id: "player",
    start: "jmeno",
    bezTymu: true,
    title: "Nemám tým",
    desc: "Založíš si profil a nabídneš se v draftu. Vedoucí ti pošlou nabídku. Nic to nestojí.",
  },
  {
    klic: "player-kod",
    pro: "Pro hráče",
    id: "player",
    start: "kod",
    title: "Mám kód od vedoucího",
    desc: "Zadáš kód z pozvánky a naskočíš rovnou na soupisku svého týmu.",
  },
  {
    klic: "manager",
    pro: "Pro vedoucí",
    id: "manager",
    title: "Jsem vedoucí týmu",
    desc: "Vytvoříš tým, spravuješ soupisku a odesíláš sestavy před zápasem.",
  },
  {
    klic: "referee",
    pro: "Pro rozhodčí",
    id: "referee",
    title: "Chci být rozhodčí",
    desc: "Vyplníš jméno, kontakt a datum narození — nic víc. Supervisor tě do 48 h schválí.",
  },
];

/**
 * Společné třídy obalu, ať se serverová a klientská karta neliší ani o pixel.
 *
 * **Vzdušnější od 17. 9. 2026 večer.** Větší zaoblení, tišší rámeček a víc
 * místa uvnitř. Výška karty se tím zvedla ze 121 na 138 px — a **to je
 * strop**: nad ohybem iPhonu (390 × 664 v Safari) končí třetí karta na
 * 655. pixelu, tedy o devět pixelů dřív. `py-5` místo `py-4` ji utne.
 * Vejít se musí tři, jinak se vrací přesně ta chyba, kvůli které se
 * přihláška 17. 9. přestavovala. **Kdo sem sáhne, ať si to na 390 px změří.**
 */
export const TRIDY_KARTY =
  "block w-full cursor-pointer rounded-2xl border border-bd/70 bg-c1/70 px-5 py-4 text-center transition-colors hover:border-bd-strong hover:bg-c1";

/**
 * Vnitřek karty. Stejný na serveru i v prohlížeči.
 *
 * Do 17. 9. 2026 měla karta barevnou ikonu v dlaždici, barevný popisek role
 * **a** barevnou pilulku se štítkem — čtyři karty, čtyři barvy a v každé pět
 * prvků pod sebou. Na telefonu z toho byly čtyři bloky přes celou obrazovku,
 * mezi kterými se nedalo vybírat, protože každý křičel stejně hlasitě.
 *
 * Zbyl **popisek role, název a jedna věta**. Štítky („Dva kroky, bez kódu",
 * „Rovnou na soupisku") zmizely — buď to říkala už věta pod názvem, nebo to
 * v okamžiku výběru nikoho nezajímalo.
 *
 * **Barevný proužek vlevo je od 17. 9. 2026 večer taky pryč.** Čtyři karty
 * ve čtyřech barvách vypadaly jako čtyři různé věci, přitom jsou to čtyři
 * cesty do téhož. Karty odlišuje jejich text, ne duha po straně — a barvy
 * v FSL něco znamenají (tým, stav platby), tak ať neznačí i tohle.
 *
 * **Od 17. 9. 2026 večer je text na střed a šipka vpravo je pryč.** Šipka
 * u centrovaného textu táhne oko doprava a rozbíjí osu; buď by zabírala
 * místo a text by stál o její pixely vlevo, nebo by musela plavat nad ním
 * a narážet do dlouhého řádku. Že je karta klikací, říká celá její plocha
 * a barevný proužek vlevo.
 *
 * **Kdo sem bude vracet ikony, vrátí i ty čtyři bloky přes celou obrazovku.**
 */
export function ObsahKarty({ r }: { r: KartaRole }) {
  return (
    <>
      {/* Popisek role ustoupil: menší písmo, širší prostrkání, tlumená barva.
          Je to zařazení, ne nadpis — nemá soutěžit s názvem cesty. */}
      <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-di">
        {r.pro}
      </span>
      <span className="mt-2 block text-[18px] font-bold tracking-tight text-wh">
        {r.title}
      </span>
      {/* `max-w-[34ch]` drží rozumnou délku řádku i na širokém displeji —
          věta přes celou šířku karty se na monitoru čte špatně a vycentrovaný
          text to zhoršuje. */}
      <span className="mx-auto mt-2 block max-w-[34ch] text-[14px] leading-6 text-mu">
        {r.desc}
      </span>
    </>
  );
}

/**
 * „Nevíš, co vybrat?" — odkaz pro nerozhodnuté.
 *
 * Kdo přijde z reklamy, často neví, do které ze čtyř cest patří, a bez
 * odpovědi stránku zavře.
 *
 * **Bylo to rozbalovací `<details>` a 17. 9. 2026 to padlo:** na telefonu
 * nebylo z ničeho poznat, že se to má rozbalit — vypadalo to jako pátý,
 * jen jinak zabalený blok, a zavřené to navíc leželo pod ohybem. Odpověď,
 * kterou nikdo neotevře, není odpověď.
 *
 * Teď je to **obyčejný odkaz na sekci „Jak liga funguje" na titulce**,
 * kde je formát soutěže vysvětlený celý a odkud se tlačítkem dole vrací
 * sem na výběr role. Vypadá jako odkaz (zlatý, podtržený, se šipkou), takže je z jednoho
 * pohledu jasné, co udělá. Je vysoký 44 px kvůli prstu na telefonu.
 */
export function NevimCoVybrat({ className = "" }: { className?: string }) {
  return (
    <div className={`text-center ${className}`}>
      <Link
        href="/#jak-to-funguje"
        className="inline-flex min-h-11 items-center justify-center gap-1.5 px-3 text-[14px] font-semibold text-go underline underline-offset-4 transition-colors hover:text-wh"
      >
        Nevíš, co vybrat? Jak liga funguje
        <ArrowRight size={16} className="shrink-0" />
      </Link>
    </div>
  );
}

/**
 * Adresa, na kterou karta míří.
 *
 * Používá ji serverová verze jako `href`, takže **klik funguje i dřív, než se
 * stránka oživí JavaScriptem** — prohlížeč prostě přejde na adresu a klientská
 * komponenta si z ní krok, roli i `bezTymu` přečte. Bez `bezTymu` v adrese by
 * hráč bez týmu spadl do čtyřkrokové cesty, což je přesně ta netěsnost, kvůli
 * které se přihláška 16. 9. předělávala.
 */
export function adresaKarty(r: KartaRole, dotaz?: string): string {
  const q = new URLSearchParams(dotaz ?? "");
  q.set("krok", r.start ?? (r.id === "manager" ? "tym" : "osobni"));
  q.set("role", r.id);
  if (r.bezTymu) q.set("bezTymu", "1");
  else q.delete("bezTymu");
  return `/registrace?${q.toString()}`;
}
