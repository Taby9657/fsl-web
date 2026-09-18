"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import {
  odebirejSouhlas,
  stavSouhlasu,
  stavSouhlasuNaServeru,
  ulozSouhlas,
  type VolbaSouhlasu,
} from "@/lib/souhlas-mereni";

/**
 * Lišta se souhlasem s marketingovým měřením.
 *
 * Ukazuje se jen tomu, kdo ještě nevolil — ukládá se i „ne", takže odmítnutí
 * není potřeba opakovat při každé návštěvě.
 *
 * Stav se čte přes `useSyncExternalStore`, ne `useEffect`em: na serveru
 * i při hydrataci vrací `cekam`, takže se lišta neprobliskne tomu, kdo už
 * volil, a hydratace se nerozejde.
 *
 * Lišta schválně **nemá křížek**. Zavřením bez volby by vzniknul stav „neptal
 * jsem se, ale neměřím", který by se při každém načtení ptal znovu a otravoval
 * víc než dvě tlačítka.
 */
export function CookieLista() {
  const stav = useSyncExternalStore(
    odebirejSouhlas,
    stavSouhlasu,
    stavSouhlasuNaServeru,
  );

  if (stav !== "nevolil") return null;

  // Uložení volby vyvolá událost, na kterou je `useSyncExternalStore`
  // napojený — lišta se tím schová sama a nepotřebuje k tomu vlastní stav.
  const vol = (volba: VolbaSouhlasu) => ulozSouhlas(volba);

  return (
    // z-50 kvůli plovoucímu „Napsat nám" (`fixed bottom-4 right-4`) — lišta
    // ho na chvíli překryje, ale zmizí po první volbě.
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-bd bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4">
        <p className="text-[13px] leading-6 text-mu">
          Měříme, odkud k nám lidé chodí z reklam na Facebooku a Instagramu, ať
          víme, co má smysl platit. Potřebujeme k tomu souhlas s marketingovými
          cookies. Bez něj web funguje úplně stejně — podrobnosti v{" "}
          <Link
            href="/ochrana-osobnich-udaju"
            className="text-go hover:underline"
          >
            Zásadách ochrany osobních údajů
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => vol("ne")}
            className="flex-1 cursor-pointer rounded-lg border border-bd-strong px-4 py-2 text-[13px] font-semibold text-mu transition-colors hover:border-go hover:text-go sm:flex-none"
          >
            Odmítnout
          </button>
          <button
            type="button"
            onClick={() => vol("ano")}
            className="flex-1 cursor-pointer rounded-lg bg-go px-4 py-2 text-[13px] font-semibold text-bg transition-opacity hover:opacity-90 sm:flex-none"
          >
            Souhlasím
          </button>
        </div>
      </div>
    </div>
  );
}
