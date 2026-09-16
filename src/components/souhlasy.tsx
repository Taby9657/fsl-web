"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import clsx from "clsx";
import {
  POVINNE,
  VOLITELNE,
  type KlicSouhlasu,
  type Souhlasy,
} from "@/lib/souhlasy";

/**
 * Zaškrtávátka souhlasů na konci přihlášky. Proč jsou rozdělená a proč
 * fotky nesmí blokovat odeslání, je v `@/lib/souhlasy`.
 *
 * Vlastní zaškrtávátko, ne `<input type="checkbox">` s vlastním vzhledem:
 * text u položky obsahuje odkazy na podmínky a zásady, a kdyby byl celý
 * v `<label>`, kliknutí na odkaz by zároveň přepnulo zaškrtnutí. Klikací
 * je proto jen čtvereček a jeho okolí, odkazy fungují samostatně.
 */

const ZNENI: Record<KlicSouhlasu, ReactNode> = {
  podminky: (
    <>
      Souhlasím s{" "}
      <Link href="/podminky" className="text-go hover:underline">
        Podmínkami použití
      </Link>{" "}
      a pravidly soutěže FSL.
    </>
  ),
  pravdivost: (
    <>
      Je mi 18 let nebo více a údaje, které vyplňuji, jsou pravdivé. Vím, že
      za nepravdivé údaje může liga přihlášku zrušit.
    </>
  ),
  zverejneni: (
    <>
      Beru na vědomí, že moje jméno a příjmení a údaje o mé účasti v soutěži
      (u hráčů číslo dresu, pozice, tým a statistiky) budou veřejně viditelné
      na webu i v aplikaci, a přečetl/a jsem si{" "}
      <Link href="/ochrana-osobnich-udaju" className="text-go hover:underline">
        Zásady ochrany osobních údajů
      </Link>
      .
    </>
  ),
  foto: (
    <>
      Souhlasím, aby liga pořizovala fotografie a videa ze zápasů, na kterých
      můžu být zachycen/a, a zveřejňovala je na webu, v aplikaci a na svých
      sítích (Instagram, Facebook) k propagaci soutěže. Souhlas můžu kdykoli
      odvolat.
    </>
  ),
  novinky: (
    <>
      Chci e-maily o dění v lize — termíny, novinky, změny v rozpisu. Odhlásit
      se dá jedním kliknutím v každém e-mailu.
    </>
  ),
};

function Zaskrtavatko({
  checked,
  onChange,
  chyba,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  chyba?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          "mt-0.5 flex size-5 shrink-0 cursor-pointer items-center justify-center rounded border transition-colors",
          checked
            ? "border-go bg-go text-bg"
            : chyba
              ? "border-red bg-transparent"
              : "border-bd-strong bg-transparent hover:border-go",
        )}
      >
        {checked ? <Check size={14} strokeWidth={3} /> : null}
      </button>
      <span
        className="cursor-pointer text-[13px] leading-6 text-mu"
        onClick={(e) => {
          // Klik na odkaz uvnitř textu nemá přepínat zaškrtnutí.
          if ((e.target as HTMLElement).closest("a")) return;
          onChange(!checked);
        }}
      >
        {children}
      </span>
    </div>
  );
}

export function SouhlasyPole({
  hodnoty,
  onZmena,
  chybi,
}: {
  hodnoty: Souhlasy;
  onZmena: (k: KlicSouhlasu, v: boolean) => void;
  /** Klíče povinných souhlasů, které se při odeslání ukázaly jako chybějící. */
  chybi: KlicSouhlasu[];
}) {
  return (
    <div className="space-y-4 rounded-xl border border-bd bg-c1/60 p-4">
      <div className="space-y-3">
        {POVINNE.map((k) => (
          <Zaskrtavatko
            key={k}
            checked={hodnoty[k]}
            onChange={(v) => onZmena(k, v)}
            chyba={chybi.includes(k)}
          >
            {ZNENI[k]} <span className="text-red">*</span>
          </Zaskrtavatko>
        ))}
      </div>

      <div className="space-y-3 border-t border-bd pt-4">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-di">
          Dobrovolné — na účast v lize to nemá vliv
        </p>
        {VOLITELNE.map((k) => (
          <Zaskrtavatko
            key={k}
            checked={hodnoty[k]}
            onChange={(v) => onZmena(k, v)}
          >
            {ZNENI[k]}
          </Zaskrtavatko>
        ))}
      </div>

      {chybi.length ? (
        <p className="text-[12px] leading-5 text-red">
          Bez označených souhlasů přihlášku odeslat nejde.
        </p>
      ) : null}
    </div>
  );
}
