import type { Metadata } from "next";
import { Suspense } from "react";
import { sdileni } from "@/lib/og";
import { OnboardingClient } from "./onboarding-client";
import { adresaKarty, ObsahKarty, ROLES, TRIDY_KARTY } from "./role-karty";
import { Page } from "@/components/layout/container";
import { PageTitle } from "@/components/ui/primitives";
import { SEZONA, den } from "@/lib/sezona";

export const metadata: Metadata = {
  title: "Přihláška do ligy",
  description: "Přihlas do Floorball Stars Ligy tým, sebe jako hráče, nebo se přihlas jako rozhodčí.",
  ...sdileni({
    title: "Přihláška do Floorball Stars Ligy",
    description:
      "Přihlas tým, sebe jako hráče, nebo se ozvi jako rozhodčí. Registrace do sezóny 2026/27 je otevřená.",
    path: "/registrace",
  }),
};

/**
 * Schválně **bez `AuthGuard`** a bez `robots: index: false`.
 *
 * Do 15. 9. 2026 byla stránka za `AuthGuard`, takže odhlášeného návštěvníka
 * přesměrovala na `/prihlaseni?next=%2Fregistrace`. Jenže tohle je cílová
 * stránka náboru — odkaz z Instagramu i tlačítko v hlavičce míří sem — a
 * první obrazovka po kliknutí na reklamu tedy byla „založ si účet", dřív než
 * se člověk dozvěděl cenu, formát a kdy se hraje. Měření to potvrdilo:
 * 15. 9. skončily 3 ze 6 návštěvníků na `/prihlaseni`.
 *
 * Účet je pořád potřeba — jen se o něj říká **až při odeslání přihlášky**,
 * kdy už má člověk důvod si ho založit. Rozdělaná přihláška přežije
 * v `localStorage` (viz `onboarding-client.tsx`), takže se po přihlášení
 * vrátí vyplněná.
 *
 * `<Suspense>` tu musí být: `OnboardingClient` volá `useSearchParams()` a bez
 * hranice spadne build na „useSearchParams() should be wrapped in a suspense
 * boundary". Dokud byla stránka za `AuthGuard`, prerender se ke klientovi
 * nedostal a problém se neprojevil.
 */
/**
 * Výběr role vykreslený serverem — první, co člověk uvidí.
 *
 * `OnboardingClient` volá `useSearchParams()`, takže se celá stránka staticky
 * „vzdává" ve prospěch prohlížeče (`BAILOUT_TO_CLIENT_SIDE_RENDERING`)
 * a do HTML jde jen obsah téhle náhrady. S `fallback={null}` tam nebylo nic:
 * návštěvník dostal hlavičku, patičku a **mezi nimi prázdno**, dokud se
 * nestáhl a nerozběhl JavaScript. Naměřeno 16. 9. na mobilním profilu:
 * prázdno **1,4 s** na rychlé 4G a **2,6 s** na pomalé — a přesně na tomhle
 * kroku odcházelo 21 z 22 lidí.
 *
 * Karty jsou **odkazy se skutečným `href`**, takže klik v tom okně funguje
 * i bez JavaScriptu: prohlížeč přejde na adresu a klientská komponenta si
 * z ní přečte krok, roli i `bezTymu`.
 *
 * **Cena, kterou to má:** přihlášený člověk, který roli už má, tenhle výběr
 * na okamžik uvidí, než ho klient nahradí obrazovkou „roli už máš". Dřív to
 * bylo obráceně — kvůli tomu probliku čekali všichni na prázdné stránce.
 * Reklama vede odhlášené lidi, takže se ta cena platí menšině.
 *
 * Náhrada je statická, takže **nezná dotaz v adrese**: odkazy z ní UTM
 * nepřenesou. Týká se to jen kliků dřív, než se stránka oživí — první
 * zobrazení stránky se do měření započítá i tak.
 */
function VyberRoleServerem() {
  return (
    <Page size="narrow">
      <PageTitle
        title="Přihláška do ligy"
        subtitle="Řekni, kdo jsi, a vyplň přihlášku. Účet si založíš až na konci."
      />
      <p className="mb-2 text-[13px] leading-6 text-mu">
        Přihlášky do <strong className="font-semibold text-wh">{den(SEZONA.konecPrihlasek)} 23:59</strong>
        {" · "}los {den(SEZONA.los)}
        {" · "}start {den(SEZONA.start)}
        {" · "}hraje se {SEZONA.hraciDny} {SEZONA.hraciCas}, {SEZONA.mesto}
      </p>
      <p className="mb-5 text-[13px] leading-6 text-mu">
        <strong className="font-semibold text-wh">V přihlášce se neplatí.</strong>{" "}
        Platba přijde na řadu až potom, ve tvém účtu.
      </p>
      <div className="space-y-3">
        {ROLES.map((r) => (
          <a
            key={r.klic}
            href={adresaKarty(r)}
            className={TRIDY_KARTY}
            style={{ borderLeft: `4px solid ${r.color}` }}
          >
            <ObsahKarty r={r} />
          </a>
        ))}
      </div>
    </Page>
  );
}

export default function RegistracePage() {
  return (
    <Suspense fallback={<VyberRoleServerem />}>
      <OnboardingClient />
    </Suspense>
  );
}
