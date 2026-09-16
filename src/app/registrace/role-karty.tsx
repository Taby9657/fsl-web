import type { ReactNode } from "react";
import { ChevronRight, Flag, Shield, Ticket, User } from "lucide-react";

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
  icon: ReactNode;
  title: string;
  desc: string;
  badge: string;
  color: string;
};

export const ROLES: KartaRole[] = [
  {
    klic: "player-draft",
    pro: "Pro hráče",
    id: "player",
    start: "jmeno",
    bezTymu: true,
    icon: <User size={22} />,
    title: "Nemám tým",
    desc: "Založíš si profil a nabídneš se v draftu. Vedoucí, kterým chybí lidi do soupisky, ti pošlou nabídku. Nic to nestojí.",
    badge: "Dva kroky, bez kódu",
    color: "#C9A140",
  },
  {
    klic: "player-kod",
    pro: "Pro hráče",
    id: "player",
    start: "kod",
    icon: <Ticket size={22} />,
    title: "Mám kód od vedoucího",
    desc: "Zadáš kód z pozvánky a naskočíš rovnou na soupisku svého týmu.",
    badge: "Rovnou na soupisku",
    color: "#10B981",
  },
  {
    klic: "manager",
    pro: "Pro vedoucí",
    id: "manager",
    icon: <Shield size={22} />,
    title: "Jsem vedoucí týmu",
    desc: "Vytvoříš tým, spravuješ soupisku a odesíláš sestavy před zápasem.",
    badge: "Plná správa týmu",
    color: "#8B5CF6",
  },
  {
    klic: "referee",
    pro: "Pro rozhodčí",
    id: "referee",
    icon: <Flag size={22} />,
    title: "Chci být rozhodčí",
    desc: "Vyplníš jméno, kontakt a datum narození — nic víc. Supervisor tě do 48 h schválí.",
    badge: "Čeká na schválení supervisorem",
    color: "#3B82F6",
  },
];

/** Společné třídy obalu, ať se serverová a klientská karta neliší ani o pixel. */
export const TRIDY_KARTY =
  "block w-full cursor-pointer rounded-xl border border-bd bg-c1 p-5 text-left transition-colors hover:border-bd-strong hover:bg-c2/60";

/** Vnitřek karty. Stejný na serveru i v prohlížeči. */
export function ObsahKarty({ r }: { r: KartaRole }) {
  return (
    <div className="flex items-start gap-4">
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${r.color}22`, color: r.color }}
      >
        {r.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: r.color }}
        >
          {r.pro}
        </span>
        <span className="mt-0.5 block text-[17px] font-bold text-wh">{r.title}</span>
        <span className="mt-1 block text-[13px] leading-6 text-mu">{r.desc}</span>
        <span
          className="mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ backgroundColor: `${r.color}20`, color: r.color }}
        >
          {r.badge}
        </span>
      </span>
      <ChevronRight size={18} className="mt-1 shrink-0 text-di" />
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
