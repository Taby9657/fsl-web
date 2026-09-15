"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

// ID datové sady „FSL web – fslleague.cz" ve Správci událostí Mety.
// Není to tajemství — pixel ho stejně vypisuje do zdroje stránky, takže nemá
// smysl ho schovávat do proměnné prostředí (ta by se navíc podle
// `fsl-web-nasazeni.md` musela zapéct novým buildem a snadno se na to zapomene).
const PIXEL_ID = "1238051285176854";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Meta Pixel pro měření návštěvnosti z reklam na Facebooku a Instagramu.
 *
 * Dvě věci, na kterých se to obvykle láme:
 *
 * 1. Základní kód od Mety odešle `PageView` jen jednou, při načtení stránky.
 *    Next.js ale přechody mezi stránkami řeší v prohlížeči bez reloadu, takže
 *    by se veškerý provoz slil do jediné návštěvy titulky. Efekt níž proto
 *    posílá `PageView` při každé změně cesty — kromě té první, kterou už
 *    odeslal samotný init.
 * 2. Na localhostu se pixel nespouští, ať se vývojářské klikání nemíchá do dat
 *    z produkce.
 */
export function MetaPixel() {
  const pathname = usePathname();
  const prvniNacteni = useRef(true);

  useEffect(() => {
    if (prvniNacteni.current) {
      prvniNacteni.current = false;
      return;
    }
    window.fbq?.("track", "PageView");
  }, [pathname]);

  if (process.env.NODE_ENV !== "production") return null;

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
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
