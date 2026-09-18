"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import {
  nactiSouhlas,
  odebirejSouhlas,
  stavSouhlasu,
  stavSouhlasuNaServeru,
} from "@/lib/souhlas-mereni";

// ID datové sady „FSL web – fslleague.cz" ve Správci událostí Mety.
// Není to tajemství — pixel ho stejně vypisuje do zdroje stránky, takže nemá
// smysl ho schovávat do proměnné prostředí (ta by se navíc podle
// `fsl-web-nasazeni.md` musela zapéct novým buildem a snadno se na to zapomene).
export const PIXEL_ID = "1238051285176854";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Stránky, jejichž otevření bereme jako „chce vědět víc".
 *
 * Schválně jich je málo. `ViewContent` má smysl jen tam, kde o něco jde —
 * kdyby se posílalo ze všech stránek, bylo by to totéž co `PageView`
 * a publikum „zajímal se, ale nepřihlásil" by z toho nešlo postavit.
 */
const ZAJEM: Record<string, string> = {
  "/cenik": "cenik",
  "/draft": "draft",
  "/tymy": "tymy",
};

/**
 * Pošle událost do Pixelu, pokud je souhlas a pixel se stihl načíst.
 *
 * `eventID` je klíč k deduplikaci: když tutéž událost pošle i backend přes
 * Conversions API se stejným id, Meta si je spáruje a započítá jednou.
 * Bez něj by se registrace počítala dvakrát.
 */
export function metaUdalost(
  nazev: string,
  parametry?: Record<string, unknown>,
  eventID?: string,
) {
  if (typeof window === "undefined") return;
  if (nactiSouhlas() !== "ano") return;
  window.fbq?.(
    "track",
    nazev,
    parametry ?? {},
    eventID ? { eventID } : undefined,
  );
}

/**
 * Meta Pixel pro měření návštěvnosti z reklam na Facebooku a Instagramu.
 *
 * Tři věci, na kterých se to láme:
 *
 * 1. **Bez souhlasu se nenačítá vůbec.** Ne „načte se a mlčí" — skript se
 *    do stránky nedostane, dokud člověk neklikne na liště. Do 18. 9. 2026
 *    se načítal všem a to byla chyba, ne rozhodnutí.
 * 2. Základní kód od Mety odešle `PageView` jen jednou, při načtení stránky.
 *    Next.js ale přechody řeší v prohlížeči bez reloadu, takže by se veškerý
 *    provoz slil do jediné návštěvy titulky. Efekt níž proto posílá `PageView`
 *    při každé změně cesty — kromě té první, kterou už odeslal init.
 * 3. Na localhostu se pixel nespouští, ať se vývojářské klikání nemíchá do
 *    dat z produkce.
 */
export function MetaPixel() {
  const pathname = usePathname();
  // Volba může přijít až dávno po načtení stránky (klik na liště), proto
  // odběr, ne jednorázové přečtení při připojení komponenty.
  const souhlas =
    useSyncExternalStore(
      odebirejSouhlas,
      stavSouhlasu,
      stavSouhlasuNaServeru,
    ) === "ano";
  const prvniPoZapnuti = useRef(true);

  useEffect(() => {
    if (!souhlas) return;
    // První průchod po zapnutí souhlasu se přeskakuje: v tu chvíli se teprve
    // vkládá skript a jeho `init` pošle `PageView` sám.
    if (prvniPoZapnuti.current) {
      prvniPoZapnuti.current = false;
      return;
    }
    window.fbq?.("track", "PageView");
  }, [pathname, souhlas]);

  useEffect(() => {
    if (!souhlas) return;
    const obsah = ZAJEM[pathname];
    if (!obsah) return;
    window.fbq?.("track", "ViewContent", {
      content_name: obsah,
      content_category: "informace",
    });
  }, [pathname, souhlas]);

  if (process.env.NODE_ENV !== "production") return null;
  if (!souhlas) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${PIXEL_ID}');
fbq('track', 'PageView');`}
      </Script>
      {/* Bez `<noscript>` varianty schválně: ta by se do stránky dostala
          i bez souhlasu, protože se vykresluje serverem a nejde ji podmínit
          ničím, co je v prohlížeči. */}
    </>
  );
}
