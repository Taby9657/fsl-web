import { ChevronRight } from "lucide-react";

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
  /** Jediná barva na kartě — proužek vlevo. Nic jiného se jí neobarvuje. */
  color: string;
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
    color: "#C9A140",
  },
  {
    klic: "player-kod",
    pro: "Pro hráče",
    id: "player",
    start: "kod",
    title: "Mám kód od vedoucího",
    desc: "Zadáš kód z pozvánky a naskočíš rovnou na soupisku svého týmu.",
    color: "#10B981",
  },
  {
    klic: "manager",
    pro: "Pro vedoucí",
    id: "manager",
    title: "Jsem vedoucí týmu",
    desc: "Vytvoříš tým, spravuješ soupisku a odesíláš sestavy před zápasem.",
    color: "#8B5CF6",
  },
  {
    klic: "referee",
    pro: "Pro rozhodčí",
    id: "referee",
    title: "Chci být rozhodčí",
    desc: "Vyplníš jméno, kontakt a datum narození — nic víc. Supervisor tě do 48 h schválí.",
    color: "#3B82F6",
  },
];

/** Společné třídy obalu, ať se serverová a klientská karta neliší ani o pixel. */
export const TRIDY_KARTY =
  "block w-full cursor-pointer rounded-xl border border-bd bg-c1 p-4 text-left transition-colors hover:border-bd-strong hover:bg-c2/60";

/**
 * Vnitřek karty. Stejný na serveru i v prohlížeči.
 *
 * Do 17. 9. 2026 měla karta barevnou ikonu v dlaždici, barevný popisek role
 * **a** barevnou pilulku se štítkem — čtyři karty, čtyři barvy a v každé pět
 * prvků pod sebou. Na telefonu z toho byly čtyři bloky přes celou obrazovku,
 * mezi kterými se nedalo vybírat, protože každý křičel stejně hlasitě.
 *
 * Zbyl **popisek role, název a jedna věta**. Jediná barva je proužek vlevo:
 * odliší karty od sebe a nic nepřekřičí. Štítky („Dva kroky, bez kódu",
 * „Rovnou na soupisku") zmizely — buď to říkala už věta pod názvem, nebo to
 * v okamžiku výběru nikoho nezajímalo.
 *
 * **Kdo sem bude vracet ikony, vrátí i ty čtyři bloky přes celou obrazovku.**
 */
export function ObsahKarty({ r }: { r: KartaRole }) {
  return (
    <div className="flex items-start gap-3">
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-di">
          {r.pro}
        </span>
        <span className="mt-0.5 block text-[16px] font-bold text-wh">{r.title}</span>
        <span className="mt-1 block text-[13px] leading-5 text-mu">{r.desc}</span>
      </span>
      <ChevronRight size={18} className="mt-3 shrink-0 text-di" />
    </div>
  );
}

/**
 * „Nevíš, co vybrat?" — nápověda pod kartami.
 *
 * Kdo přijde z reklamy, často neví, do které ze čtyř cest patří, a bez
 * odpovědi stránku zavře. Odpověď se proto rozbalí **na místě**: nikam
 * neodkazuje a nikoho z přihlášky neposílá pryč.
 *
 * Je to `<details>`, ne stav v Reactu — funguje i v serverové náhradě, tedy
 * dřív, než se stránka oživí JavaScriptem. Safari kreslí u `summary` vlastní
 * trojúhelníček, který `list-none` nezruší; na to je
 * `[&::-webkit-details-marker]:hidden`.
 */
export function NevimCoVybrat({ className = "" }: { className?: string }) {
  return (
    <details className={`group rounded-xl border border-bd bg-c1/60 ${className}`}>
      <summary className="cursor-pointer list-none px-4 py-3 text-[14px] font-semibold text-wh [&::-webkit-details-marker]:hidden">
        Nevíš, co vybrat?
        <span className="ml-1.5 font-normal text-mu group-open:hidden">Poradíme →</span>
      </summary>
      <div className="space-y-2.5 border-t border-bd px-4 py-3 text-[13px] leading-6 text-mu">
        <p>
          <strong className="font-semibold text-wh">Hraješ, ale nemáš partu.</strong>{" "}
          Vyber „Nemám tým“. Přihlásíš se sám, vedoucí si tě najdou v draftu
          a nic za to neplatíš.
        </p>
        <p>
          <strong className="font-semibold text-wh">Někdo tě už zve.</strong>{" "}
          Když máš kód z pozvánky, jdi cestou „Mám kód od vedoucího“ —
          naskočíš rovnou na soupisku.
        </p>
        <p>
          <strong className="font-semibold text-wh">Máte partu.</strong>{" "}
          Jeden z vás přihlásí tým jako vedoucí a ostatní pozve kódem. Soupiska
          začíná na devíti hráčích a brankáři, nahoru není omezená.
        </p>
        <p>
          <strong className="font-semibold text-wh">Chceš u toho být, ale nehrát.</strong>{" "}
          Liga shání rozhodčí — stačí jméno, kontakt a datum narození.
        </p>
      </div>
    </details>
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
