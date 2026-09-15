import type { Metadata } from "next";
import { Suspense } from "react";
import { sdileni } from "@/lib/og";
import { OnboardingClient } from "./onboarding-client";

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
export default function RegistracePage() {
  return (
    <Suspense fallback={null}>
      <OnboardingClient />
    </Suspense>
  );
}
