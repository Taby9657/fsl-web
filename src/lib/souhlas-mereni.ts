/**
 * Souhlas s marketingovým měřením (Meta Pixel).
 *
 * Proč to existuje: do 18. 9. 2026 se Pixel načítal všem hned při otevření
 * webu. Ukládá cookie `_fbp` a posílá Metě IP adresu, což bez souhlasu v EU
 * nejde.
 *
 * **Netýká se ostatního měření a nesmí se na něj rozšířit.** Vercel Analytics
 * je bezcookiové a vlastní trychtýř přihlášky (`onboardingApi`) drží id jen
 * v paměti otevřené stránky — obojí běží dál bez ohledu na tuhle volbu, jak
 * je popsáno v `fsl-mereni-navstevnosti-2026-09-15.md` a
 * `fsl-mereni-trychtyre-2026-09-16.md`. Kdo sem přidá další nástroj, ať
 * nejdřív ověří, jestli souhlas vůbec potřebuje.
 *
 * Volba se ukládá do `localStorage`, ne do cookie: cookie by cestovala
 * s každým požadavkem a byla by přesně tím, co má lišta řešit.
 */

export const KLIC_SOUHLASU = "fsl-souhlas-mereni";

/**
 * Verze znění souhlasu. Když se rozsah zpracování změní (přibude nástroj,
 * změní se účel), zvedni číslo — uložené starší volby tím přestanou platit
 * a lišta se zeptá znovu. Souhlas nejde „zdědit" na něco, k čemu ho nikdo
 * nedal.
 */
export const VERZE_SOUHLASU = 1;

export type VolbaSouhlasu = "ano" | "ne";

/**
 * Stav, jak ho vidí komponenty.
 *
 * `cekam` je stav při vykreslení na serveru a při hydrataci — tam se ještě
 * neví, co má člověk uložené. Lišta se v něm neukazuje a pixel se nenačítá,
 * takže se nic neprobliskne a hydratace se nerozejde: `useSyncExternalStore`
 * po hydrataci sáhne pro skutečnou hodnotu a překreslí.
 */
export type StavSouhlasu = VolbaSouhlasu | "nevolil" | "cekam";

/** Vlastní událost okna. Pixel na ni čeká, aby se načetl hned po kliknutí. */
export const UDALOST_ZMENY = "fsl:souhlas-mereni";

type Ulozeno = { volba: VolbaSouhlasu; verze: number };

/** `null` = člověk ještě nevolil, nebo je uložená volba z jiné verze znění. */
export function nactiSouhlas(): VolbaSouhlasu | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KLIC_SOUHLASU);
    if (!raw) return null;
    const data = JSON.parse(raw) as Ulozeno;
    if (data?.verze !== VERZE_SOUHLASU) return null;
    return data.volba === "ano" || data.volba === "ne" ? data.volba : null;
  } catch {
    // Soukromé okno nebo zablokované úložiště: chováme se, jako by souhlas
    // nebyl — tedy neměříme. Tohle nikdy nesmí shodit stránku.
    return null;
  }
}

export function maSouhlas(): boolean {
  return nactiSouhlas() === "ano";
}

/* ---------- napojení na React přes `useSyncExternalStore` ---------- */

/* Mezipaměť tu není kvůli výkonu localStorage, ale kvůli kontraktu
   `useSyncExternalStore`: jeho `getSnapshot` musí mezi překresleními vracet
   **stejnou hodnotu**, dokud se něco nezmění. Čtení úložiště při každém
   renderu to splňuje jen náhodou, a jakmile by se hodnota stala objektem,
   React by se zacyklil. Ruší ji jedině změna volby. */
let mezipamet: { stav: StavSouhlasu } | null = null;

export function ulozSouhlas(volba: VolbaSouhlasu) {
  try {
    window.localStorage.setItem(
      KLIC_SOUHLASU,
      JSON.stringify({ volba, verze: VERZE_SOUHLASU } satisfies Ulozeno),
    );
  } catch {
    // I když se volba neuloží, ať platí aspoň pro tuhle návštěvu.
  }
  mezipamet = { stav: volba };
  window.dispatchEvent(new CustomEvent(UDALOST_ZMENY, { detail: volba }));
}

export function odebirejSouhlas(zmena: () => void) {
  const handler = () => {
    mezipamet = null;
    zmena();
  };
  window.addEventListener(UDALOST_ZMENY, handler);
  return () => window.removeEventListener(UDALOST_ZMENY, handler);
}

export function stavSouhlasu(): StavSouhlasu {
  if (!mezipamet) mezipamet = { stav: nactiSouhlas() ?? "nevolil" };
  return mezipamet.stav;
}

export function stavSouhlasuNaServeru(): StavSouhlasu {
  return "cekam";
}
