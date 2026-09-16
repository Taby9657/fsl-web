"use client";

import { Suspense } from "react";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { computeRoute, type BeforeSendEvent } from "@vercel/analytics";
import { Analytics } from "@vercel/analytics/react";

/**
 * Vercel Web Analytics s krokem přihlášky v cestě.
 *
 * Proč to není prosté `<Analytics />`: krok registrace žije v `?krok=`
 * (viz `registrace/onboarding-client.tsx`) a `<Analytics />` posílá zobrazení
 * stránky jen při změně **cesty**, ne dotazu — `route` i `path` mu při přechodu
 * mezi kroky vyjdou pořád `/registrace`, takže se `useEffect` znovu nespustí.
 * Celá přihláška se proto slévala do jediného řádku `/registrace` a z dashboardu
 * nešlo poznat, kde lidé odcházejí. 16. 9. 2026 to bylo **192 návštěvníků
 * `/registrace` a nula odeslaných přihlášek**, aniž by šlo říct, na kterém kroku.
 *
 * Když `<Analytics>` dostane `route` a `path`, přepne se na ruční režim
 * (`disableAutoTrack`) a pošle zobrazení při každé změně těch dvou hodnot.
 * Ověřeno proti produkčnímu skriptu `/_vercel/insights/script.js`:
 * `path` jde do pole `o` (záložka *Pages*), `route` do `dp` (záložka *Routes*).
 *
 * ⚠️ **Zobrazení stránek posílá jenom tenhle komponent.** Kdo `route`/`path`
 * odebere, zapne zpátky automatické měření a přijde o kroky; kdo komponent
 * nahradí holým `<Analytics />`, taky. Obojí je funkční web, jen s méně daty.
 *
 * Bere se varianta `/react`, ne `/next`: ruční `route`/`path` má v typech jen
 * ona (`/next` si je počítá sama a ven je nepustí). Rozdíl je jen v příznaku
 * `sdkn` v odeslané události — skript, koncový bod i měření jsou stejné.
 *
 * Dotaz v adrese se **nechává** (UTM). Záložka *UTM Parameters* je sice na plánu
 * Hobby zamčená, ale data se sbírají — po případném povýšení plánu budou vidět.
 */

/**
 * Dotaz (UTM) se do adresy vrací až tady, ne přes `path`.
 *
 * Kdyby šel rovnou v `path`, skript ho zakóduje **do cesty** (`…vzhled%3Futm_…`)
 * a záložka *Pages* se rozpadne na řádek pro každou kombinaci UTM. Ověřeno na
 * produkci 16. 9. 2026: přišlo `/registrace/manager/vzhled%3Futm_source=…`.
 * `beforeSend` naproti tomu dostane hotovou adresu a smí ji přepsat, takže se
 * dotaz připojí jako dotaz.
 */
function sDotazem(event: BeforeSendEvent): BeforeSendEvent {
  if (typeof window === "undefined") return event;
  const dotaz = window.location.search;
  if (!dotaz || event.url.includes("?")) return event;
  return { ...event, url: event.url + dotaz };
}
function Mereni() {
  const cesta = usePathname();
  const dotaz = useSearchParams();
  const params = useParams();

  // Shodně s `useRoute()` uvnitř balíčku: dynamické segmenty se v `route`
  // nahradí zástupcem (`/tymy/[id]`), aby záložka Routes nebyla jeden řádek
  // na každý tým. Když stránka žádné nemá, balíček zkouší dotaz — chování
  // se tu schválně neliší od automatického režimu.
  const proRoute = Object.keys(params ?? {}).length
    ? (params as Record<string, string | string[]>)
    : Object.fromEntries(dotaz.entries());
  const route = computeRoute(cesta, proRoute);

  let path = cesta;
  if (cesta === "/registrace") {
    const role = dotaz.get("role");
    const krok = dotaz.get("krok") || "role";
    // /registrace/role → /registrace/manager/tym → … → /registrace/manager/hotovo
    path = role ? `/registrace/${role}/${krok}` : `/registrace/${krok}`;
  }

  return <Analytics route={route} path={path} beforeSend={sDotazem} />;
}

/** `useSearchParams()` potřebuje hranici Suspense, jinak spadne build. */
export function Analytika() {
  return (
    <Suspense fallback={null}>
      <Mereni />
    </Suspense>
  );
}
